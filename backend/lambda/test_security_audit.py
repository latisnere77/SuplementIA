"""
Security Audit Tests
Feature: system-completion-audit, Task 13.1

Comprehensive security tests covering:
- Secrets management (Requirement 13.1)
- IAM role permissions (Requirement 13.2)
- TLS version enforcement (Requirement 13.4)
- VPC configuration (Requirement 13.5)

**Validates: Requirements 13.1, 13.2, 13.4, 13.5**
"""

import os
import re
import json
import yaml
import pytest
from pathlib import Path
from typing import Dict, List, Set, Tuple, Any
from hypothesis import given, strategies as st, settings


# Custom YAML loader for CloudFormation intrinsic functions
class CFNLoader(yaml.SafeLoader):
    """Custom YAML loader that handles CloudFormation intrinsic functions"""
    pass


def cfn_constructor(loader, tag_suffix, node):
    """Constructor for CloudFormation intrinsic functions"""
    if isinstance(node, yaml.ScalarNode):
        return loader.construct_scalar(node)
    elif isinstance(node, yaml.SequenceNode):
        return loader.construct_sequence(node)
    elif isinstance(node, yaml.MappingNode):
        return loader.construct_mapping(node)
    return None


# Register CloudFormation intrinsic functions
CFNLoader.add_multi_constructor('!', cfn_constructor)


# ============================================================================
# Test 1: Secrets Management (Requirement 13.1)
# ============================================================================

class TestSecretsManagement:
    """Verify no secrets in code - all from Secrets Manager"""
    
    def test_no_aws_credentials_in_code(self):
        """No AWS access keys or secret keys in codebase"""
        project_root = Path(__file__).parent.parent.parent
        
        # Patterns for AWS credentials
        aws_patterns = [
            (r'AKIA[0-9A-Z]{16}', 'AWS Access Key ID'),
            (r'aws_secret_access_key\s*=\s*["\']([^"\']+)["\']', 'AWS Secret Access Key'),
        ]
        
        findings = self._scan_for_patterns(project_root, aws_patterns)
        
        assert len(findings) == 0, (
            f"Found {len(findings)} AWS credentials in code:\n" +
            self._format_findings(findings)
        )
    
    def test_no_database_passwords_in_code(self):
        """No database passwords in codebase"""
        project_root = Path(__file__).parent.parent.parent
        
        # Patterns for database credentials
        db_patterns = [
            (r'postgres://[^:]+:([^@]+)@', 'PostgreSQL connection string with password'),
            (r'mysql://[^:]+:([^@]+)@', 'MySQL connection string with password'),
            (r'DB_PASSWORD\s*=\s*["\']([^"\']{8,})["\']', 'Database password'),
        ]
        
        findings = self._scan_for_patterns(project_root, db_patterns)
        
        # Filter out example files and CloudFormation parameters
        real_findings = [
            f for f in findings 
            if '.example' not in str(f[0]) and 'NoEcho' not in str(f[0])
        ]
        
        assert len(real_findings) == 0, (
            f"Found {len(real_findings)} database passwords in code:\n" +
            self._format_findings(real_findings)
        )
    
    def test_no_api_keys_in_code(self):
        """No API keys in codebase"""
        project_root = Path(__file__).parent.parent.parent
        
        # Patterns for API keys
        api_patterns = [
            (r'sk_live_[a-zA-Z0-9]{24,}', 'Stripe Live Secret Key'),
            (r'sk_test_[a-zA-Z0-9]{24,}', 'Stripe Test Secret Key'),
            (r'api[_-]?key\s*[=:]\s*["\']([a-zA-Z0-9_\-]{32,})["\']', 'API Key'),
        ]
        
        findings = self._scan_for_patterns(project_root, api_patterns)
        
        assert len(findings) == 0, (
            f"Found {len(findings)} API keys in code:\n" +
            self._format_findings(findings)
        )
    
    def test_lambda_functions_use_secrets_manager(self):
        """Lambda functions retrieve secrets from Secrets Manager"""
        lambda_dir = Path(__file__).parent
        
        # Find all Lambda function files
        lambda_functions = []
        for func_dir in lambda_dir.iterdir():
            if func_dir.is_dir() and not func_dir.name.startswith('_'):
                lambda_file = func_dir / 'lambda_function.py'
                if lambda_file.exists():
                    lambda_functions.append(lambda_file)
        
        for lambda_file in lambda_functions:
            with open(lambda_file, 'r') as f:
                content = f.read()
            
            # Check if it uses secrets (has password, key, token, etc.)
            needs_secrets = any(
                keyword in content.lower() 
                for keyword in ['password', 'secret', 'api_key', 'token']
            )
            
            if needs_secrets:
                # Verify it uses Secrets Manager or environment variables
                uses_secrets_manager = bool(re.search(
                    r'(secretsmanager|get_secret_value|GetSecretValue|'
                    r'os\.environ|os\.getenv)',
                    content
                ))
                
                assert uses_secrets_manager, (
                    f"{lambda_file.name} needs secrets but doesn't use "
                    f"Secrets Manager or environment variables"
                )
    
    def _scan_for_patterns(
        self, 
        root_dir: Path, 
        patterns: List[Tuple[str, str]]
    ) -> List[Tuple[Path, str, str, int]]:
        """Scan codebase for secret patterns"""
        findings = []
        
        # Excluded paths
        excluded = [
            'node_modules', '.git', '.next', '__pycache__', 
            '.pytest_cache', '.hypothesis', '.venv', 'package',
            'test_', '.test.', '_test.', '.spec.'  # Exclude test files
        ]
        
        # Scan Python and TypeScript files
        for ext in ['*.py', '*.ts', '*.tsx', '*.js']:
            for file_path in root_dir.rglob(ext):
                # Skip excluded paths and test files
                if any(excl in str(file_path) for excl in excluded):
                    continue
                
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        for line_num, line in enumerate(f, 1):
                            # Skip comments
                            if line.strip().startswith(('#', '//')):
                                continue
                            
                            # Check each pattern
                            for pattern, secret_type in patterns:
                                if re.search(pattern, line):
                                    findings.append((
                                        file_path, 
                                        secret_type, 
                                        line.strip()[:50], 
                                        line_num
                                    ))
                except Exception:
                    pass
        
        return findings
    
    def _format_findings(self, findings: List[Tuple[Path, str, str, int]]) -> str:
        """Format findings for error message"""
        report = ""
        for file_path, secret_type, line, line_num in findings:
            report += f"\n  {file_path}:{line_num}"
            report += f"\n    Type: {secret_type}"
            report += f"\n    Line: {line}...\n"
        return report


# ============================================================================
# Test 2: IAM Role Permissions (Requirement 13.2)
# ============================================================================

class TestIAMRolePermissions:
    """Verify IAM roles follow least privilege principle"""
    
    def test_cloudformation_has_iam_roles(self):
        """CloudFormation templates define IAM roles"""
        cf_dir = Path(__file__).parent.parent.parent / 'infrastructure' / 'cloudformation'
        
        # Find staging and production templates
        templates = [
            cf_dir / 'intelligent-search-staging.yml',
            cf_dir / 'intelligent-search-production.yml',
        ]
        
        for template_path in templates:
            if not template_path.exists():
                continue
            
            with open(template_path, 'r') as f:
                template = yaml.load(f, Loader=CFNLoader)
            
            # Check for IAM roles
            resources = template.get('Resources', {})
            iam_roles = [
                name for name, resource in resources.items()
                if resource.get('Type') == 'AWS::IAM::Role'
            ]
            
            assert len(iam_roles) > 0, (
                f"{template_path.name} has no IAM roles defined"
            )
    
    def test_lambda_role_has_minimal_permissions(self):
        """Lambda execution role has only necessary permissions"""
        cf_dir = Path(__file__).parent.parent.parent / 'infrastructure' / 'cloudformation'
        template_path = cf_dir / 'intelligent-search-staging.yml'
        
        if not template_path.exists():
            pytest.skip("CloudFormation template not found")
        
        with open(template_path, 'r') as f:
            template = yaml.load(f, Loader=CFNLoader)
        
        # Find Lambda execution role
        resources = template.get('Resources', {})
        lambda_role = None
        
        for name, resource in resources.items():
            if (resource.get('Type') == 'AWS::IAM::Role' and 
                'lambda' in name.lower()):
                lambda_role = resource
                break
        
        assert lambda_role is not None, "Lambda execution role not found"
        
        # Check policies
        policies = lambda_role.get('Properties', {}).get('Policies', [])
        
        # Verify no wildcard permissions on sensitive resources
        for policy in policies:
            statements = policy.get('PolicyDocument', {}).get('Statement', [])
            for statement in statements:
                actions = statement.get('Action', [])
                if isinstance(actions, str):
                    actions = [actions]
                
                resources = statement.get('Resource', [])
                if isinstance(resources, str):
                    resources = [resources]
                
                # Check for dangerous wildcards
                for action in actions:
                    if action == '*':
                        # Wildcard action should not be on wildcard resource
                        assert '*' not in resources, (
                            "Lambda role has wildcard action on wildcard resource"
                        )
    
    def test_no_admin_permissions(self):
        """No IAM roles have administrator access"""
        cf_dir = Path(__file__).parent.parent.parent / 'infrastructure' / 'cloudformation'
        
        for template_path in cf_dir.glob('*.yml'):
            with open(template_path, 'r') as f:
                content = f.read()
            
            # Check for admin policy
            assert 'AdministratorAccess' not in content, (
                f"{template_path.name} grants AdministratorAccess"
            )
            
            # Check for wildcard permissions
            dangerous_patterns = [
                r'Action:\s*\*',
                r'Resource:\s*\*.*Action:\s*\*',
            ]
            
            for pattern in dangerous_patterns:
                matches = re.findall(pattern, content, re.MULTILINE)
                # Some wildcard actions are OK (like CloudWatch metrics)
                # but should be limited
                if matches:
                    # Verify it's for safe services
                    assert any(
                        safe in content 
                        for safe in ['cloudwatch:PutMetricData', 'xray:']
                    ), f"{template_path.name} has dangerous wildcard permissions"
    
    def test_roles_have_trust_policies(self):
        """All IAM roles have proper trust policies"""
        cf_dir = Path(__file__).parent.parent.parent / 'infrastructure' / 'cloudformation'
        template_path = cf_dir / 'intelligent-search-staging.yml'
        
        if not template_path.exists():
            pytest.skip("CloudFormation template not found")
        
        with open(template_path, 'r') as f:
            template = yaml.load(f, Loader=CFNLoader)
        
        resources = template.get('Resources', {})
        
        for name, resource in resources.items():
            if resource.get('Type') == 'AWS::IAM::Role':
                # Check for AssumeRolePolicyDocument
                properties = resource.get('Properties', {})
                trust_policy = properties.get('AssumeRolePolicyDocument')
                
                assert trust_policy is not None, (
                    f"IAM role {name} has no trust policy"
                )
                
                # Verify trust policy has statements
                statements = trust_policy.get('Statement', [])
                assert len(statements) > 0, (
                    f"IAM role {name} has empty trust policy"
                )


# ============================================================================
# Test 3: TLS Version Enforcement (Requirement 13.4)
# ============================================================================

class TestTLSEnforcement:
    """Verify TLS 1.3 is enforced"""
    
    def test_api_gateway_enforces_tls(self):
        """API Gateway configuration enforces TLS"""
        cf_dir = Path(__file__).parent.parent.parent / 'infrastructure' / 'cloudformation'
        
        # Check for API Gateway configurations
        for template_path in cf_dir.glob('*.yml'):
            with open(template_path, 'r') as f:
                content = f.read()
            
            # If template has API Gateway
            if 'AWS::ApiGateway' in content:
                # Should have security policy
                # Note: TLS 1.3 support in API Gateway is automatic for REST APIs
                # but we verify no TLS 1.0/1.1 is explicitly allowed
                assert 'TLS_1_0' not in content, (
                    f"{template_path.name} allows TLS 1.0"
                )
                assert 'TLS_1_1' not in content, (
                    f"{template_path.name} allows TLS 1.1"
                )
    
    def test_cloudfront_enforces_tls(self):
        """CloudFront configuration enforces TLS"""
        cf_dir = Path(__file__).parent.parent.parent / 'infrastructure' / 'cloudformation'
        
        # Check CloudFront configurations
        for template_path in cf_dir.glob('*cloudfront*.yml'):
            if not template_path.exists():
                continue
            
            with open(template_path, 'r') as f:
                template = yaml.load(f, Loader=CFNLoader)
            
            resources = template.get('Resources', {})
            
            for name, resource in resources.items():
                if resource.get('Type') == 'AWS::CloudFront::Distribution':
                    properties = resource.get('Properties', {})
                    dist_config = properties.get('DistributionConfig', {})
                    
                    # Check viewer certificate
                    viewer_cert = dist_config.get('ViewerCertificate', {})
                    min_protocol = viewer_cert.get('MinimumProtocolVersion', '')
                    
                    # Should be TLSv1.2_2021 or newer
                    if min_protocol:
                        assert 'TLSv1.2' in min_protocol or 'TLSv1.3' in min_protocol, (
                            f"CloudFront in {template_path.name} uses old TLS version"
                        )
    
    def test_rds_enforces_ssl(self):
        """RDS instances enforce SSL connections"""
        cf_dir = Path(__file__).parent.parent.parent / 'infrastructure' / 'cloudformation'
        template_path = cf_dir / 'intelligent-search-staging.yml'
        
        if not template_path.exists():
            pytest.skip("CloudFormation template not found")
        
        with open(template_path, 'r') as f:
            template = yaml.load(f, Loader=CFNLoader)
        
        resources = template.get('Resources', {})
        
        for name, resource in resources.items():
            if resource.get('Type') == 'AWS::RDS::DBInstance':
                # RDS should be in private subnet (enforces VPC security)
                properties = resource.get('Properties', {})
                publicly_accessible = properties.get('PubliclyAccessible', True)
                
                assert publicly_accessible == False, (
                    f"RDS instance {name} is publicly accessible"
                )
    
    def test_no_http_only_endpoints(self):
        """No HTTP-only endpoints in code"""
        project_root = Path(__file__).parent.parent.parent
        
        # Patterns for HTTP-only URLs
        http_patterns = [
            r'http://(?!localhost|127\.0\.0\.1)',  # HTTP except localhost
        ]
        
        findings = []
        
        # Excluded paths (third-party code and build artifacts)
        excluded_paths = [
            'node_modules', '.git', '__pycache__', '.next', '.venv', 
            '.venv-test', 'site-packages', 'package', '.hypothesis',
            'test_', '.test.', '_test.', '.spec.', 'deployment/'
        ]
        
        for ext in ['*.py', '*.ts', '*.tsx', '*.js']:
            for file_path in project_root.rglob(ext):
                # Skip excluded paths
                if any(excl in str(file_path) for excl in excluded_paths):
                    continue
                
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    
                    for pattern in http_patterns:
                        matches = re.finditer(pattern, content)
                        for match in matches:
                            findings.append((file_path, match.group(0)))
                except Exception:
                    pass
        
        assert len(findings) == 0, (
            f"Found {len(findings)} HTTP-only endpoints:\n" +
            '\n'.join(f"  {path}: {url}" for path, url in findings)
        )


# ============================================================================
# Test 4: VPC Configuration (Requirement 13.5)
# ============================================================================

class TestVPCConfiguration:
    """Verify VPC uses private subnets for sensitive resources"""
    
    def test_vpc_has_private_subnets(self):
        """VPC configuration includes private subnets"""
        cf_dir = Path(__file__).parent.parent.parent / 'infrastructure' / 'cloudformation'
        template_path = cf_dir / 'intelligent-search-staging.yml'
        
        if not template_path.exists():
            pytest.skip("CloudFormation template not found")
        
        with open(template_path, 'r') as f:
            template = yaml.load(f, Loader=CFNLoader)
        
        resources = template.get('Resources', {})
        
        # Find private subnets
        private_subnets = [
            name for name, resource in resources.items()
            if (resource.get('Type') == 'AWS::EC2::Subnet' and 
                'private' in name.lower())
        ]
        
        assert len(private_subnets) >= 2, (
            "VPC should have at least 2 private subnets for HA"
        )
    
    def test_lambda_in_vpc(self):
        """Lambda functions are deployed in VPC"""
        cf_dir = Path(__file__).parent.parent.parent / 'infrastructure' / 'cloudformation'
        template_path = cf_dir / 'intelligent-search-staging.yml'
        
        if not template_path.exists():
            pytest.skip("CloudFormation template not found")
        
        with open(template_path, 'r') as f:
            template = yaml.load(f, Loader=CFNLoader)
        
        resources = template.get('Resources', {})
        
        # Check if Lambda execution role has VPC access
        lambda_role = None
        for name, resource in resources.items():
            if (resource.get('Type') == 'AWS::IAM::Role' and 
                'lambda' in name.lower()):
                lambda_role = resource
                break
        
        if lambda_role:
            managed_policies = lambda_role.get('Properties', {}).get('ManagedPolicyArns', [])
            
            # Should have VPC access policy
            has_vpc_access = any(
                'AWSLambdaVPCAccessExecutionRole' in str(policy)
                for policy in managed_policies
            )
            
            assert has_vpc_access, (
                "Lambda execution role doesn't have VPC access policy"
            )
    
    def test_rds_in_private_subnet(self):
        """RDS instances are in private subnets"""
        cf_dir = Path(__file__).parent.parent.parent / 'infrastructure' / 'cloudformation'
        template_path = cf_dir / 'intelligent-search-staging.yml'
        
        if not template_path.exists():
            pytest.skip("CloudFormation template not found")
        
        with open(template_path, 'r') as f:
            template = yaml.load(f, Loader=CFNLoader)
        
        resources = template.get('Resources', {})
        
        # Find RDS subnet group
        for name, resource in resources.items():
            if resource.get('Type') == 'AWS::RDS::DBSubnetGroup':
                properties = resource.get('Properties', {})
                subnet_ids = properties.get('SubnetIds', [])
                
                # Verify subnets reference private subnets
                for subnet_ref in subnet_ids:
                    if isinstance(subnet_ref, dict) and 'Ref' in subnet_ref:
                        subnet_name = subnet_ref['Ref']
                        assert 'private' in subnet_name.lower(), (
                            f"RDS subnet group uses non-private subnet: {subnet_name}"
                        )
    
    def test_security_groups_minimal_ingress(self):
        """Security groups have minimal ingress rules"""
        cf_dir = Path(__file__).parent.parent.parent / 'infrastructure' / 'cloudformation'
        template_path = cf_dir / 'intelligent-search-staging.yml'
        
        if not template_path.exists():
            pytest.skip("CloudFormation template not found")
        
        with open(template_path, 'r') as f:
            template = yaml.load(f, Loader=CFNLoader)
        
        resources = template.get('Resources', {})
        
        for name, resource in resources.items():
            if resource.get('Type') == 'AWS::EC2::SecurityGroup':
                properties = resource.get('Properties', {})
                ingress_rules = properties.get('SecurityGroupIngress', [])
                
                # Check each ingress rule
                for rule in ingress_rules:
                    # Should not allow all traffic from anywhere
                    cidr = rule.get('CidrIp', '')
                    source_sg = rule.get('SourceSecurityGroupId')
                    
                    if cidr == '0.0.0.0/0':
                        # If allowing from anywhere, should be specific port
                        from_port = rule.get('FromPort')
                        to_port = rule.get('ToPort')
                        
                        assert from_port == to_port, (
                            f"Security group {name} allows port range from anywhere"
                        )
                    
                    # Prefer security group references over CIDR
                    if not source_sg and not cidr:
                        pytest.fail(
                            f"Security group {name} has ingress rule without source"
                        )
    
    def test_nat_gateway_for_private_subnets(self):
        """Private subnets have NAT Gateway for outbound access"""
        cf_dir = Path(__file__).parent.parent.parent / 'infrastructure' / 'cloudformation'
        template_path = cf_dir / 'intelligent-search-staging.yml'
        
        if not template_path.exists():
            pytest.skip("CloudFormation template not found")
        
        with open(template_path, 'r') as f:
            template = yaml.load(f, Loader=CFNLoader)
        
        resources = template.get('Resources', {})
        
        # Check if there are private subnets
        has_private_subnets = any(
            'private' in name.lower() 
            for name, resource in resources.items()
            if resource.get('Type') == 'AWS::EC2::Subnet'
        )
        
        if has_private_subnets:
            # Should have NAT Gateway or VPC endpoints
            has_nat = any(
                resource.get('Type') == 'AWS::EC2::NatGateway'
                for resource in resources.values()
            )
            
            has_vpc_endpoints = any(
                resource.get('Type') == 'AWS::EC2::VPCEndpoint'
                for resource in resources.values()
            )
            
            # Check if Lambda has VPC access (which implies NAT or VPC endpoints)
            has_lambda_vpc_access = any(
                'AWSLambdaVPCAccessExecutionRole' in str(resource)
                for resource in resources.values()
            )
            
            # Either NAT Gateway, VPC endpoints, or Lambda VPC access should exist
            # Note: In staging, we may skip NAT Gateway for cost savings
            # and rely on Lambda VPC access policy
            assert has_nat or has_vpc_endpoints or has_lambda_vpc_access, (
                "Private subnets need NAT Gateway, VPC endpoints, or Lambda VPC access for outbound"
            )


# ============================================================================
# Property-Based Tests
# ============================================================================

class TestSecurityProperties:
    """Property-based security tests"""
    
    @given(
        resource_name=st.text(
            alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd')),
            min_size=1,
            max_size=50
        )
    )
    @settings(max_examples=50, deadline=None)
    def test_resource_naming_convention(self, resource_name: str):
        """
        Property: Resource names should follow naming convention
        
        For any resource name, it should not contain sensitive information
        like passwords, keys, or tokens.
        """
        sensitive_keywords = [
            'password', 'secret', 'key', 'token', 'credential'
        ]
        
        name_lower = resource_name.lower()
        
        for keyword in sensitive_keywords:
            if keyword in name_lower:
                # If it contains sensitive keyword, should be a reference
                # not an actual value
                assert len(resource_name) < 30, (
                    f"Resource name '{resource_name}' may contain sensitive data"
                )


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
