/**
 * DebugPanel Component
 * 디버그 로그 표시 패널
 */

import { useEffect, useRef } from 'react'
import { useDebugStore } from '../_05_stores'
import { LOG_TYPE_COLORS } from '../_08_constants'

export function DebugPanel({ isOpen, onClose }) {
  const { logs, clear } = useDebugStore()
  const logsEndRef = useRef(null)

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '250px',
      background: '#1e1e1e',
      borderTop: '2px solid #333',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'monospace',
      fontSize: '12px',
      zIndex: 1000
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 12px',
        background: '#252525',
        borderBottom: '1px solid #333'
      }}>
        <span style={{ color: '#fff', fontWeight: 'bold' }}>Debug Panel</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={clear}
            style={{
              padding: '4px 8px',
              background: '#333',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Clear
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '4px 8px',
              background: '#333',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>
      </div>
      
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '8px'
      }}>
        {logs.length === 0 ? (
          <div style={{ color: '#666', padding: '8px' }}>No logs yet...</div>
        ) : (
          logs.map(log => (
            <div key={log.id} style={{
              padding: '4px 0',
              borderBottom: '1px solid #333',
              display: 'flex',
              gap: '8px'
            }}>
              <span style={{ color: '#666', minWidth: '80px' }}>
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span style={{ 
                color: LOG_TYPE_COLORS[log.type] || '#fff',
                minWidth: '50px',
                textTransform: 'uppercase'
              }}>
                [{log.type}]
              </span>
              <span style={{ color: '#fff' }}>{log.message}</span>
              {log.data && (
                <span style={{ color: '#888' }}>
                  {JSON.stringify(log.data)}
                </span>
              )}
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  )
}

export default DebugPanel
