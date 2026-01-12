/**
 * Login Modal component - Shows when character limit is reached.
 */
import { GoogleLoginButton } from './GoogleLoginButton';
import { MAX_CHARS_GUEST } from '../_08_constants';

export function LoginModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div
      className="login-modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        className="login-modal"
        style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '32px',
          maxWidth: '400px',
          width: '90%',
          textAlign: 'center',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            fontSize: '48px',
            marginBottom: '16px',
          }}
        >
          🔒
        </div>
        
        <h2
          style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#1a1a1a',
            marginBottom: '12px',
          }}
        >
          Character Limit Reached
        </h2>
        
        <p
          style={{
            fontSize: '14px',
            color: '#666',
            marginBottom: '24px',
            lineHeight: '1.5',
          }}
        >
          You've reached the {MAX_CHARS_GUEST.toLocaleString()} character limit for guest users.
          <br />
          Sign in to continue using the service without limits.
        </p>
        
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            alignItems: 'center',
          }}
        >
          <GoogleLoginButton />
          
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: 'transparent',
              border: 'none',
              color: '#666',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginModal;
