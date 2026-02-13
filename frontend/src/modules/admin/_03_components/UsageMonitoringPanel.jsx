/**
 * UsageMonitoringPanel - Display system-wide usage statistics
 */
import { useState, useEffect } from 'react';
import { useAuthStore, authService } from '../../auth';

export function UsageMonitoringPanel() {
  const { tokens } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [usageStats, setUsageStats] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, pages: 0 });
  const [search, setSearch] = useState('');

  const fetchUsageStats = async (page = 1, pageSize = pagination.pageSize, searchQuery = search) => {
    setLoading(true);
    setError(null);
    try {
      // TODO: Implement backend endpoint for usage statistics
      // For now, show placeholder
      setUsageStats([]);
      setPagination({ page: 1, pageSize: 20, total: 0, pages: 0 });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to fetch usage statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsageStats();
  }, []);

  const formatNumber = (num) => {
    return num?.toLocaleString() || '0';
  };

  const formatPercentage = (value) => {
    if (value === null || value === undefined) return '-';
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="min-h-[400px]">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Usage Monitoring</h2>
        <p className="text-sm text-gray-600">
          Monitor character usage across all users for translation and STT features.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
        </div>
      )}

      {/* Placeholder Content */}
      {!loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-800 mb-1">
                Usage Monitoring Coming Soon
              </h3>
              <p className="text-sm text-blue-700 mb-3">
                This panel will display:
              </p>
              <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                <li>System-wide usage statistics by month</li>
                <li>Top users by character usage</li>
                <li>Usage trends and patterns</li>
                <li>Per-user usage breakdown (translation vs STT)</li>
                <li>Usage limit enforcement statistics</li>
              </ul>
              <p className="text-sm text-blue-700 mt-3">
                Backend API endpoint needs to be implemented to provide aggregated usage data.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Future: Usage Statistics Table */}
      {/* 
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">User</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Level</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Translation</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">STT</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Total</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Limit</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Usage %</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Month</th>
            </tr>
          </thead>
          <tbody>
            {usageStats.map((stat) => (
              <tr key={stat.userId} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-900">{stat.userName}</td>
                <td className="px-4 py-3 text-sm">{stat.userLevel}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{formatNumber(stat.translationChars)}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{formatNumber(stat.sttChars)}</td>
                <td className="px-4 py-3 text-sm text-gray-900 font-medium">{formatNumber(stat.totalChars)}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{stat.limit ? formatNumber(stat.limit) : 'Unlimited'}</td>
                <td className="px-4 py-3 text-sm">{formatPercentage(stat.percentage)}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{stat.month}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      */}
    </div>
  );
}

export default UsageMonitoringPanel;
