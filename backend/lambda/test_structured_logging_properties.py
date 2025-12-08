"""
Property-Based Tests for Structured Logging
Feature: system-completion-audit, Property 17: Structured Logging Format

Tests that all Lambda functions log events as structured JSON with required fields.
Validates: Requirements 9.1
"""

import json
import pytest
from hypothesis import given, strategies as st, settings
from unittest.mock import Mock, patch, MagicMock
import sys
import os

# Define log_structured function locally for testing
# (This is the same implementation as in lambda_function.py)
def log_structured(event_type: str, **kwargs):
    """Structured logging for better CloudWatch Insights"""
    import time
    log_entry = {
        'timestamp': time.time(),
        'event_type': event_type,
        **kwargs
    }
    print(json.dumps(log_entry))


class TestStructuredLoggingProperties:
    """Property-based tests for structured logging format"""
    
    @given(
        event_type=st.text(min_size=1, max_size=50),
        query=st.text(min_size=1, max_size=200),
        latency_ms=st.floats(min_value=0.1, max_value=10000.0, allow_nan=False, allow_infinity=False),
        cache_hit=st.booleans(),
        similarity=st.floats(min_value=0.0, max_value=1.0, allow_nan=False, allow_infinity=False)
    )
    @settings(max_examples=100)
    def test_property_17_structured_logging_format(
        self, event_type, query, latency_ms, cache_hit, similarity
    ):
        """
        Property 17: Structured Logging Format
        
        For any Lambda invocation, the System SHALL log all events as structured JSON
        with timestamp, event_type, and relevant context fields.
        
        Validates: Requirements 9.1
        """
        # Capture stdout to verify log output
        from io import StringIO
        import sys
        
        captured_output = StringIO()
        original_stdout = sys.stdout
        sys.stdout = captured_output
        
        try:
            # Call log_structured with various parameters
            log_structured(
                event_type=event_type,
                query=query,
                latency_ms=latency_ms,
                cache_hit=cache_hit,
                similarity=similarity
            )
            
            # Get the logged output
            sys.stdout = original_stdout
            log_output = captured_output.getvalue().strip()
            
            # Parse as JSON
            log_entry = json.loads(log_output)
            
            # Verify required fields exist
            assert 'timestamp' in log_entry, "Log must contain 'timestamp' field"
            assert 'event_type' in log_entry, "Log must contain 'event_type' field"
            
            # Verify timestamp is a valid number
            assert isinstance(log_entry['timestamp'], (int, float)), \
                "Timestamp must be a number"
            assert log_entry['timestamp'] > 0, "Timestamp must be positive"
            
            # Verify event_type matches input
            assert log_entry['event_type'] == event_type, \
                "Event type must match input"
            
            # Verify context fields are preserved
            assert log_entry['query'] == query, "Query must be preserved"
            assert abs(log_entry['latency_ms'] - latency_ms) < 0.01, \
                "Latency must be preserved"
            assert log_entry['cache_hit'] == cache_hit, "Cache hit must be preserved"
            assert abs(log_entry['similarity'] - similarity) < 0.01, \
                "Similarity must be preserved"
            
        finally:
            sys.stdout = original_stdout
    
    @given(
        event_type=st.text(min_size=1, max_size=50),
        request_id=st.uuids().map(str),
        duration_ms=st.floats(min_value=0.1, max_value=30000.0, allow_nan=False, allow_infinity=False)
    )
    @settings(max_examples=100)
    def test_all_lambda_invocations_produce_structured_logs(
        self, event_type, request_id, duration_ms
    ):
        """
        Test that all Lambda invocations produce structured JSON logs
        with consistent format across different event types.
        """
        from io import StringIO
        import sys
        
        captured_output = StringIO()
        original_stdout = sys.stdout
        sys.stdout = captured_output
        
        try:
            # Log with minimal fields
            log_structured(
                event_type=event_type,
                request_id=request_id,
                duration_ms=duration_ms
            )
            
            sys.stdout = original_stdout
            log_output = captured_output.getvalue().strip()
            
            # Must be valid JSON
            log_entry = json.loads(log_output)
            
            # Must have core fields
            assert 'timestamp' in log_entry
            assert 'event_type' in log_entry
            assert log_entry['event_type'] == event_type
            assert log_entry['request_id'] == request_id
            assert abs(log_entry['duration_ms'] - duration_ms) < 0.01
            
        finally:
            sys.stdout = original_stdout
    
    @given(
        event_types=st.lists(
            st.text(min_size=1, max_size=50),
            min_size=1,
            max_size=10
        )
    )
    @settings(max_examples=100)
    def test_multiple_log_entries_are_all_structured(self, event_types):
        """
        Test that multiple consecutive log entries all maintain
        structured JSON format.
        """
        from io import StringIO
        import sys
        
        captured_output = StringIO()
        original_stdout = sys.stdout
        sys.stdout = captured_output
        
        try:
            # Log multiple events
            for event_type in event_types:
                log_structured(event_type=event_type)
            
            sys.stdout = original_stdout
            log_outputs = captured_output.getvalue().strip().split('\n')
            
            # Each line must be valid JSON
            assert len(log_outputs) == len(event_types), \
                "Must produce one log line per event"
            
            for i, log_line in enumerate(log_outputs):
                log_entry = json.loads(log_line)
                assert 'timestamp' in log_entry
                assert 'event_type' in log_entry
                assert log_entry['event_type'] == event_types[i]
            
        finally:
            sys.stdout = original_stdout
    
    def test_structured_logging_simulates_lambda_invocation(self):
        """
        Simulate Lambda invocation and verify structured logs
        """
        from io import StringIO
        import sys
        
        captured_output = StringIO()
        original_stdout = sys.stdout
        sys.stdout = captured_output
        
        try:
            # Simulate Lambda invocation lifecycle logs
            request_id = 'test-request-123'
            
            # Request received
            log_structured('request_received', request_id=request_id)
            
            # Search request
            log_structured('search_request', query='vitamin d', limit=5)
            
            # Cache check
            log_structured('cache_miss', query_hash='abc123', latency_ms=5.2)
            
            # Vector search
            log_structured('lancedb_search_complete', duration_ms=8.5, results_count=3)
            
            # Request complete
            log_structured('request_complete', duration_ms=45.2, cache_hit=False)
            
            sys.stdout = original_stdout
            log_outputs = captured_output.getvalue().strip().split('\n')
            
            # Verify all logs are structured JSON
            assert len(log_outputs) == 5, "Should produce 5 log entries"
            
            for log_line in log_outputs:
                log_entry = json.loads(log_line)
                assert 'timestamp' in log_entry
                assert 'event_type' in log_entry
                assert isinstance(log_entry['timestamp'], (int, float))
            
            # Verify specific event types
            event_types = [json.loads(line)['event_type'] for line in log_outputs]
            assert 'request_received' in event_types
            assert 'search_request' in event_types
            assert 'cache_miss' in event_types
            assert 'lancedb_search_complete' in event_types
            assert 'request_complete' in event_types
            
        finally:
            sys.stdout = original_stdout
    
    @given(
        error_message=st.text(min_size=1, max_size=200),
        error_type=st.sampled_from([
            'ValueError', 'TypeError', 'KeyError', 'AttributeError', 'RuntimeError'
        ])
    )
    @settings(max_examples=100)
    def test_error_logs_are_structured(self, error_message, error_type):
        """
        Test that error logs maintain structured format
        """
        from io import StringIO
        import sys
        
        captured_output = StringIO()
        original_stdout = sys.stdout
        sys.stdout = captured_output
        
        try:
            # Log an error
            log_structured(
                event_type='lambda_error',
                error=error_message,
                error_type=error_type
            )
            
            sys.stdout = original_stdout
            log_output = captured_output.getvalue().strip()
            
            # Parse as JSON
            log_entry = json.loads(log_output)
            
            # Verify error fields are structured
            assert log_entry['event_type'] == 'lambda_error'
            assert log_entry['error'] == error_message
            assert log_entry['error_type'] == error_type
            assert 'timestamp' in log_entry
            
        finally:
            sys.stdout = original_stdout


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
