/**
 * Error Events Hook
 * Hook for fetching and managing error events
 */

import { useState, useEffect } from 'react';
import { getErrorEvents, getErrorEventsByTraceId } from '../_06_services/errorService.js';
import { useAuthStore } from '../../auth';

/**
 * Hook for fetching error events with pagination and filters
 * 
 * @param {Object} options - Query options
 * @param {number} options.page - Page number
 * @param {number} options.pageSize - Page size
 * @param {Object} options.filters - Filters
 * @param {'frontend' | 'backend' | null} options.filters.whereFrom - Filter by source
 * @param {string | null} options.filters.startDate - Start date
 * @param {string | null} options.filters.endDate - End date
 * @param {boolean} options.enabled - Whether to fetch data (default: true)
 * @param {number} options.refreshKey - Key to force refetch (optional)
 * @returns {Object} Hook state
 */
export function useErrorEvents(options = {}) {
  const { page = 1, pageSize = 100, filters = {}, enabled = true, refreshKey = 0 } = options;
  const { tokens } = useAuthStore();
  
  const [errors, setErrors] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [traceId, setTraceId] = useState(null);
  
  useEffect(() => {
    // Skip fetching if disabled or no token
    if (!enabled || !tokens?.access_token) {
      return;
    }
    
    const fetchErrors = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await getErrorEvents(tokens.access_token, {
          page,
          pageSize,
          whereFrom: filters.whereFrom,
          startDate: filters.startDate,
          endDate: filters.endDate,
        });
        
        setErrors(response.data.data || []);
        setTotal(response.data.total || 0);
        setTraceId(response.traceId);
      } catch (err) {
        setError(err);
        console.error('Failed to fetch error events:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchErrors();
  }, [enabled, tokens?.access_token, page, pageSize, filters.whereFrom, filters.startDate, filters.endDate, refreshKey]);
  
  return {
    errors,
    total,
    loading,
    error,
    traceId,
  };
}

/**
 * Hook for fetching error events by trace ID
 * 
 * @param {string | null} traceId - Trace ID to search for
 * @returns {Object} Hook state
 */
export function useErrorByTraceId(traceId) {
  const { tokens } = useAuthStore();
  
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [responseTraceId, setResponseTraceId] = useState(null);
  
  useEffect(() => {
    if (!tokens?.access_token || !traceId) {
      setEvents([]);
      return;
    }
    
    const fetchEvents = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await getErrorEventsByTraceId(tokens.access_token, traceId);
        
        setEvents(response.data || []);
        setResponseTraceId(response.traceId);
      } catch (err) {
        setError(err);
        console.error('Failed to fetch error events by trace ID:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEvents();
  }, [tokens?.access_token, traceId]);
  
  return {
    events,
    loading,
    error,
    traceId: responseTraceId,
  };
}

export default {
  useErrorEvents,
  useErrorByTraceId,
};
