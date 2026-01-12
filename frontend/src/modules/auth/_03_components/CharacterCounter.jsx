/**
 * Character Counter component - Shows current character count.
 */
import { useAuthStore } from '../_05_stores';
import { MAX_CHARS_GUEST } from '../_08_constants';

export function CharacterCounter({ charCount, className = '' }) {
  const { isAuthenticated } = useAuthStore();

  // Don't show for authenticated users
  if (isAuthenticated) {
    return (
      <div
        className={`character-counter ${className}`}
        style={{
          fontSize: '12px',
          color: '#666',
        }}
      >
        {charCount.toLocaleString()} characters
      </div>
    );
  }

  const remaining = MAX_CHARS_GUEST - charCount;
  const progressPercent = Math.min(100, (charCount / MAX_CHARS_GUEST) * 100);
  
  // Color based on progress
  let color = '#4caf50'; // Green
  if (progressPercent >= 90) {
    color = '#f44336'; // Red
  } else if (progressPercent >= 70) {
    color = '#ff9800'; // Orange
  }

  return (
    <div
      className={`character-counter ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '12px',
        }}
      >
        <span style={{ color: '#666' }}>
          {charCount.toLocaleString()} / {MAX_CHARS_GUEST.toLocaleString()}
        </span>
        <span style={{ color }}>
          {remaining > 0 ? `${remaining.toLocaleString()} remaining` : 'Limit reached'}
        </span>
      </div>
      
      <div
        style={{
          width: '100%',
          height: '4px',
          backgroundColor: '#e0e0e0',
          borderRadius: '2px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${progressPercent}%`,
            height: '100%',
            backgroundColor: color,
            transition: 'width 0.2s, background-color 0.2s',
          }}
        />
      </div>
    </div>
  );
}

export default CharacterCounter;
