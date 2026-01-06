/**
 * ActionButton Component
 * 액션 버튼 컴포넌트
 */

export function ActionButton({ 
  children, 
  onClick, 
  disabled = false, 
  variant = 'default',
  className = '',
  ...props 
}) {
  const getClassName = () => {
    const classes = ['stt-stream-btn']
    
    switch (variant) {
      case 'primary':
        classes.push('primary')
        break
      case 'secondary':
        classes.push('secondary')
        break
      case 'recording':
        classes.push('recording')
        break
      case 'debug':
        classes.push('debug')
        break
      default:
        break
    }
    
    if (className) {
      classes.push(className)
    }
    
    return classes.join(' ')
  }

  return (
    <button
      className={getClassName()}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}

export default ActionButton
