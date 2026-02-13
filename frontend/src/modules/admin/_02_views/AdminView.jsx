/**
 * Admin View - Users and Login Logs management.
 */
import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore, authService, ADMIN_USER } from '../../auth';
import { HealthCheckPanel, UsageMonitoringPanel, PendingUsersPanel } from '../_03_components';
import { ErrorTable, ErrorFilters, ErrorDetailModal, TestErrorButton } from '../_03_components';
import { useErrorEvents } from '../_04_hooks/useErrorEvents.js';

export default function AdminView() {
  const { isAuthenticated, isAdmin, tokens, user: currentUser } = useAuthStore();
  
  // Redirect if not admin (check BEFORE any other hooks)
  if (!isAuthenticated || !isAdmin) {
    return <Navigate to="/" replace />;
  }
  
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [loginLogs, setLoginLogs] = useState([]);
  const [sttSummary, setSttSummary] = useState([]);
  const [sttLogs, setSttLogs] = useState([]);
  const [healthData, setHealthData] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [togglingUserId, setTogglingUserId] = useState(null);
  const [changingLevelUserId, setChangingLevelUserId] = useState(null);
  
  // Search states
  const [usersSearch, setUsersSearch] = useState('');
  const [loginLogsSearch, setLoginLogsSearch] = useState('');
  const [sttSummarySearch, setSttSummarySearch] = useState('');
  
  // Pagination states for each tab
  const [usersPagination, setUsersPagination] = useState({ page: 1, pageSize: 15, total: 0, pages: 0 });
  const [loginLogsPagination, setLoginLogsPagination] = useState({ page: 1, pageSize: 15, total: 0, pages: 0 });
  const [sttSummaryPagination, setSttSummaryPagination] = useState({ page: 1, pageSize: 15, total: 0, pages: 0 });
  const [sttLogsPagination, setSttLogsPagination] = useState({ page: 1, pageSize: 15, total: 0, pages: 0 });

  // Error monitoring state
  const [errorPage, setErrorPage] = useState(1);
  const [errorPageSize] = useState(50);
  const [errorFilters, setErrorFilters] = useState({
    whereFrom: null,
    startDate: null,
    endDate: null,
    traceId: null,
  });
  const [selectedTraceId, setSelectedTraceId] = useState(null);
  const [errorRefreshKey, setErrorRefreshKey] = useState(0);
  
  // Fetch error events using hook (always call hooks, but only fetch when tab is active)
  const { errors: errorEvents, total: errorTotal, loading: errorLoading, error: errorError } = useErrorEvents({
    page: errorPage,
    pageSize: errorPageSize,
    filters: errorFilters,
    enabled: activeTab === 'errors', // Only fetch when errors tab is active
    refreshKey: errorRefreshKey, // Add refresh key to force refetch
  });

  // Default avatar generator
  const getDefaultAvatar = (name) => 
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=random&size=64`;

  const fetchUsers = async (page = 1, pageSize = usersPagination.pageSize, search = usersSearch) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authService.getUsers(tokens.access_token, page, pageSize, search);
      setUsers(data.users);
      setUsersPagination({
        page: data.pagination.page,
        pageSize: pageSize,
        total: data.pagination.total,
        pages: data.pagination.pages
      });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchLoginLogs = async (page = 1, pageSize = loginLogsPagination.pageSize, search = loginLogsSearch) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authService.getLoginLogs(tokens.access_token, pageSize, page, null, search);
      setLoginLogs(data.logs);
      setLoginLogsPagination({
        page: data.page,
        pageSize: data.page_size,
        total: data.total,
        pages: data.pages
      });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to fetch login logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchSttSummary = async (page = 1, pageSize = sttSummaryPagination.pageSize, search = sttSummarySearch) => {
    setLoading(true);
    setError(null);
    setSelectedUserId(null);
    try {
      const data = await authService.getSttLogsSummary(tokens.access_token, pageSize, page, search);
      setSttSummary(data.summaries);
      setSttSummaryPagination({
        page: data.page,
        pageSize: data.page_size,
        total: data.total,
        pages: data.pages
      });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to fetch STT summary');
    } finally {
      setLoading(false);
    }
  };

  const fetchSttLogsForUser = async (userId, page = 1, pageSize = sttLogsPagination.pageSize) => {
    setLoading(true);
    setError(null);
    setSelectedUserId(userId);
    try {
      const data = await authService.getSttLogs(tokens.access_token, pageSize, userId, page);
      setSttLogs(data.logs);
      setSttLogsPagination({
        page: data.page,
        pageSize: data.page_size,
        total: data.total,
        pages: data.pages
      });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to fetch STT logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchHealthCheck = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await authService.getHealthCheck();
      setHealthData(data);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to fetch health check');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (userId) => {
    setTogglingUserId(userId);
    setError(null);
    try {
      const result = await authService.toggleUserActive(tokens.access_token, userId);
      // Update user in local state
      setUsers(users.map(u => 
        u.id === userId ? { ...u, is_active: result.user.is_active } : u
      ));
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to toggle user status');
    } finally {
      setTogglingUserId(null);
    }
  };

  const handleChangeUserLevel = async (userId, newLevel) => {
    if (!window.confirm(`Are you sure you want to change this user's level to ${newLevel}?`)) {
      return;
    }
    
    setChangingLevelUserId(userId);
    setError(null);
    try {
      const result = await authService.updateUserLevel(tokens.access_token, userId, newLevel);
      // Update user in local state
      setUsers(users.map(u => 
        u.id === userId ? { 
          ...u, 
          user_level: result.user.user_level,
          is_approved: result.user.is_approved,
          approved_at: result.user.approved_at
        } : u
      ));
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to change user level');
    } finally {
      setChangingLevelUserId(null);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'logs') {
      fetchLoginLogs();
    } else if (activeTab === 'stt') {
      fetchSttSummary();
    } else if (activeTab === 'health') {
      fetchHealthCheck();
    }
    // Error monitoring tab uses the useErrorEvents hook, no fetch needed here
  }, [activeTab]);

  // Fetch health check on initial load if health tab is active
  useEffect(() => {
    if (activeTab === 'health' && !healthData && !loading) {
      fetchHealthCheck();
    }
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0s';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const LANGUAGE_NAMES = {
    en: 'English',
    ko: '한국어',
    zh: '中文',
    ja: '日本語',
    es: 'Español',
    fr: 'Français',
    de: 'Deutsch',
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">
          Admin Dashboard
        </h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'users'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('approvals')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'approvals'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            User Approvals
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'logs'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Login Logs
          </button>
          <button
            onClick={() => setActiveTab('stt')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'stt'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            STT Usage
          </button>
          <button
            onClick={() => setActiveTab('health')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'health'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Health Check
          </button>
          <button
            onClick={() => setActiveTab('errors')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'errors'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Error Monitoring
          </button>
          <button
            onClick={() => setActiveTab('usage')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'usage'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Usage Monitoring
          </button>
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

      {/* Users Tab */}
      {!loading && activeTab === 'users' && (
        <div className="min-h-[400px]">
          {/* Status Explanation */}
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Understanding User Statuses
            </h3>
            <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <p><strong>Account Status (Active/Inactive):</strong> Controls whether the user can log in to the system.</p>
              <p><strong>Approval Status (Approved/Pending):</strong> Controls whether the user can access features like translation, STT, and dictionary.</p>
              <p className="mt-2 text-xs">
                💡 A user can be <strong>Active + Pending</strong> (can login but cannot use features) or <strong>Inactive + Approved</strong> (cannot login even if approved).
              </p>
            </div>
          </div>

          {/* Search and Page Size Controls */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              {/* Search Box */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search by email or name..."
                  value={usersSearch}
                  onChange={(e) => {
                    setUsersSearch(e.target.value);
                    setUsersPagination(prev => ({ ...prev, page: 1 }));
                    fetchUsers(1, usersPagination.pageSize, e.target.value);
                  }}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                />
              </div>
              
              {/* Page Size Selector */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Show:</label>
                <select
                  value={usersPagination.pageSize}
                  onChange={(e) => {
                    const newPageSize = parseInt(e.target.value);
                    setUsersPagination(prev => ({ ...prev, pageSize: newPageSize, page: 1 }));
                    fetchUsers(1, newPageSize, usersSearch);
                  }}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="10">10</option>
                  <option value="15">15</option>
                  <option value="20">20</option>
                  <option value="30">30</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
                <span className="text-sm text-gray-600">per page</span>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Total {usersPagination.total} users
            </p>
          </div>

          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="w-full border-collapse table-fixed">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-16">ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-48">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-32">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-24">Level</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-24">Approved</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-20">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-40">Joined</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-40">Last Login</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                ) : users.map((user) => {
                  const isCurrentUser = currentUser?.email === user.email;
                  const isAdminUser = user.email === ADMIN_USER;
                  const canToggle = !isCurrentUser && !isAdminUser;
                  const canChangeLevel = !isCurrentUser && !isAdminUser;
                  
                  return (
                    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600">{user.id}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{user.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <img 
                            src={user.avatar_url || getDefaultAvatar(user.name)} 
                            alt="" 
                            className="w-6 h-6 rounded-full"
                            referrerPolicy="no-referrer"
                            onError={(e) => { e.target.src = getDefaultAvatar(user.name); }}
                          />
                          {user.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {canChangeLevel && changingLevelUserId !== user.id ? (
                          <select
                            value={user.user_level || 'guest'}
                            onChange={(e) => handleChangeUserLevel(user.id, e.target.value)}
                            className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="guest">Guest</option>
                            <option value="pro">Pro</option>
                            <option value="pro_plus">Pro Plus</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.user_level === 'admin' ? 'bg-purple-100 text-purple-700' :
                            user.user_level === 'pro_plus' ? 'bg-blue-100 text-blue-700' :
                            user.user_level === 'pro' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {changingLevelUserId === user.id ? (
                              <span className="flex items-center gap-1">
                                <span className="animate-spin w-3 h-3 border border-current border-t-transparent rounded-full" />
                                Updating...
                              </span>
                            ) : (
                              user.user_level === 'pro_plus' ? 'Pro Plus' :
                              user.user_level === 'pro' ? 'Pro' :
                              user.user_level === 'admin' ? 'Admin' :
                              'Guest'
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          user.is_approved 
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {user.is_approved ? 'Yes' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          user.is_active 
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(user.created_at)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(user.last_login_at)}</td>
                      <td className="px-4 py-3 text-sm">
                        {canToggle ? (
                          <button
                            onClick={() => handleToggleActive(user.id)}
                            disabled={togglingUserId === user.id}
                            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                              user.is_active
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {togglingUserId === user.id ? (
                              <span className="flex items-center gap-1">
                                <span className="animate-spin w-3 h-3 border border-current border-t-transparent rounded-full" />
                                Processing
                              </span>
                            ) : user.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Buttons */}
          {usersPagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => fetchUsers(usersPagination.page - 1, usersPagination.pageSize)}
                disabled={usersPagination.page <= 1}
                className={`px-3 py-1 rounded text-sm ${
                  usersPagination.page > 1
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {usersPagination.page} of {usersPagination.pages}
              </span>
              <button
                onClick={() => fetchUsers(usersPagination.page + 1, usersPagination.pageSize)}
                disabled={usersPagination.page >= usersPagination.pages}
                className={`px-3 py-1 rounded text-sm ${
                  usersPagination.page < usersPagination.pages
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Login Logs Tab */}
      {!loading && activeTab === 'logs' && (
        <div className="min-h-[400px]">
          {/* Search and Page Size Controls */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              {/* Search Box */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search by email or name..."
                  value={loginLogsSearch}
                  onChange={(e) => {
                    setLoginLogsSearch(e.target.value);
                    setLoginLogsPagination(prev => ({ ...prev, page: 1 }));
                    fetchLoginLogs(1, loginLogsPagination.pageSize, e.target.value);
                  }}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                />
              </div>
              
              {/* Page Size Selector */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Show:</label>
                <select
                  value={loginLogsPagination.pageSize}
                  onChange={(e) => {
                    const newPageSize = parseInt(e.target.value);
                    setLoginLogsPagination(prev => ({ ...prev, pageSize: newPageSize, page: 1 }));
                    fetchLoginLogs(1, newPageSize, loginLogsSearch);
                  }}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="10">10</option>
                  <option value="15">15</option>
                  <option value="20">20</option>
                  <option value="30">30</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
                <span className="text-sm text-gray-600">per page</span>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Total {loginLogsPagination.total} login logs
            </p>
          </div>

          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="w-full border-collapse table-fixed">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-16">ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-48">User</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-28">IP Address</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">User Agent</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-44">Login Time</th>
                </tr>
              </thead>
              <tbody>
                {loginLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                      No login logs found
                    </td>
                  </tr>
                ) : loginLogs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600">{log.id}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{log.user_name || '-'}</div>
                        <div className="text-xs text-gray-500">{log.user_email}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{log.ip_address || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate" title={log.user_agent}>
                      {log.user_agent || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(log.login_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Buttons */}
          {loginLogsPagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => fetchLoginLogs(loginLogsPagination.page - 1, loginLogsPagination.pageSize)}
                disabled={loginLogsPagination.page <= 1}
                className={`px-3 py-1 rounded text-sm ${
                  loginLogsPagination.page > 1
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {loginLogsPagination.page} of {loginLogsPagination.pages}
              </span>
              <button
                onClick={() => fetchLoginLogs(loginLogsPagination.page + 1, loginLogsPagination.pageSize)}
                disabled={loginLogsPagination.page >= loginLogsPagination.pages}
                className={`px-3 py-1 rounded text-sm ${
                  loginLogsPagination.page < loginLogsPagination.pages
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* STT Usage Tab */}
      {!loading && activeTab === 'stt' && (
        <div className="min-h-[400px]">
          {/* Back button when viewing user details */}
          {selectedUserId && (
            <button
              onClick={() => {
                setSttSummaryPagination({ page: 1, pageSize: 15, total: 0, pages: 0 });
                fetchSttSummary(1, 15);
              }}
              className="mb-4 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center gap-1"
            >
              ← Back to List
            </button>
          )}

          {/* Summary view */}
          {!selectedUserId && (
            <>
              {/* Search and Page Size Controls */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  {/* Search Box */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Search by email or name..."
                      value={sttSummarySearch}
                      onChange={(e) => {
                        setSttSummarySearch(e.target.value);
                        setSttSummaryPagination(prev => ({ ...prev, page: 1 }));
                        fetchSttSummary(1, sttSummaryPagination.pageSize, e.target.value);
                      }}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                    />
                  </div>
                  
                  {/* Page Size Selector */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Show:</label>
                    <select
                      value={sttSummaryPagination.pageSize}
                      onChange={(e) => {
                        const newPageSize = parseInt(e.target.value);
                        setSttSummaryPagination(prev => ({ ...prev, pageSize: newPageSize, page: 1 }));
                        fetchSttSummary(1, newPageSize, sttSummarySearch);
                      }}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="10">10</option>
                      <option value="15">15</option>
                      <option value="20">20</option>
                      <option value="30">30</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </select>
                    <span className="text-sm text-gray-600">per page</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  Total {sttSummaryPagination.total} users
                </p>
              </div>

              <div className="overflow-x-auto bg-white rounded-lg shadow">
                <table className="w-full border-collapse table-fixed">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-48">User</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-36">Total Duration</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-28">Total Words</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-24">Sessions</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-24">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sttSummary.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                          No STT usage records found
                        </td>
                      </tr>
                    ) : sttSummary.map((summary) => (
                      <tr key={summary.user_id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <div className="flex items-center gap-2">
                            <img 
                              src={summary.avatar_url || getDefaultAvatar(summary.user_name)} 
                              alt="" 
                              className="w-6 h-6 rounded-full"
                              referrerPolicy="no-referrer"
                              onError={(e) => { e.target.src = getDefaultAvatar(summary.user_name); }}
                            />
                            <div>
                              <div className="font-medium">{summary.user_name || '-'}</div>
                              <div className="text-xs text-gray-500">{summary.user_email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{formatDuration(summary.total_duration_seconds)}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{summary.total_word_count.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{summary.session_count}</td>
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={() => {
                              setSttLogsPagination({ page: 1, pageSize: 15, total: 0, pages: 0 });
                              fetchSttLogsForUser(summary.user_id, 1, 15);
                            }}
                            className="px-3 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Buttons */}
              {sttSummaryPagination.pages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <button
                    onClick={() => fetchSttSummary(sttSummaryPagination.page - 1, sttSummaryPagination.pageSize)}
                    disabled={sttSummaryPagination.page <= 1}
                    className={`px-3 py-1 rounded text-sm ${
                      sttSummaryPagination.page > 1
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {sttSummaryPagination.page} of {sttSummaryPagination.pages}
                  </span>
                  <button
                    onClick={() => fetchSttSummary(sttSummaryPagination.page + 1, sttSummaryPagination.pageSize)}
                    disabled={sttSummaryPagination.page >= sttSummaryPagination.pages}
                    className={`px-3 py-1 rounded text-sm ${
                      sttSummaryPagination.page < sttSummaryPagination.pages
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}

          {/* Detail view for specific user */}
          {selectedUserId && (
            <>
              {/* Page Size Selector */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Show:</label>
                  <select
                    value={sttLogsPagination.pageSize}
                    onChange={(e) => {
                      const newPageSize = parseInt(e.target.value);
                      setSttLogsPagination(prev => ({ ...prev, pageSize: newPageSize, page: 1 }));
                      fetchSttLogsForUser(selectedUserId, 1, newPageSize);
                    }}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="10">10</option>
                    <option value="15">15</option>
                    <option value="20">20</option>
                    <option value="30">30</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                  <span className="text-sm text-gray-600">per page</span>
                </div>
                <p className="text-sm text-gray-600">
                  Total {sttLogsPagination.total} usage records
                </p>
              </div>

              <div className="overflow-x-auto bg-white rounded-lg shadow">
                <table className="w-full border-collapse table-fixed">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-16">ID</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-24">Language</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-32">Duration</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-24">Words</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-28">IP Address</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-44">Recorded At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sttLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                          No STT usage records for this user
                        </td>
                      </tr>
                    ) : sttLogs.map((log) => (
                      <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-600">{log.id}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <span className="px-2 py-1 rounded bg-gray-100 text-xs">
                            {LANGUAGE_NAMES[log.language] || log.language}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{formatDuration(log.duration_seconds)}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{log.word_count.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{log.ip_address || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{formatDate(log.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Buttons */}
              {sttLogsPagination.pages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <button
                    onClick={() => fetchSttLogsForUser(selectedUserId, sttLogsPagination.page - 1, sttLogsPagination.pageSize)}
                    disabled={sttLogsPagination.page <= 1}
                    className={`px-3 py-1 rounded text-sm ${
                      sttLogsPagination.page > 1
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {sttLogsPagination.page} of {sttLogsPagination.pages}
                  </span>
                  <button
                    onClick={() => fetchSttLogsForUser(selectedUserId, sttLogsPagination.page + 1, sttLogsPagination.pageSize)}
                    disabled={sttLogsPagination.page >= sttLogsPagination.pages}
                    className={`px-3 py-1 rounded text-sm ${
                      sttLogsPagination.page < sttLogsPagination.pages
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Health Check Tab */}
      {activeTab === 'health' && (
        <HealthCheckPanel 
          healthData={healthData}
          onRefresh={fetchHealthCheck}
          loading={loading}
        />
      )}

      {/* Error Monitoring Tab */}
      {activeTab === 'errors' && (
        <div className="min-h-[400px]">
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
                    Trigger a test error to verify that the error tracking system is working properly.
                    The error will appear in the list below within a few seconds.
                  </p>
                  <TestErrorButton onSuccess={(traceId) => {
                    console.log('Test error triggered with trace ID:', traceId);
                    // Refresh error list after 1 second to allow backend to process
                    setTimeout(() => {
                      setErrorRefreshKey(prev => prev + 1);
                    }, 1000);
                  }} />
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <ErrorFilters
            onFilterChange={(newFilters) => {
              setErrorFilters(newFilters);
              setErrorPage(1); // Reset to first page when filters change
            }}
            initialFilters={errorFilters}
          />

          {/* Error State */}
          {errorError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-700">
                Failed to load errors: {errorError.message}
              </p>
            </div>
          )}

          {/* Stats */}
          {!errorLoading && !errorError && (
            <div className="mb-4 text-sm text-gray-600">
              Showing {errorEvents.length} of {errorTotal}
              {errorFilters.whereFrom && ` (filtered by ${errorFilters.whereFrom})`}
            </div>
          )}

          {/* Error Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
            <ErrorTable
              errors={errorEvents}
              onTraceIdClick={(traceId) => setSelectedTraceId(traceId)}
              loading={errorLoading}
            />
          </div>

          {/* Pagination */}
          {!errorLoading && !errorError && Math.ceil(errorTotal / errorPageSize) > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Page {errorPage} of {Math.ceil(errorTotal / errorPageSize)}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setErrorPage(errorPage - 1)}
                  disabled={errorPage <= 1}
                  className={`px-4 py-2 rounded-md font-medium ${
                    errorPage > 1
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Previous
                </button>
                <button
                  onClick={() => setErrorPage(errorPage + 1)}
                  disabled={errorPage >= Math.ceil(errorTotal / errorPageSize)}
                  className={`px-4 py-2 rounded-md font-medium ${
                    errorPage < Math.ceil(errorTotal / errorPageSize)
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
            onClose={() => setSelectedTraceId(null)}
          />
        </div>
      )}

      {/* Usage Monitoring Tab */}
      {activeTab === 'usage' && (
        <UsageMonitoringPanel />
      )}

      {/* User Approvals Tab */}
      {activeTab === 'approvals' && (
        <PendingUsersPanel />
      )}
    </div>
    </div>
  );
}
