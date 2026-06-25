import { apiFetch } from '../../../common/api';

/**
 * Save CELPIP test log
 * @param {string} testId
 * @param {number} score
 * @param {object} answers
 */
export async function saveCelpipTestLog(testId, score, answers) {
  try {
    const response = await apiFetch('/api/auth/celpip_logs', {
      method: 'POST',
      body: JSON.stringify({ test_id: testId, score, answers })
    });
    return response.data;
  } catch (error) {
    console.error('Error saving CELPIP log:', error);
    throw error;
  }
}

/**
 * Fetch CELPIP test logs for the current user
 */
export async function getCelpipTestLogs() {
  try {
    const response = await apiFetch('/api/auth/celpip_logs', {
      method: 'GET'
    });
    return response.data?.logs || [];
  } catch (error) {
    console.error('Error fetching CELPIP logs:', error);
    return [];
  }
}
