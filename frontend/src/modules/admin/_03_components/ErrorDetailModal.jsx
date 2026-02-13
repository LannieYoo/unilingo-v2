/**
 * Error Detail Modal Component
 * Displays detailed information about error events for a specific trace ID
 */

import React from 'react';
import { useErrorByTraceId } from '../_04_hooks/useErrorEvents.js';

/**
 * Format date to readable string
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}

/**
 * Error Detail Modal Component
 * 
 * @param {Object} props - Component props
 * @param {string | null} props.traceId - Trace ID to display details for
 * @param {Function} props.onClose - Callback when modal is closed
 */
export function ErrorDetailModal({ traceId, onClose }) {
  const { events, loading, error } = useErrorByTraceId(traceId);
  
  if (!traceId) {
    return null;
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            Error Details
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Trace ID */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trace ID
            </label>
            <code className="block px-3 py-2 bg-gray-100 rounded text-sm font-mono">
              {traceId}
            </code>
          </div>
          
          {/* Loading State */}
          {loading && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          )}
          
          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">
              Failed to load error details: {error.message}
            </div>
          )}
          
          {/* Events */}
          {!loading && !error && events.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No error events found for this trace ID
            </div>
          )}
          
          {!loading && !error && events.length > 0 && (
            <div className="space-y-4">
              {events.map((event, index) => (
                <div key={event.id} className="border border-gray-200 rounded-lg p-4">
                  {/* Event Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        event.whereFrom === 'frontend'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {event.whereFrom}
                      </span>
                      <span className="ml-2 text-sm text-gray-500">
                        {formatDate(event.createdAt)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      Event {index + 1} of {events.length}
                    </span>
                  </div>
                  
                  {/* Message */}
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message
                    </label>
                    <p className="text-sm text-gray-900">{event.message}</p>
                  </div>
                  
                  {/* Stack Trace */}
                  {event.detail?.stackTrace && (
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Stack Trace
                      </label>
                      <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                        {event.detail.stackTrace}
                      </pre>
                    </div>
                  )}
                  
                  {/* User Context */}
                  {event.detail?.userContext && Object.keys(event.detail.userContext).length > 0 && (
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        User Context
                      </label>
                      <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                        {JSON.stringify(event.detail.userContext, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {/* URL */}
                  {event.detail?.url && (
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        URL
                      </label>
                      <p className="text-sm text-gray-900 break-all">{event.detail.url}</p>
                    </div>
                  )}
                  
                  {/* User Agent */}
                  {event.detail?.userAgent && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        User Agent
                      </label>
                      <p className="text-xs text-gray-600 break-all">{event.detail.userAgent}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ErrorDetailModal;
