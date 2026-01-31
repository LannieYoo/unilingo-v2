# Implementation Plan: Inline Dictionary Tooltip

## Overview

This implementation plan breaks down the inline dictionary tooltip feature into incremental, testable steps. The approach follows the existing module architecture with clear separation between hooks (business logic), components (UI), and integration with existing services. Each task builds on previous work, with testing integrated throughout to catch errors early.

## Tasks

- [x] 1. Create useInlineDictionary hook with core state management
  - Create `frontend/src/modules/stt_stream/_04_hooks/useInlineDictionary.js`
  - Implement state management for: selectedWord, definition, pronunciation, isLoading, error, showTooltip, tooltipPosition
  - Implement handleWordClick function to set selected word and calculate tooltip position
  - Implement closeTooltip function to reset state
  - Add Escape key listener to close tooltip
  - _Requirements: 1.1, 1.2, 5.2_

- [x] 1.1 Write property test for word click state management
  - **Property 1: Word Click Triggers Lookup**
  - **Validates: Requirements 1.1, 7.1**

- [x] 2. Integrate dictionary API calls in useInlineDictionary hook
  - Import fetchDictionary and translateText from dictionary service
  - Implement API call logic in handleWordClick
  - Add AbortController for request cancellation
  - Handle loading state during API calls
  - Handle error states (network error, API error, no results)
  - Add 5-second timeout logic
  - _Requirements: 2.1, 2.2, 2.3, 6.2, 6.4, 6.5_

- [x] 2.1 Write property test for API parameter correctness
  - **Property 4: API Call with Correct Parameters**
  - **Validates: Requirements 2.1**

- [x] 2.2 Write property test for request cancellation
  - **Property 18: Request Cancellation on Rapid Clicks**
  - **Validates: Requirements 6.2**

- [x] 2.3 Write property test for single concurrent request
  - **Property 19: Single Concurrent Request Limit**
  - **Validates: Requirements 6.4**

- [x] 2.4 Write unit tests for error handling
  - Test network error display
  - Test API error display
  - Test no results display
  - Test timeout behavior
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 3. Add data processing logic to useInlineDictionary hook
  - Implement definition extraction from API response
  - Implement pronunciation extraction from API response
  - Implement part-of-speech priority sorting (verb, noun, adjective, adverb)
  - Limit meanings to first 3 items
  - Implement input sanitization for special characters
  - _Requirements: 2.2, 2.4, 4.4, 8.3_

- [x] 3.1 Write property test for data extraction
  - **Property 5: Data Extraction from API Response**
  - **Validates: Requirements 2.2**

- [x] 3.2 Write property test for part-of-speech priority
  - **Property 6: Part of Speech Priority**
  - **Validates: Requirements 2.4**

- [x] 3.3 Write property test for meaning count limit
  - **Property 14: Meaning Count Limit**
  - **Validates: Requirements 4.4**

- [x] 3.4 Write property test for input sanitization
  - **Property 21: Input Sanitization**
  - **Validates: Requirements 8.3**

- [x] 4. Create ClickableWord component
  - Create `frontend/src/modules/stt_stream/_03_components/ClickableWord.jsx`
  - Accept props: word, onClick, isSelected
  - Render span with word text
  - Add click handler that calls onClick with word
  - Apply hover styling (cursor pointer, underline)
  - Apply selected styling when isSelected is true
  - Prevent text selection on click (user-select: none)
  - _Requirements: 1.1, 1.2_

- [x] 4.1 Write property test for word click event
  - **Property 1: Word Click Triggers Lookup**
  - **Validates: Requirements 1.1, 7.1**

- [x] 4.2 Write property test for selected styling
  - **Property 2: Selected Word Visual Indication**
  - **Validates: Requirements 1.2**

- [x] 5. Create DictionaryTooltip component
  - Create `frontend/src/modules/stt_stream/_03_components/DictionaryTooltip.jsx`
  - Accept props: word, definition, pronunciation, position, isLoading, error, onClose
  - Render tooltip container with absolute positioning
  - Display word as header
  - Display pronunciation when available
  - Display definition in target language
  - Display loading spinner when isLoading is true
  - Display error message when error is present
  - Add close button that calls onClose
  - _Requirements: 3.1, 4.1, 4.2, 4.3_

- [x] 5.1 Write property test for tooltip display
  - **Property 8: Tooltip Display on Success**
  - **Validates: Requirements 3.1**

- [x] 5.2 Write property test for word header display
  - **Property 13: Word Header Display**
  - **Validates: Requirements 4.1**

- [x] 5.3 Write property test for definition display
  - **Property 11: Definition Display in Target Language**
  - **Validates: Requirements 3.4, 4.3**

- [x] 5.4 Write property test for pronunciation display
  - **Property 12: Pronunciation Display When Available**
  - **Validates: Requirements 3.5, 4.2**

- [x] 5.5 Write property test for loading state
  - **Property 7: Loading State Display**
  - **Validates: Requirements 2.5**

- [x] 6. Implement tooltip positioning logic
  - Add viewport boundary detection in useInlineDictionary hook
  - Calculate tooltip position from click event coordinates
  - Adjust position if tooltip would extend beyond viewport (top, bottom, left, right)
  - Ensure tooltip doesn't cover the clicked word
  - Add responsive width adjustment for narrow viewports (< 768px)
  - _Requirements: 3.2, 3.3, 7.3_

- [x] 6.1 Write property test for viewport boundary adjustment
  - **Property 9: Viewport Boundary Adjustment**
  - **Validates: Requirements 3.2**

- [x] 6.2 Write property test for word non-overlap
  - **Property 10: Tooltip Does Not Cover Word**
  - **Validates: Requirements 3.3**

- [x] 6.3 Write property test for responsive width
  - **Property 20: Responsive Tooltip Width**
  - **Validates: Requirements 7.3**

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Modify TranscriptDisplay component to integrate tooltip
  - Modify `frontend/src/modules/stt_stream/_03_components/TranscriptDisplay.jsx`
  - Import ClickableWord and DictionaryTooltip components
  - Import useInlineDictionary hook
  - Parse finalText into individual words (split by whitespace, preserve punctuation)
  - Wrap each word in ClickableWord component
  - Pass handleWordClick and selectedWord from hook to ClickableWord
  - Render DictionaryTooltip when showTooltip is true
  - Pass all tooltip props from hook to DictionaryTooltip
  - _Requirements: 1.1, 1.4_

- [x] 8.1 Write property test for non-word click rejection
  - **Property 3: Non-Word Click Rejection**
  - **Validates: Requirements 1.4**

- [x] 8.2 Write unit tests for text parsing
  - Test parsing simple sentences
  - Test parsing with punctuation
  - Test parsing with multiple spaces
  - Test parsing empty strings

- [x] 9. Implement tooltip dismissal behaviors
  - Add click-outside detection in useInlineDictionary hook
  - Close tooltip when clicking outside tooltip bounds
  - Close tooltip when clicking a different word (already handled by handleWordClick)
  - Add scroll listener to close tooltip on panel scroll
  - Ensure tooltip persists during transcription text updates
  - _Requirements: 5.1, 5.3, 5.4, 5.5_

- [x] 9.1 Write property test for click-outside behavior
  - **Property 15: Click Outside Closes Tooltip**
  - **Validates: Requirements 5.1, 7.4**

- [x] 9.2 Write property test for new word click
  - **Property 16: New Word Click Replaces Tooltip**
  - **Validates: Requirements 5.3**

- [x] 9.3 Write property test for tooltip persistence
  - **Property 17: Tooltip Persistence During Text Updates**
  - **Validates: Requirements 5.5**

- [x] 9.4 Write unit tests for dismissal behaviors
  - Test Escape key closes tooltip
  - Test scroll closes tooltip

- [x] 10. Add CSS styling for tooltip components
  - Add styles to `frontend/src/modules/stt_stream/_10_styles/stt-stream.css`
  - Style `.stt-clickable-word` (cursor pointer, hover underline)
  - Style `.stt-clickable-word-selected` (background highlight)
  - Style `.stt-dictionary-tooltip` (floating container, shadow, border)
  - Style `.stt-dictionary-tooltip-header` (word display, bold)
  - Style `.stt-dictionary-tooltip-pronunciation` (phonetic symbols, italic)
  - Style `.stt-dictionary-tooltip-definition` (definition text)
  - Style `.stt-dictionary-tooltip-loading` (spinner animation)
  - Style `.stt-dictionary-tooltip-error` (error message, red color)
  - Add responsive styles for mobile (< 768px)
  - _Requirements: 3.1, 4.1, 4.2, 4.3, 7.3_

- [x] 11. Integrate with existing translation and language settings
  - Read target language from useTranslation hook in SttStreamView
  - Pass target language to useInlineDictionary hook
  - Handle translation disabled state (use default target language from user settings)
  - Update tooltip when target language changes
  - Close tooltip when transcription is cleared
  - _Requirements: 9.1, 9.2, 9.3_

- [x] 11.1 Write property test for target language synchronization
  - **Property 22: Target Language Synchronization**
  - **Validates: Requirements 9.2**

- [x] 11.2 Write unit tests for integration scenarios
  - Test with translation disabled
  - Test with target language change
  - Test with transcription clear
  - Test with transcription download

- [x] 12. Add logging for authenticated users
  - Import authService from auth module
  - Import useAuthStore to check authentication status
  - Call authService.createDictionaryLog after successful lookup
  - Pass word, source language, target language, and results
  - Handle logging errors silently (don't block UI)
  - _Requirements: 9.5_

- [x] 12.1 Write property test for authenticated user logging
  - **Property 23: Authenticated User Logging**
  - **Validates: Requirements 9.5**

- [x] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Manual testing and polish
  - Test on Chrome, Firefox, Safari
  - Test on mobile devices (iOS, Android)
  - Test with different viewport sizes
  - Test with long transcription text
  - Test with rapid clicking
  - Test with slow/disconnected network
  - Test with different target languages
  - Test during active transcription
  - Fix any UI/UX issues discovered
  - _Requirements: All_

## Notes

- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation follows the existing module architecture and coding standards
- All new code should follow the coding standards in `coding-standards.md`
- CSS class names follow existing STT stream conventions
- API integration reuses existing dictionary service functions
- All tests are required for comprehensive coverage from the start
