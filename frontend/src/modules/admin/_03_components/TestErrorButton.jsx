/**
 * Test Error Button Component
 * Triggers a test error to verify error tracking system
 */

import React, { useState } from 'react';
import { triggerTestError } from '../_06_services/errorService.js';
import { useAuthStore } from '../../auth';

/**
 * Test Error Button Component
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onSuccess - Callback when test error is triggered successfully
 */
export function TestErrorButton({ onSuccess }) {
  const { tokens } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  
  const handleClick = async () => {
    if (!tokens?.access_token) {
      alert('Please login first');
      return;
    }
    
    setLoading(true);
    setResult(null);
    
    try {
      const response = await triggerTestError(tokens.access_token);
      
      // Log trace ID to console
      console.log('[TEST_ERROR] Trace ID:', response.traceId);
      console.error('[TRACE_ID]', response.traceId);
      
      setResult({
        success: true,
        traceId: response.traceId,
      });
      
      // Show success message
      alert(`Test error triggered successfully!\n\nTrace ID: ${response.traceId}\n\nCheck the console and error monitoring page.`);
      
      // Call success callback
      onSuccess && onSuccess(response.traceId);
    } catch (error) {
      console.error('[TEST_ERROR] Failed:', error);
      
      setResult({
        success: false,
        error: error.message,
      });
      
      alert(`Failed to trigger test error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="flex items-center gap-4">
      <button
        onClick={handleClick}
        disabled={loading}
        className={`px-4 py-2 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${
          loading
            ? 'bg-gray-400 text-white cursor-not-allowed'
            : 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
        }`}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Triggering...
          </span>
        ) : (
          'Trigger Test Error'
        )}
      </button>
      
      {result && result.success && (
        <div className="text-sm">
          <span className="text-green-600 font-medium">✓ Success</span>
          <span className="text-gray-500 ml-2">
            Trace ID: <code className="font-mono text-xs">{result.traceId.substring(0, 8)}...</code>
          </span>
        </div>
      )}
      
      {result && !result.success && (
        <div className="text-sm text-red-600">
          ✗ Failed: {result.error}
        </div>
      )}
    </div>
  );
}

export default TestErrorButton;
