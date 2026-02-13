/**
 * Error Monitoring View
 * Admin page for monitoring and viewing error events
 */

import { useState } from 'react';
import { useErrorEvents } from '../_04_hooks/useErrorEvents.js';
import { ErrorTable, ErrorFilters, ErrorDetailModal, TestErrorButton } from '../_03_components';
import { useAuthStore } from '../../auth';

/**
 * Error Monitoring View Component
 */
export function ErrorMonitoringView() {
  const { user, isAdmin } = useAuthStore();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [filters, setFilters] = useState({
    whereFrom: null,
    startDate: null,
    endDate: null,
    traceId: null,
  });
  const [selectedTraceId, setSelectedTraceId] = useState(null);
  
  // Check admin access
  if (!user || !isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-red-800 mb-2">
            Access Denied
          </h2>
          <p className="text-red-600">
            You need admin privileges to access this page.
          </p>
        </div>
      </div>
    );
  }
  
  // Fetch error events
  const { errors, total, loading, error } = useErrorEvents({
    page,
    pageSize,
    filters,
  });
  
  // Calculate pagination
  const totalPages = Math.ceil(total / pageSize);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  
  // Handle filter change
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
  };
  
  // Handle trace ID click
  const handleTraceIdClick = (traceId) => {
    setSelectedTraceId(traceId);
  };
  
  // Handle modal close
  const handleModalClose = () => {
    setSelectedTraceId(null);
  };
  
  // Handle test error success
  const handleTestErrorSuccess = (traceId) => {
    // Optionally refresh the list or show the error
    console.log('Test error triggered with trace ID:', traceId);
  };
  
  // Handle pagination
  const handlePrevPage = () => {
    if (hasPrevPage) {
      setPage(page - 1);
    }
  };
  
  const handleNextPage = () => {
    if (hasNextPage) {
      setPage(page + 1);
    }
  };
  
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Error Monitoring
          </h1>
          <p className="text-gray-600">
            Monitor and track errors across frontend and backend
          </p>
        </div>
        
        {/* Test Error Button */}
        <div className="mb-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-yellow-800 mb-1">
                  Test Error Tracking
                </h3>
                <p className="text-sm text-yellow-700 mb-3">
                  Trigger a test error to verify the error tracking system is working correctly.
                  The error will appear in the list below within a few seconds.
                </p>
                <TestErrorButton onSuccess={handleTestErrorSuccess} />
              </div>
            </div>
          </div>
        </div>
        
        {/* Filters */}
        <ErrorFilters
          onFilterChange={handleFilterChange}
          initialFilters={filters}
        />
        
        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-700">
              Failed to load errors: {error.message}
            </p>
          </div>
        )}
        
        {/* Stats */}
        {!loading && !error && (
          <div className="mb-4 text-sm text-gray-600">
            Showing {errors.length} of {total} errors
            {filters.whereFrom && ` (filtered by ${filters.whereFrom})`}
          </div>
        )}
        
        {/* Error Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
          <ErrorTable
            errors={errors}
            onTraceIdClick={handleTraceIdClick}
            loading={loading}
          />
        </div>
        
        {/* Pagination */}
        {!loading && !error && totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePrevPage}
                disabled={!hasPrevPage}
                className={`px-4 py-2 rounded-md font-medium ${
                  hasPrevPage
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Previous
              </button>
              <button
                onClick={handleNextPage}
                disabled={!hasNextPage}
                className={`px-4 py-2 rounded-md font-medium ${
                  hasNextPage
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
        
        {/* Error Detail Modal */}
        <ErrorDetailModal
          traceId={selectedTraceId}
          onClose={handleModalClose}
        />
      </div>
    </div>
  );
}

export default ErrorMonitoringView;
