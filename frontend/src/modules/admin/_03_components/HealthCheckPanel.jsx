/**
 * HealthCheckPanel - System health check results display component
 */
import React from 'react';

export default function HealthCheckPanel({ healthData, onRefresh, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">Checking health...</div>
      </div>
    );
  }

  if (!healthData) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="text-gray-600">No health check data available.</div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Loading...' : 'Run Health Check'}
        </button>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'ok':
        return 'text-green-600 bg-green-50';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-50';
      case 'down':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getLatencyColor = (latencyMs) => {
    if (latencyMs < 100) return 'text-green-600';
    if (latencyMs < 500) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCheckLabel = (checkName) => {
    const labels = {
      db: 'Database',
      translation_api: 'Translation API',
      dictionary_api: 'Dictionary API',
      cache: 'Cache',
    };
    return labels[checkName] || checkName;
  };

  return (
    <div className="min-h-[400px] space-y-6">
      {/* Overall status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-bold text-gray-900">System Health Check</h2>
          <span className={`px-4 py-2 rounded-full font-semibold ${getStatusColor(healthData.status)}`}>
            {healthData.status === 'ok' && 'OK'}
            {healthData.status === 'degraded' && 'Degraded'}
            {healthData.status === 'down' && 'Down'}
          </span>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Last check time */}
      <div className="text-sm text-gray-600">
        Last check: {new Date(healthData.time).toLocaleString('en-US', { 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit', 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit',
          hour12: true 
        })}
      </div>

      {/* Individual check results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(healthData.checks || {}).map(([checkName, checkResult]) => (
          <div
            key={checkName}
            className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-lg text-gray-900">{getCheckLabel(checkName)}</h3>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  checkResult.ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {checkResult.ok ? 'OK' : 'FAIL'}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Response time:</span>
                <span className={`font-mono font-semibold ${getLatencyColor(checkResult.latency_ms)}`}>
                  {checkResult.latency_ms}ms
                </span>
              </div>

              {checkResult.error && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  <span className="font-semibold">Error:</span> {checkResult.error}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Trace ID */}
      <div className="text-xs text-gray-500 font-mono">
        Trace ID: {healthData.trace_id}
      </div>
    </div>
  );
}
