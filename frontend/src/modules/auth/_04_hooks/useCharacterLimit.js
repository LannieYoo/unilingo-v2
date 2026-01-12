/**
 * useCharacterLimit hook - Character counting and limit check.
 */
import { useState, useCallback, useMemo } from 'react';
import { useAuthStore } from '../_05_stores';
import { MAX_CHARS_GUEST } from '../_08_constants';

export function useCharacterLimit(initialText = '') {
  const { isAuthenticated } = useAuthStore();
  const [text, setText] = useState(initialText);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Current character count
  const charCount = useMemo(() => text.length, [text]);

  // Check if limit is reached (only for guests)
  const isLimitReached = useMemo(() => {
    if (isAuthenticated) return false;
    return charCount >= MAX_CHARS_GUEST;
  }, [isAuthenticated, charCount]);

  // Remaining characters (only for guests)
  const remainingChars = useMemo(() => {
    if (isAuthenticated) return Infinity;
    return Math.max(0, MAX_CHARS_GUEST - charCount);
  }, [isAuthenticated, charCount]);

  // Progress percentage (0-100)
  const progressPercent = useMemo(() => {
    if (isAuthenticated) return 0;
    return Math.min(100, (charCount / MAX_CHARS_GUEST) * 100);
  }, [isAuthenticated, charCount]);

  // Append text with limit check
  const appendText = useCallback((newText) => {
    setText((prev) => {
      const combined = prev + newText;
      
      // If authenticated, no limit
      if (isAuthenticated) {
        return combined;
      }
      
      // Check if would exceed limit
      if (combined.length > MAX_CHARS_GUEST) {
        // Truncate to limit and show modal
        setShowLoginModal(true);
        return combined.slice(0, MAX_CHARS_GUEST);
      }
      
      return combined;
    });
  }, [isAuthenticated]);

  // Set text directly
  const setTextValue = useCallback((newText) => {
    if (!isAuthenticated && newText.length > MAX_CHARS_GUEST) {
      setText(newText.slice(0, MAX_CHARS_GUEST));
      setShowLoginModal(true);
    } else {
      setText(newText);
    }
  }, [isAuthenticated]);

  // Clear text
  const clearText = useCallback(() => {
    setText('');
    setShowLoginModal(false);
  }, []);

  // Close login modal
  const closeLoginModal = useCallback(() => {
    setShowLoginModal(false);
  }, []);

  return {
    text,
    charCount,
    isLimitReached,
    remainingChars,
    progressPercent,
    maxChars: isAuthenticated ? Infinity : MAX_CHARS_GUEST,
    showLoginModal,
    appendText,
    setText: setTextValue,
    clearText,
    closeLoginModal,
  };
}

export default useCharacterLimit;
