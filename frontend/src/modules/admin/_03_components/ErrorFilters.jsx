/**
 * Error Filters Component
 * Provides filtering controls for error events
 */

import React, { useState } from 'react';

/**
 * Error Filters Component
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onFilterChange - Callback when filters change
 * @param {Object} props.initialFilters - Initial filter values
 */
export function ErrorFilters({ onFilterChange, initialFilters = {} }) {
  const [whereFrom, setWhereFrom] = useState(initialFilters.whereFrom || '');
  const [startDate, setStartDate] = useState(initialFilters.startDate || '');
  const [endDate, setEndDate] = useState(initialFilters.endDate || '');
  const [traceId, setTraceId] = useState(initialFilters.traceId || '');
  
  const handleApply = () => {
    const filters = {
      whereFrom: whereFrom || null,
      startDate: startDate || null,
      endDate: endDate || null,
      traceId: traceId || null,
    };
    
    onFilterChange && onFilterChange(filters);
  };
  
  const handleReset = () => {
    setWhereFrom('');
    setStartDate('');
    setEndDate('');
    setTraceId('');
    
    onFilterChange && onFilterChange({
      whereFrom: null,
      startDate: null,
      endDate: null,
      traceId: null,
    });
  };
  
  return (
    <div className="bg-white p-4 rounded-lg shadow mb-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Source Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Source
          </label>
          <select
            value={whereFrom}
            onChange={(e) => setWhereFrom(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All</option>
            <option value="frontend">Frontend</option>
            <option value="backend">Backend</option>
          </select>
        </div>
        
        {/* Start Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <input
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        {/* End Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date
          </label>
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        {/* Trace ID Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Trace ID
          </label>
          <input
            type="text"
            value={traceId}
            onChange={(e) => setTraceId(e.target.value)}
            placeholder="Search by trace ID..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={handleApply}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Apply Filters
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

export default ErrorFilters;
