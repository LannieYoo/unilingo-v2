/**
 * Settings View - User language preferences settings page.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageLayout } from '../../../components/layout/PageLayout';
import { useAuth } from '../_04_hooks';
import { useAuthStore } from '../_05_stores';
import { authService } from '../_06_services';
import './settings.css';

// Supported languages
const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ko', name: '한국어 (Korean)' },
  { code: 'zh', name: '中文 (Chinese)' },
  { code: 'ja', name: '日本語 (Japanese)' },
  { code: 'es', name: 'Español (Spanish)' },
  { code: 'fr', name: 'Français (French)' },
  { code: 'de', name: 'Deutsch (German)' },
  { code: 'pt', name: 'Português (Portuguese)' },
  { code: 'ru', name: 'Русский (Russian)' },
  { code: 'ar', name: 'العربية (Arabic)' },
  { code: 'hi', name: 'हिन्दी (Hindi)' },
  { code: 'vi', name: 'Tiếng Việt (Vietnamese)' },
  { code: 'th', name: 'ไทย (Thai)' },
  { code: 'id', name: 'Bahasa Indonesia' },
];

export function SettingsView() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { tokens } = useAuthStore();
  
  const [nativeLanguage, setNativeLanguage] = useState('en');
  const [targetLanguage, setTargetLanguage] = useState('ko');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // Load current preferences
  useEffect(() => {
    const loadPreferences = async () => {
      if (!tokens?.access_token) return;
      
      try {
        setIsLoading(true);
        const data = await authService.getLanguagePreferences(tokens.access_token);
        setNativeLanguage(data.native_language || 'en');
        setTargetLanguage(data.target_language || 'ko');
      } catch (error) {
        console.error('Failed to load language preferences:', error);
        setMessage({ type: 'error', text: 'Failed to load settings' });
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, [tokens?.access_token]);

  const handleSave = async () => {
    if (!tokens?.access_token) return;
    
    try {
      setIsSaving(true);
      setMessage({ type: '', text: '' });
      
      await authService.updateLanguagePreferences(tokens.access_token, {
        native_language: nativeLanguage,
        target_language: targetLanguage,
      });
      
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Failed to save language preferences:', error);
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <PageLayout title="Settings">
      <div className="settings-container">
        <div className="settings-card">
          <h2 className="settings-section-title">
            <span className="material-symbols-outlined">language</span>
            Language Preferences
          </h2>
          
          <p className="settings-description">
            Set your default languages for translation. These will be used as the default source and target languages across the app.
          </p>

          {isLoading ? (
            <div className="settings-loading">
              <div className="loading-spinner"></div>
              <span>Loading settings...</span>
            </div>
          ) : (
            <div className="settings-form">
              <div className="settings-field">
                <label htmlFor="native-language">
                  <span className="material-symbols-outlined">home</span>
                  Native Language
                </label>
                <p className="field-description">Your primary language (source language for translations)</p>
                <select
                  id="native-language"
                  value={nativeLanguage}
                  onChange={(e) => setNativeLanguage(e.target.value)}
                  className="settings-select"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="settings-field">
                <label htmlFor="target-language">
                  <span className="material-symbols-outlined">translate</span>
                  Target Language
                </label>
                <p className="field-description">Your preferred translation language</p>
                <select
                  id="target-language"
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="settings-select"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              {message.text && (
                <div className={`settings-message ${message.type}`}>
                  <span className="material-symbols-outlined">
                    {message.type === 'success' ? 'check_circle' : 'error'}
                  </span>
                  {message.text}
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={isSaving}
                className="settings-save-btn"
              >
                {isSaving ? (
                  <>
                    <div className="btn-spinner"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">save</span>
                    Save Settings
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

export default SettingsView;
