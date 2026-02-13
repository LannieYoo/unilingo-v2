/**
 * PendingUsersPanel component
 * Admin panel for approving pending users
 */
import { useState, useEffect } from 'react';
import { useAuthStore } from '../../auth/_05_stores';
import { approvalService } from '../../../common/services/approvalService';

export function PendingUsersPanel() {
  const { tokens } = useAuthStore();
  const [pendingUsers, setPendingUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Load pending users
  useEffect(() => {
    loadPendingUsers();
  }, []);

  const loadPendingUsers = async () => {
    if (!tokens?.access_token) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await approvalService.getPendingUsers(tokens.access_token);
      setPendingUsers(data.users || []);
    } catch (err) {
      console.error('Failed to load pending users:', err);
      setError('Failed to load pending users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveUser = async (userId) => {
    if (!tokens?.access_token) return;

    try {
      await approvalService.approveUser(tokens.access_token, userId);
      setSuccessMessage('User approved successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
      
      // Reload pending users
      await loadPendingUsers();
      
      // Clear selection
      setSelectedUsers(new Set());
    } catch (err) {
      console.error('Failed to approve user:', err);
      setError('Failed to approve user');
    }
  };

  const handleBulkApprove = async () => {
    if (!tokens?.access_token || selectedUsers.size === 0) return;

    try {
      const userIds = Array.from(selectedUsers);
      const response = await approvalService.bulkApproveUsers(tokens.access_token, userIds);
      setSuccessMessage(`Successfully approved ${response.data.approvedCount} users`);
      setTimeout(() => setSuccessMessage(''), 3000);
      
      // Reload pending users
      await loadPendingUsers();
      
      // Clear selection
      setSelectedUsers(new Set());
    } catch (err) {
      console.error('Failed to bulk approve users:', err);
      setError('Failed to bulk approve users');
    }
  };

  const toggleUserSelection = (userId) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === pendingUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(pendingUsers.map(u => u.id)));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading pending users...</span>
      </div>
    );
  }

  return (
    <div className="pending-users-panel">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Pending User Approvals ({pendingUsers.length})
        </h3>
        {selectedUsers.size > 0 && (
          <button
            onClick={handleBulkApprove}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
          >
            Approve Selected ({selectedUsers.size})
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md text-green-700 dark:text-green-300">
          {successMessage}
        </div>
      )}

      {pendingUsers.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <span className="material-symbols-outlined text-4xl text-gray-400 mb-2">check_circle</span>
          <p className="text-gray-600 dark:text-gray-400">No pending users</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.size === pendingUsers.length && pendingUsers.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  User Level
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Registered
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {pendingUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedUsers.has(user.id)}
                      onChange={() => toggleUserSelection(user.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {user.email}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {user.name}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      {user.userLevel.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <button
                      onClick={() => handleApproveUser(user.id)}
                      className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors text-xs"
                    >
                      Approve
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default PendingUsersPanel;
