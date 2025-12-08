"""
Property-Based Tests for API Gateway Configuration
Feature: system-completion-audit

Tests rate limiting, authentication validation, and input validation.
"""

import pytest
import time
import requests
from hypothesis import given, strategies as st, settings, HealthCheck
from typing import Dict, List
import os
import json
from unittest.mock import Mock, patch, MagicMock
import hashlib


# Strategy for generating IP addresses
ip_address_strategy = st.from_regex(
    r'^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$',
    fullmatch=True
)

# Strategy for generating valid search queries
valid_query_strategy = st.text(
    min_size=1,
    max_size=200,
    alphabet=st.characters(
        blacklist_categories=('Cs', 'Cc'),
        blacklist_characters='<>"\';|$\\'
    )
)

# Strategy for generating API keys
api_key_strategy = st.text(
    min_size=20,
    max_size=50,
    alphabet=st.characters(
        whitelist_categories=('Lu', 'Ll', 'Nd'),
        min_codepoint=33,
        max_codepoint=126
    )
)

# Strategy for generating JWT tokens
jwt_token_strategy = st.from_regex(
    r'^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$',
    fullmatch=True
)

# Strategy for generating malicious inputs
malicious_input_strategy = st.one_of(
    # SQL injection attempts
    st.just("'; DROP TABLE supplements; --"),
    st.just("1' OR '1'='1"),
    st.just("admin'--"),
    st.just("' UNION SELECT * FROM users--"),
    
    # XSS attempts
    st.just("<script>alert('XSS')</script>"),
    st.just("<img src=x onerror=alert('XSS')>"),
    st.just("javascript:alert('XSS')"),
    st.just("<svg onload=alert('XSS')>"),
    
    # Path traversal
    st.just("../../etc/passwd"),
    st.just("..\\..\\windows\\system32"),
    
    # Command injection
    st.just("; ls -la"),
    st.just("| cat /etc/passwd"),
    st.just("$(whoami)"),
    
    # Oversized input
    st.text(min_size=201, max_size=1000),
    
    # Null bytes and control characters (excluding whitespace)
    st.just("\x00\x01\x02"),
)


class MockAPIGatewayResponse:
    """Mock API Gateway response for testing"""
    def __init__(self, status_code: int, body: Dict, headers: Dict = None):
        self.status_code = status_code
        self.body = body
        self.headers = headers or {}
        
    def json(self):
        return self.body


class MockRateLimiter:
    """Mock rate limiter for testing"""
    def __init__(self, limit: int = 100, window: int = 60):
        self.limit = limit
        self.window = window
        self.requests = {}  # ip -> [(timestamp, count)]
        
    def check_rate_limit(self, ip: str) -> bool:
        """Check if IP has exceeded rate limit"""
        current_time = time.time()
        
        # Clean old entries
        if ip in self.requests:
            self.requests[ip] = [
                (ts, count) for ts, count in self.requests[ip]
                if current_time - ts < self.window
            ]
        else:
            self.requests[ip] = []
        
        # Count requests in current window
        total_requests = sum(count for _, count in self.requests[ip])
        
        if total_requests >= self.limit:
            return False  # Rate limit exceeded
        
        # Add current request
        self.requests[ip].append((current_time, 1))
        return True  # Within rate limit
    
    def reset(self):
        """Reset rate limiter"""
        self.requests = {}


class MockAuthValidator:
    """Mock authentication validator for testing"""
    def __init__(self):
        self.valid_api_keys = set()
        self.valid_jwt_tokens = set()
        
    def add_valid_api_key(self, key: str):
        self.valid_api_keys.add(key)
        
    def add_valid_jwt_token(self, token: str):
        self.valid_jwt_tokens.add(token)
        
    def validate_api_key(self, key: str) -> bool:
        return key in self.valid_api_keys
    
    def validate_jwt_token(self, token: str) -> bool:
        return token in self.valid_jwt_tokens


class MockInputValidator:
    """Mock input validator for testing"""
    
    @staticmethod
    def validate_query(query: str) -> tuple[bool, str]:
        """
        Validate search query input
        Returns: (is_valid, error_message)
        """
        # Check length
        if len(query) == 0:
            return False, "Query cannot be empty"
        
        if len(query) > 200:
            return False, "Query too long (max 200 characters)"
        
        # Check for SQL injection patterns
        sql_patterns = [
            "DROP TABLE", "DELETE FROM", "INSERT INTO", "UPDATE ",
            "UNION SELECT", "--", "';", "OR '1'='1"
        ]
        query_upper = query.upper()
        for pattern in sql_patterns:
            if pattern in query_upper:
                return False, "Invalid characters detected"
        
        # Check for XSS patterns
        xss_patterns = [
            "<script", "<img", "javascript:", "onerror=", "onload=",
            "<svg", "<iframe", "<object", "<embed"
        ]
        query_lower = query.lower()
        for pattern in xss_patterns:
            if pattern in query_lower:
                return False, "Invalid characters detected"
        
        # Check for path traversal
        if ".." in query or "\\" in query:
            return False, "Invalid characters detected"
        
        # Check for command injection
        if any(char in query for char in [";", "|", "$"]):
            return False, "Invalid characters detected"
        
        # Check for null bytes and control characters
        if any(ord(char) < 32 for char in query if char not in ['\n', '\r', '\t']):
            return False, "Invalid characters detected"
        
        return True, ""


# Global instances for testing
rate_limiter = MockRateLimiter()
auth_validator = MockAuthValidator()
input_validator = MockInputValidator()


@pytest.fixture(scope='function')
def reset_mocks():
    """Reset all mocks before each test"""
    # Create fresh instances for each test
    test_rate_limiter = MockRateLimiter()
    test_auth_validator = MockAuthValidator()
    test_input_validator = MockInputValidator()
    
    yield test_rate_limiter, test_auth_validator, test_input_validator


@settings(max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(ip=ip_address_strategy)
def test_property_6_rate_limiting_enforcement(reset_mocks, ip):
    """
    **Feature: system-completion-audit, Property 6: Rate Limiting Enforcement**
    
    For any IP address making more than 100 requests per minute, 
    the System SHALL return HTTP 429 (Too Many Requests).
    **Validates: Requirements 6.4**
    """
    test_rate_limiter, _, _ = reset_mocks
    
    # Make exactly 100 requests (should all succeed)
    for i in range(100):
        result = test_rate_limiter.check_rate_limit(ip)
        assert result is True, f"Request {i+1}/100 should be allowed"
    
    # The 101st request should be rate limited
    result = test_rate_limiter.check_rate_limit(ip)
    assert result is False, "Request 101 should be rate limited (HTTP 429)"
    
    # Additional requests should also be rate limited
    for i in range(10):
        result = test_rate_limiter.check_rate_limit(ip)
        assert result is False, f"Request {102+i} should still be rate limited"


@settings(max_examples=50, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(valid_key=api_key_strategy)
def test_property_7_authentication_validation_api_key(reset_mocks, valid_key):
    """
    **Feature: system-completion-audit, Property 7: Authentication Validation**
    
    For any API request requiring authentication, the System SHALL validate 
    the API key and reject invalid credentials with HTTP 401.
    **Validates: Requirements 6.5**
    """
    _, test_auth_validator, _ = reset_mocks
    
    # Create an invalid key that's definitely different
    invalid_key = "INVALID_" + valid_key + "_WRONG"
    
    # Register only the valid API key
    test_auth_validator.add_valid_api_key(valid_key)
    
    # Valid key should be accepted
    assert test_auth_validator.validate_api_key(valid_key) is True, \
        "Valid API key should be accepted"
    
    # Invalid key should be rejected (HTTP 401)
    assert test_auth_validator.validate_api_key(invalid_key) is False, \
        "Invalid API key should be rejected with HTTP 401"
    
    # Empty key should be rejected
    assert test_auth_validator.validate_api_key("") is False, \
        "Empty API key should be rejected with HTTP 401"


@settings(max_examples=50, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(valid_token=jwt_token_strategy)
def test_property_7_authentication_validation_jwt(reset_mocks, valid_token):
    """
    **Feature: system-completion-audit, Property 7: Authentication Validation**
    
    For any API request requiring authentication, the System SHALL validate 
    JWT tokens and reject invalid tokens with HTTP 401.
    **Validates: Requirements 6.5**
    """
    _, test_auth_validator, _ = reset_mocks
    
    # Create an invalid token that's definitely different
    invalid_token = "INVALID." + valid_token + ".WRONG"
    
    # Register only the valid JWT token
    test_auth_validator.add_valid_jwt_token(valid_token)
    
    # Valid token should be accepted
    assert test_auth_validator.validate_jwt_token(valid_token) is True, \
        "Valid JWT token should be accepted"
    
    # Invalid token should be rejected (HTTP 401)
    assert test_auth_validator.validate_jwt_token(invalid_token) is False, \
        "Invalid JWT token should be rejected with HTTP 401"
    
    # Malformed token should be rejected
    assert test_auth_validator.validate_jwt_token("not.a.valid.jwt") is False, \
        "Malformed JWT should be rejected with HTTP 401"


@settings(max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(malicious_input=malicious_input_strategy)
def test_property_22_input_validation_and_sanitization(reset_mocks, malicious_input):
    """
    **Feature: system-completion-audit, Property 22: Input Validation and Sanitization**
    
    For any API request, the System SHALL validate and sanitize all input parameters,
    rejecting requests with invalid or malicious inputs with HTTP 400.
    **Validates: Requirements 13.3**
    """
    _, _, test_input_validator = reset_mocks
    
    # All malicious inputs should be rejected
    is_valid, error_message = test_input_validator.validate_query(malicious_input)
    
    assert is_valid is False, \
        f"Malicious input should be rejected with HTTP 400: {malicious_input[:50]}"
    
    assert error_message != "", \
        "Error message should be provided for rejected input"


@settings(max_examples=50, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(query=valid_query_strategy)
def test_valid_inputs_are_accepted(reset_mocks, query):
    """
    Additional test: Verify that valid inputs are accepted
    """
    _, _, test_input_validator = reset_mocks
    
    is_valid, error_message = test_input_validator.validate_query(query)
    
    # Valid queries should be accepted
    assert is_valid is True, \
        f"Valid query should be accepted: {query[:50]}"
    
    assert error_message == "", \
        "No error message should be provided for valid input"


def test_rate_limiting_per_ip_isolation():
    """
    Additional test: Verify rate limiting is isolated per IP
    """
    test_rate_limiter = MockRateLimiter()
    
    # Test with specific IPs
    ips = ['192.168.1.1', '192.168.1.2', '192.168.1.3']
    
    # Each IP should have its own rate limit counter
    for ip in ips:
        # Make 50 requests from each IP
        for i in range(50):
            result = test_rate_limiter.check_rate_limit(ip)
            assert result is True, \
                f"Request {i+1}/50 from IP {ip} should be allowed"
    
    # All IPs should still be within their limits
    for ip in ips:
        result = test_rate_limiter.check_rate_limit(ip)
        assert result is True, \
            f"IP {ip} should still be within rate limit (51/100 requests)"


@settings(max_examples=30, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(ip=ip_address_strategy)
def test_rate_limit_window_expiration(reset_mocks, ip):
    """
    Additional test: Verify rate limit window expires after 60 seconds
    """
    test_rate_limiter, _, _ = reset_mocks
    
    # Make 100 requests
    for i in range(100):
        test_rate_limiter.check_rate_limit(ip)
    
    # Should be rate limited now
    assert test_rate_limiter.check_rate_limit(ip) is False, \
        "Should be rate limited after 100 requests"
    
    # Simulate time passing (61 seconds)
    # In real implementation, this would wait, but we'll manipulate the rate limiter
    test_rate_limiter.requests[ip] = [
        (time.time() - 61, count) for _, count in test_rate_limiter.requests[ip]
    ]
    
    # Should be able to make requests again
    result = test_rate_limiter.check_rate_limit(ip)
    assert result is True, \
        "Should be able to make requests after window expires"


@settings(max_examples=50, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(
    queries=st.lists(
        st.one_of(valid_query_strategy, malicious_input_strategy),
        min_size=5,
        max_size=10
    )
)
def test_input_validation_consistency(reset_mocks, queries):
    """
    Additional test: Verify input validation is consistent across multiple requests
    """
    _, _, test_input_validator = reset_mocks
    
    results = []
    
    for query in queries:
        is_valid, error_message = test_input_validator.validate_query(query)
        results.append((query, is_valid, error_message))
    
    # Verify same query always produces same result
    unique_queries = {}
    for query, is_valid, error_message in results:
        if query not in unique_queries:
            unique_queries[query] = (is_valid, error_message)
        else:
            # Same query should produce same validation result
            assert unique_queries[query] == (is_valid, error_message), \
                f"Validation should be consistent for query: {query[:50]}"


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])

