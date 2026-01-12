/**
 * Admin View - Users and Login Logs management.
 */
import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore, authService, ADMIN_USER } from '../../auth';

export default function AdminView() {
  const { isAuthenticated, isAdmin, tokens, user: currentUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [loginLogs, setLoginLogs] = useState([]);
  const [sttSummary, setSttSummary] = useState([]);
  const [sttLogs, setSttLogs] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [togglingUserId, setTogglingUserId] = useState(null);

  // Default avatar generator
  const getDefaultAvatar = (name) => 
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=random&size=64`;

  // Redirect if not admin
  if (!isAuthenticated || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  const fetchUsers = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authService.getUsers(tokens.access_token, page, pagination.limit);
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchLoginLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await authService.getLoginLogs(tokens.access_token, 100);
      setLoginLogs(data.logs);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to fetch login logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchSttSummary = async () => {
    setLoading(true);
    setError(null);
    setSelectedUserId(null);
    try {
      const data = await authService.getSttLogsSummary(tokens.access_token);
      setSttSummary(data.summaries);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to fetch STT summary');
    } finally {
      setLoading(false);
    }
  };

  const fetchSttLogsForUser = async (userId) => {
    setLoading(true);
    setError(null);
    setSelectedUserId(userId);
    try {
      const data = await authService.getSttLogs(tokens.access_token, 100, userId);
      setSttLogs(data.logs);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to fetch STT logs');
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

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'logs') {
      fetchLoginLogs();
    } else if (activeTab === 'stt') {
      fetchSttSummary();
    }
  }, [activeTab]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('ko-KR');
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0초';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}시간 ${minutes}분 ${secs}초`;
    } else if (minutes > 0) {
      return `${minutes}분 ${secs}초`;
    }
    return `${secs}초`;
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
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-text-light dark:text-text-dark">
        관리자 페이지
      </h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border-light dark:border-border-dark">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'users'
              ? 'text-primary border-b-2 border-primary'
              : 'text-text-muted-light dark:text-text-muted-dark hover:text-text-light dark:hover:text-text-dark'
          }`}
        >
          회원 목록
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'logs'
              ? 'text-primary border-b-2 border-primary'
              : 'text-text-muted-light dark:text-text-muted-dark hover:text-text-light dark:hover:text-text-dark'
          }`}
        >
          로그인 기록
        </button>
        <button
          onClick={() => setActiveTab('stt')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'stt'
              ? 'text-primary border-b-2 border-primary'
              : 'text-text-muted-light dark:text-text-muted-dark hover:text-text-light dark:hover:text-text-dark'
          }`}
        >
          STT 사용 기록
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      )}

      {/* Users Tab */}
      {!loading && activeTab === 'users' && (
        <div className="min-h-[400px]">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse table-fixed">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-text-light dark:text-text-dark w-16">ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-text-light dark:text-text-dark w-48">이메일</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-text-light dark:text-text-dark w-32">이름</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-text-light dark:text-text-dark w-20">상태</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-text-light dark:text-text-dark w-40">가입일</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-text-light dark:text-text-dark w-40">최근 로그인</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-text-light dark:text-text-dark w-24">관리</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-text-muted-light dark:text-text-muted-dark">
                      등록된 회원이 없습니다.
                    </td>
                  </tr>
                ) : users.map((user) => {
                  const isCurrentUser = currentUser?.email === user.email;
                  const isAdminUser = user.email === ADMIN_USER;
                  const canToggle = !isCurrentUser && !isAdminUser;
                  
                  return (
                    <tr key={user.id} className="border-b border-border-light dark:border-border-dark hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3 text-sm text-text-muted-light dark:text-text-muted-dark">{user.id}</td>
                      <td className="px-4 py-3 text-sm text-text-light dark:text-text-dark">{user.email}</td>
                      <td className="px-4 py-3 text-sm text-text-light dark:text-text-dark">
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
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          user.is_active 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                        }`}>
                          {user.is_active ? '활성' : '비활성'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-muted-light dark:text-text-muted-dark">{formatDate(user.created_at)}</td>
                      <td className="px-4 py-3 text-sm text-text-muted-light dark:text-text-muted-dark">{formatDate(user.last_login_at)}</td>
                      <td className="px-4 py-3 text-sm">
                        {canToggle ? (
                          <button
                            onClick={() => handleToggleActive(user.id)}
                            disabled={togglingUserId === user.id}
                            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                              user.is_active
                                ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50'
                                : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {togglingUserId === user.id ? (
                              <span className="flex items-center gap-1">
                                <span className="animate-spin w-3 h-3 border border-current border-t-transparent rounded-full" />
                                처리중
                              </span>
                            ) : user.is_active ? '비활성화' : '활성화'}
                          </button>
                        ) : (
                          <span className="text-xs text-text-muted-light dark:text-text-muted-dark">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => fetchUsers(page)}
                  className={`px-3 py-1 rounded ${
                    page === pagination.page
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-text-light dark:text-text-dark hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
          )}

          <p className="text-sm text-text-muted-light dark:text-text-muted-dark mt-4">
            총 {pagination.total}명의 회원
          </p>
        </div>
      )}

      {/* Login Logs Tab */}
      {!loading && activeTab === 'logs' && (
        <div className="min-h-[400px]">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse table-fixed">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-text-light dark:text-text-dark w-16">ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-text-light dark:text-text-dark w-48">사용자</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-text-light dark:text-text-dark w-28">IP 주소</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-text-light dark:text-text-dark">User Agent</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-text-light dark:text-text-dark w-44">로그인 시간</th>
                </tr>
              </thead>
              <tbody>
                {loginLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-text-muted-light dark:text-text-muted-dark">
                      로그인 기록이 없습니다.
                    </td>
                  </tr>
                ) : loginLogs.map((log) => (
                  <tr key={log.id} className="border-b border-border-light dark:border-border-dark hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 text-sm text-text-muted-light dark:text-text-muted-dark">{log.id}</td>
                    <td className="px-4 py-3 text-sm text-text-light dark:text-text-dark">
                      <div>
                        <div className="font-medium">{log.user_name || '-'}</div>
                        <div className="text-xs text-text-muted-light dark:text-text-muted-dark">{log.user_email}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted-light dark:text-text-muted-dark">{log.ip_address || '-'}</td>
                    <td className="px-4 py-3 text-sm text-text-muted-light dark:text-text-muted-dark max-w-xs truncate" title={log.user_agent}>
                      {log.user_agent || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted-light dark:text-text-muted-dark">{formatDate(log.login_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-sm text-text-muted-light dark:text-text-muted-dark mt-4">
            최근 {loginLogs.length}개의 로그인 기록
          </p>
        </div>
      )}

      {/* STT Usage Tab */}
      {!loading && activeTab === 'stt' && (
        <div className="min-h-[400px]">
          {/* Back button when viewing user details */}
          {selectedUserId && (
            <button
              onClick={() => fetchSttSummary()}
              className="mb-4 px-3 py-1 text-sm bg-slate-100 dark:bg-slate-800 text-text-light dark:text-text-dark rounded hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1"
            >
              ← 목록으로 돌아가기
            </button>
          )}

          {/* Summary view */}
          {!selectedUserId && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse table-fixed">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-text-light dark:text-text-dark w-48">사용자</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-text-light dark:text-text-dark w-36">총 사용 시간</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-text-light dark:text-text-dark w-28">총 단어 수</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-text-light dark:text-text-dark w-24">세션 수</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-text-light dark:text-text-dark w-24">상세</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sttSummary.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-text-muted-light dark:text-text-muted-dark">
                          STT 사용 기록이 없습니다.
                        </td>
                      </tr>
                    ) : sttSummary.map((summary) => (
                      <tr key={summary.user_id} className="border-b border-border-light dark:border-border-dark hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 text-sm text-text-light dark:text-text-dark">
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
                              <div className="text-xs text-text-muted-light dark:text-text-muted-dark">{summary.user_email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-text-light dark:text-text-dark">{formatDuration(summary.total_duration_seconds)}</td>
                        <td className="px-4 py-3 text-sm text-text-light dark:text-text-dark">{summary.total_word_count.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-text-light dark:text-text-dark">{summary.session_count}</td>
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={() => fetchSttLogsForUser(summary.user_id)}
                            className="px-3 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
                          >
                            상세 보기
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-sm text-text-muted-light dark:text-text-muted-dark mt-4">
                총 {sttSummary.length}명의 사용자
              </p>
            </>
          )}

          {/* Detail view for specific user */}
          {selectedUserId && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse table-fixed">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-text-light dark:text-text-dark w-16">ID</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-text-light dark:text-text-dark w-24">언어</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-text-light dark:text-text-dark w-32">사용 시간</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-text-light dark:text-text-dark w-24">단어 수</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-text-light dark:text-text-dark w-28">IP 주소</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-text-light dark:text-text-dark w-44">기록 시간</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sttLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-text-muted-light dark:text-text-muted-dark">
                          이 사용자의 STT 사용 기록이 없습니다.
                        </td>
                      </tr>
                    ) : sttLogs.map((log) => (
                      <tr key={log.id} className="border-b border-border-light dark:border-border-dark hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 text-sm text-text-muted-light dark:text-text-muted-dark">{log.id}</td>
                        <td className="px-4 py-3 text-sm text-text-light dark:text-text-dark">
                          <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-xs">
                            {LANGUAGE_NAMES[log.language] || log.language}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-text-light dark:text-text-dark">{formatDuration(log.duration_seconds)}</td>
                        <td className="px-4 py-3 text-sm text-text-light dark:text-text-dark">{log.word_count.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-text-muted-light dark:text-text-muted-dark">{log.ip_address || '-'}</td>
                        <td className="px-4 py-3 text-sm text-text-muted-light dark:text-text-muted-dark">{formatDate(log.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-sm text-text-muted-light dark:text-text-muted-dark mt-4">
                총 {sttLogs.length}개의 사용 기록
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
