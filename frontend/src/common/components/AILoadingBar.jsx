/**
 * AILoadingBar
 * 
 * Shows model download/loading progress when AI models are being initialized.
 * Appears at the top of the screen as a thin animated progress bar.
 */

import { useMemo } from 'react'

const MODEL_LABELS = {
  'text2text-generation': '문법 교정 (Grammar)',
  'feature-extraction': '의미 분석 (Semantic)',
  'fill-mask': '단어 추천 (Fill-Mask)',
}

export function AILoadingBar({ modelStates }) {
  const loadingModels = useMemo(() => {
    return Object.entries(modelStates || {})
      .filter(([, state]) => state.loading)
      .map(([task, state]) => ({
        task,
        label: MODEL_LABELS[task] || task,
        progress: state.progress || 0,
      }))
  }, [modelStates])

  if (loadingModels.length === 0) return null

  return (
    <div style={styles.container}>
      {loadingModels.map(({ task, label, progress }) => (
        <div key={task} style={styles.item}>
          <div style={styles.labelRow}>
            <span style={styles.icon}>🤖</span>
            <span style={styles.label}>AI 모델 로딩: {label}</span>
            <span style={styles.percent}>{progress}%</span>
          </div>
          <div style={styles.barBackground}>
            <div
              style={{
                ...styles.barFill,
                width: `${progress}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

const styles = {
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    pointerEvents: 'none',
  },
  item: {
    padding: '6px 16px 4px',
    background: 'linear-gradient(135deg, rgba(99,102,241,0.95), rgba(139,92,246,0.95))',
    backdropFilter: 'blur(8px)',
  },
  labelRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '3px',
  },
  icon: {
    fontSize: '12px',
  },
  label: {
    flex: 1,
    fontSize: '11px',
    fontWeight: 500,
    color: '#fff',
    letterSpacing: '0.02em',
  },
  percent: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.9)',
    fontVariantNumeric: 'tabular-nums',
  },
  barBackground: {
    height: '3px',
    borderRadius: '2px',
    background: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: '2px',
    background: 'linear-gradient(90deg, #a5f3fc, #818cf8, #c084fc)',
    transition: 'width 0.3s ease',
  },
}

export default AILoadingBar
