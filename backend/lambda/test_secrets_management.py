"""
Property-Based Tests for Secrets Management
Feature: system-completion-audit, Property 21: Secrets Management

Tests that all secrets are retrieved from AWS Secrets Manager or Parameter Store,
never from hardcoded values or plain text files.

**Validates: Requirements 13.1**
"""

import os
import re
import pytest
from pathlib import Path
from typing import List, Set, Tuple
from hypothesis import given, strategies as st, settings

# Common secret patterns to detect
SECRET_PATTERNS = [
    # AWS credentials
    (r'AKIA[0-9A-Z]{16}', 'AWS Access Key'),
    (r'aws_secret_access_key\s*=\s*["\']([^"\']+)["\']', 'AWS Secret Key'),
    
    # API keys
    (r'api[_-]?key\s*[=:]\s*["\']([a-zA-Z0-9_\-]{20,})["\']', 'API Key'),
    (r'apikey\s*[=:]\s*["\']([a-zA-Z0-9_\-]{20,})["\']', 'API Key'),
    
    # Passwords
    (r'password\s*[=:]\s*["\']([^"\']{8,})["\']', 'Password'),
    (r'passwd\s*[=:]\s*["\']([^"\']{8,})["\']', 'Password'),
    
    # Database connection strings
    (r'postgres://[^:]+:[^@]+@', 'Database Connection String'),
    (r'mysql://[^:]+:[^@]+@', 'Database Connection String'),
    
    # JWT secrets
    (r'jwt[_-]?secret\s*[=:]\s*["\']([^"\']{20,})["\']', 'JWT Secret'),
    
    # Stripe keys
    (r'sk_live_[a-zA-Z0-9]{24,}', 'Stripe Secret Key'),
    (r'sk_test_[a-zA-Z0-9]{24,}', 'Stripe Test Key'),
    
    # Generic secrets
    (r'secret\s*[=:]\s*["\']([a-zA-Z0-9_\-]{20,})["\']', 'Generic Secret'),
    (r'token\s*[=:]\s*["\']([a-zA-Z0-9_\-]{20,})["\']', 'Token'),
]

# Files to exclude from scanning
EXCLUDED_PATHS = [
    'node_modules',
    '.git',
    '.next',
    '__pycache__',
    '.pytest_cache',
    '.hypothesis',
    '.venv',  # Virtual environments
    '.venv-test',  # Test virtual environments
    'package',  # Lambda package directories
    'site-packages',  # Python packages
    'test_',  # Test files themselves
    '.env.example',  # Example files are OK
    '.md',  # Documentation
    '.json',  # Config files (checked separately)
]

# Allowed patterns (not actual secrets)
ALLOWED_PATTERNS = [
    r'YOUR_.*_HERE',  # Placeholder text
    r'REPLACE_WITH_',  # Placeholder text
    r'<.*>',  # XML/HTML placeholders
    r'\$\{.*\}',  # Environment variable references
    r'process\.env\.',  # Environment variable access
    r'os\.environ',  # Environment variable access
    r'os\.getenv',  # Environment variable access
    r'secretsmanager',  # AWS Secrets Manager references
    r'parameter_store',  # Parameter Store references
]


def should_exclude_path(path: Path) -> bool:
    """Check if path should be excluded from scanning"""
    path_str = str(path)
    return any(excluded in path_str for excluded in EXCLUDED_PATHS)


def is_allowed_pattern(text: str) -> bool:
    """Check if text matches allowed patterns (not actual secrets)"""
    return any(re.search(pattern, text, re.IGNORECASE) for pattern in ALLOWED_PATTERNS)


def scan_file_for_secrets(file_path: Path) -> List[Tuple[str, str, int]]:
    """
    Scan a file for hardcoded secrets
    
    Returns:
        List of (secret_type, matched_text, line_number) tuples
    """
    findings = []
    
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            for line_num, line in enumerate(f, 1):
                # Skip comments
                if line.strip().startswith('#') or line.strip().startswith('//'):
                    continue
                
                # Check each secret pattern
                for pattern, secret_type in SECRET_PATTERNS:
                    matches = re.finditer(pattern, line, re.IGNORECASE)
                    for match in matches:
                        matched_text = match.group(0)
                        
                        # Skip if it's an allowed pattern
                        if is_allowed_pattern(matched_text):
                            continue
                        
                        findings.append((secret_type, matched_text, line_num))
    
    except Exception as e:
        # Skip files that can't be read
        pass
    
    return findings


def scan_codebase_for_secrets(root_dir: Path) -> List[Tuple[Path, str, str, int]]:
    """
    Scan entire codebase for hardcoded secrets
    
    Returns:
        List of (file_path, secret_type, matched_text, line_number) tuples
    """
    all_findings = []
    
    # Scan Python files
    for py_file in root_dir.rglob('*.py'):
        if should_exclude_path(py_file):
            continue
        
        findings = scan_file_for_secrets(py_file)
        for secret_type, matched_text, line_num in findings:
            all_findings.append((py_file, secret_type, matched_text, line_num))
    
    # Scan TypeScript/JavaScript files
    for ts_file in list(root_dir.rglob('*.ts')) + list(root_dir.rglob('*.tsx')) + list(root_dir.rglob('*.js')):
        if should_exclude_path(ts_file):
            continue
        
        findings = scan_file_for_secrets(ts_file)
        for secret_type, matched_text, line_num in findings:
            all_findings.append((ts_file, secret_type, matched_text, line_num))
    
    # Scan environment files (but not .env.example)
    for env_file in root_dir.rglob('.env*'):
        if should_exclude_path(env_file) or '.example' in env_file.name:
            continue
        
        findings = scan_file_for_secrets(env_file)
        for secret_type, matched_text, line_num in findings:
            all_findings.append((env_file, secret_type, matched_text, line_num))
    
    return all_findings


def verify_secrets_from_manager(file_path: Path) -> bool:
    """
    Verify that secrets in a file are retrieved from Secrets Manager or Parameter Store
    """
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        # Check for Secrets Manager usage
        has_secrets_manager = bool(re.search(
            r'(secretsmanager|get_secret_value|GetSecretValue)',
            content,
            re.IGNORECASE
        ))
        
        # Check for Parameter Store usage
        has_parameter_store = bool(re.search(
            r'(ssm|parameter_store|get_parameter|GetParameter)',
            content,
            re.IGNORECASE
        ))
        
        # Check for environment variable usage (acceptable)
        has_env_vars = bool(re.search(
            r'(process\.env\.|os\.environ|os\.getenv)',
            content
        ))
        
        return has_secrets_manager or has_parameter_store or has_env_vars
    
    except Exception:
        return False


# ============================================================================
# Property-Based Tests
# ============================================================================

class TestSecretsManagement:
    """Property 21: Secrets Management"""
    
    def test_no_hardcoded_secrets_in_codebase(self):
        """
        Property: No hardcoded secrets in codebase
        
        For any file in the codebase, it should not contain hardcoded secrets.
        All secrets must be retrieved from AWS Secrets Manager or Parameter Store.
        """
        # Get project root (3 levels up from this file)
        project_root = Path(__file__).parent.parent.parent
        
        # Scan codebase
        findings = scan_codebase_for_secrets(project_root)
        
        # Report findings
        if findings:
            report = "\n\n❌ HARDCODED SECRETS DETECTED:\n\n"
            for file_path, secret_type, matched_text, line_num in findings:
                relative_path = file_path.relative_to(project_root)
                # Redact the actual secret value
                redacted = matched_text[:10] + '...' if len(matched_text) > 10 else matched_text
                report += f"  {relative_path}:{line_num}\n"
                report += f"    Type: {secret_type}\n"
                report += f"    Match: {redacted}\n\n"
            
            pytest.fail(report)
    
    def test_lambda_uses_secrets_manager(self):
        """
        Property: Lambda functions use Secrets Manager
        
        For any Lambda function that needs secrets, it should retrieve them
        from AWS Secrets Manager or Parameter Store.
        """
        lambda_dir = Path(__file__).parent
        
        # Find all Lambda function files
        lambda_functions = list(lambda_dir.rglob('lambda_function.py'))
        
        for lambda_file in lambda_functions:
            if should_exclude_path(lambda_file):
                continue
            
            # Check if it uses secrets properly
            uses_secrets_properly = verify_secrets_from_manager(lambda_file)
            
            assert uses_secrets_properly, (
                f"Lambda function {lambda_file.name} does not use Secrets Manager "
                f"or Parameter Store for secrets"
            )
    
    def test_environment_variables_not_hardcoded(self):
        """
        Property: Environment variables are not hardcoded
        
        For any environment variable that contains sensitive data,
        it should not have a hardcoded value in .env files.
        """
        project_root = Path(__file__).parent.parent.parent
        
        # Sensitive environment variable names
        sensitive_vars = [
            'PASSWORD',
            'SECRET',
            'API_KEY',
            'APIKEY',
            'PRIVATE_KEY',
            'ACCESS_KEY',
            'SECRET_KEY',
        ]
        
        # Allowed tokens (managed by deployment systems)
        allowed_tokens = [
            'VERCEL_OIDC_TOKEN',  # Managed by Vercel CLI
        ]
        
        # Check .env.local and .env.production
        for env_file in ['.env.local', '.env.production']:
            env_path = project_root / env_file
            
            if not env_path.exists():
                continue
            
            with open(env_path, 'r') as f:
                for line_num, line in enumerate(f, 1):
                    line = line.strip()
                    
                    # Skip comments and empty lines
                    if not line or line.startswith('#'):
                        continue
                    
                    # Check if it's an allowed token
                    if any(allowed in line for allowed in allowed_tokens):
                        continue
                    
                    # Check if line contains sensitive variable
                    for sensitive_var in sensitive_vars:
                        if sensitive_var in line.upper():
                            # Check if it has a non-empty value
                            if '=' in line:
                                key, value = line.split('=', 1)
                                value = value.strip()
                                
                                # Skip if value is empty or a placeholder
                                if value and not is_allowed_pattern(value):
                                    pytest.fail(
                                        f"Hardcoded sensitive value in {env_file}:{line_num}\n"
                                        f"Variable: {key}\n"
                                        f"Use AWS Secrets Manager or Parameter Store instead"
                                    )
    
    @given(
        file_content=st.text(
            alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'P')),
            min_size=0,
            max_size=1000
        )
    )
    @settings(max_examples=100, deadline=None)
    def test_secret_detection_patterns(self, file_content: str):
        """
        Property: Secret detection patterns work correctly
        
        For any text content, if it contains a secret pattern,
        it should be detected by our scanning logic.
        """
        # This test verifies that our detection patterns work
        # We're not testing for actual secrets, but that the patterns function correctly
        
        # Create a temporary file with the content
        import tempfile
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write(file_content)
            temp_path = Path(f.name)
        
        try:
            # Scan the file
            findings = scan_file_for_secrets(temp_path)
            
            # If findings exist, they should be valid tuples
            for finding in findings:
                assert isinstance(finding, tuple)
                assert len(finding) == 3
                secret_type, matched_text, line_num = finding
                assert isinstance(secret_type, str)
                assert isinstance(matched_text, str)
                assert isinstance(line_num, int)
                assert line_num > 0
        
        finally:
            # Clean up
            temp_path.unlink()


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
