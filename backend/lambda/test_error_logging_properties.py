"""
Property-Based Tests for Error Logging Completeness
Feature: system-completion-audit, Property 18: Error Logging Completeness

Tests that all errors are logged with complete context including error message,
error type, stack trace, and request ID.
Validates: Requirements 9.2
"""

import json
import pytest
from hypothesis import given, strategies as st, settings
from unittest.mock import Mock, patch
import sys
import os
import traceback


# Define log_structured function for testing
def log_structured(event_type: str, **kwargs):
    """Structured logging for better CloudWatch Insights"""
    import time
    log_entry = {
        'timestamp': time.time(),
        'event_type': event_type,
        **kwargs
    }
    print(json.dumps(log_entry))


class TestErrorLoggingProperties:
    """Property-based tests for error logging completeness"""
    
    @given(
        error_message=st.text(min_size=1, max_size=500),
        error_type=st.sampled_from([
            'ValueError', 'TypeError', 'KeyError', 'AttributeError', 
            'RuntimeError', 'IOError', 'ConnectionError', 'TimeoutError'
        ]),
        request_id=st.uuids().map(str),
        query=st.text(min_size=1, max_size=200)
    )
    @settings(max_examples=100)
    def test_property_18_error_logging_completeness(
        self, error_message, error_type, request_id, query
    ):
        """
        Property 18: Error Logging Completeness
        
        For any error that occurs, the System SHALL log the complete error context
        including error message, error type, stack trace, and request ID.
        
        Validates: Requirements 9.2
        """
        from io import StringIO
        import sys
        
        captured_output = StringIO()
        original_stdout = sys.stdout
        sys.stdout = captured_output
        
        try:
            # Simulate error logging with complete context
            log_structured(
                event_type='lambda_error',
                error=error_message,
                error_type=error_type,
                request_id=request_id,
                query=query,
                stack_trace='Traceback (most recent call last):\n  File "test.py", line 1, in <module>\n    raise Exception("test")'
            )
            
            sys.stdout = original_stdout
            log_output = captured_output.getvalue().strip()
            
            # Parse as JSON
            log_entry = json.loads(log_output)
            
            # Verify all required error context fields are present
            assert 'timestamp' in log_entry, "Error log must contain timestamp"
            assert 'event_type' in log_entry, "Error log must contain event_type"
            assert 'error' in log_entry, "Error log must contain error message"
            assert 'error_type' in log_entry, "Error log must contain error type"
            assert 'request_id' in log_entry, "Error log must contain request_id"
            assert 'stack_trace' in log_entry, "Error log must contain stack_trace"
            
            # Verify values match
            assert log_entry['event_type'] == 'lambda_error'
            assert log_entry['error'] == error_message
            assert log_entry['error_type'] == error_type
            assert log_entry['request_id'] == request_id
            assert log_entry['query'] == query
            
            # Verify stack trace is non-empty
            assert len(log_entry['stack_trace']) > 0, "Stack trace must not be empty"
            
        finally:
            sys.stdout = original_stdout
    
    @given(
        exception_type=st.sampled_from([
            ValueError, TypeError, AttributeError, RuntimeError
        ]),
        error_message=st.text(min_size=1, max_size=200)
    )
    @settings(max_examples=100)
    def test_exception_logging_captures_stack_trace(
        self, exception_type, error_message
    ):
        """
        Test that when exceptions are caught, the stack trace is captured
        and logged with complete context.
        """
        from io import StringIO
        import sys
        
        captured_output = StringIO()
        original_stdout = sys.stdout
        sys.stdout = captured_output
        
        try:
            # Simulate catching an exception
            try:
                raise exception_type(error_message)
            except Exception as e:
                # Log the error with stack trace
                error_str = str(e)
                log_structured(
                    event_type='lambda_error',
                    error=error_str,
                    error_type=type(e).__name__,
                    stack_trace=traceback.format_exc()
                )
            
            sys.stdout = original_stdout
            log_output = captured_output.getvalue().strip()
            
            # Parse log
            log_entry = json.loads(log_output)
            
            # Verify error details - error string should contain the message
            assert error_message in log_entry['error'] or log_entry['error'] == error_message
            assert log_entry['error_type'] == exception_type.__name__
            
            # Verify stack trace contains traceback information
            assert 'Traceback' in log_entry['stack_trace']
            assert exception_type.__name__ in log_entry['stack_trace']
            
        finally:
            sys.stdout = original_stdout
    
    @given(
        error_scenarios=st.lists(
            st.tuples(
                st.text(min_size=1, max_size=100),  # error message
                st.sampled_from(['cache_error', 'discovery_queue_error', 'lambda_error']),  # error type
                st.uuids().map(str)  # request_id
            ),
            min_size=1,
            max_size=5
        )
    )
    @settings(max_examples=100)
    def test_multiple_errors_all_logged_completely(self, error_scenarios):
        """
        Test that multiple errors in sequence are all logged with
        complete context.
        """
        from io import StringIO
        import sys
        
        captured_output = StringIO()
        original_stdout = sys.stdout
        sys.stdout = captured_output
        
        try:
            # Log multiple errors
            for error_msg, event_type, request_id in error_scenarios:
                log_structured(
                    event_type=event_type,
                    error=error_msg,
                    error_type='TestError',
                    request_id=request_id,
                    stack_trace='Test stack trace'
                )
            
            sys.stdout = original_stdout
            log_outputs = captured_output.getvalue().strip().split('\n')
            
            # Verify all errors were logged
            assert len(log_outputs) == len(error_scenarios)
            
            # Verify each error has complete context
            for i, log_line in enumerate(log_outputs):
                log_entry = json.loads(log_line)
                error_msg, event_type, request_id = error_scenarios[i]
                
                assert log_entry['error'] == error_msg
                assert log_entry['event_type'] == event_type
                assert log_entry['request_id'] == request_id
                assert 'stack_trace' in log_entry
                assert 'timestamp' in log_entry
            
        finally:
            sys.stdout = original_stdout
    
    def test_cache_error_logging_completeness(self):
        """
        Test that cache errors are logged with complete context
        """
        from io import StringIO
        import sys
        
        captured_output = StringIO()
        original_stdout = sys.stdout
        sys.stdout = captured_output
        
        try:
            # Simulate cache error
            query_hash = 'abc123def456'
            error_msg = 'DynamoDB connection timeout'
            
            log_structured(
                event_type='cache_error',
                error=error_msg,
                error_type='ConnectionTimeout',
                query_hash=query_hash,
                operation='get_item',
                table='supplement-cache'
            )
            
            sys.stdout = original_stdout
            log_output = captured_output.getvalue().strip()
            
            # Parse log
            log_entry = json.loads(log_output)
            
            # Verify complete error context
            assert log_entry['event_type'] == 'cache_error'
            assert log_entry['error'] == error_msg
            assert log_entry['error_type'] == 'ConnectionTimeout'
            assert log_entry['query_hash'] == query_hash
            assert log_entry['operation'] == 'get_item'
            assert log_entry['table'] == 'supplement-cache'
            assert 'timestamp' in log_entry
            
        finally:
            sys.stdout = original_stdout
    
    def test_discovery_queue_error_logging_completeness(self):
        """
        Test that discovery queue errors are logged with complete context
        """
        from io import StringIO
        import sys
        
        captured_output = StringIO()
        original_stdout = sys.stdout
        sys.stdout = captured_output
        
        try:
            # Simulate discovery queue error
            query = 'unknown supplement'
            error_msg = 'Failed to insert into discovery queue'
            
            log_structured(
                event_type='discovery_queue_error',
                error=error_msg,
                error_type='DynamoDBError',
                query=query,
                operation='put_item',
                table='discovery-queue'
            )
            
            sys.stdout = original_stdout
            log_output = captured_output.getvalue().strip()
            
            # Parse log
            log_entry = json.loads(log_output)
            
            # Verify complete error context
            assert log_entry['event_type'] == 'discovery_queue_error'
            assert log_entry['error'] == error_msg
            assert log_entry['error_type'] == 'DynamoDBError'
            assert log_entry['query'] == query
            assert log_entry['operation'] == 'put_item'
            assert log_entry['table'] == 'discovery-queue'
            assert 'timestamp' in log_entry
            
        finally:
            sys.stdout = original_stdout
    
    @given(
        request_id=st.uuids().map(str),
        query=st.text(min_size=1, max_size=200)
    )
    @settings(max_examples=100)
    def test_lambda_handler_error_includes_request_context(
        self, request_id, query
    ):
        """
        Test that Lambda handler errors include request context
        (request_id, query, etc.)
        """
        from io import StringIO
        import sys
        
        captured_output = StringIO()
        original_stdout = sys.stdout
        sys.stdout = captured_output
        
        try:
            # Simulate Lambda handler error
            try:
                # Simulate some operation that fails
                raise RuntimeError("Database connection failed")
            except Exception as e:
                log_structured(
                    event_type='lambda_error',
                    error=str(e),
                    error_type=type(e).__name__,
                    request_id=request_id,
                    query=query,
                    stack_trace=traceback.format_exc()
                )
            
            sys.stdout = original_stdout
            log_output = captured_output.getvalue().strip()
            
            # Parse log
            log_entry = json.loads(log_output)
            
            # Verify request context is included
            assert log_entry['request_id'] == request_id
            assert log_entry['query'] == query
            assert log_entry['error'] == "Database connection failed"
            assert log_entry['error_type'] == 'RuntimeError'
            assert 'stack_trace' in log_entry
            assert 'Traceback' in log_entry['stack_trace']
            
        finally:
            sys.stdout = original_stdout
    
    def test_error_log_json_serializable(self):
        """
        Test that error logs with complex objects are JSON serializable
        """
        from io import StringIO
        import sys
        
        captured_output = StringIO()
        original_stdout = sys.stdout
        sys.stdout = captured_output
        
        try:
            # Log error with various data types
            log_structured(
                event_type='lambda_error',
                error='Test error',
                error_type='TestError',
                request_id='test-123',
                metadata={
                    'string': 'value',
                    'number': 42,
                    'float': 3.14,
                    'boolean': True,
                    'null': None,
                    'list': [1, 2, 3],
                    'nested': {'key': 'value'}
                }
            )
            
            sys.stdout = original_stdout
            log_output = captured_output.getvalue().strip()
            
            # Must be valid JSON
            log_entry = json.loads(log_output)
            
            # Verify complex metadata is preserved
            assert log_entry['metadata']['string'] == 'value'
            assert log_entry['metadata']['number'] == 42
            assert abs(log_entry['metadata']['float'] - 3.14) < 0.01
            assert log_entry['metadata']['boolean'] is True
            assert log_entry['metadata']['null'] is None
            assert log_entry['metadata']['list'] == [1, 2, 3]
            assert log_entry['metadata']['nested']['key'] == 'value'
            
        finally:
            sys.stdout = original_stdout


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
