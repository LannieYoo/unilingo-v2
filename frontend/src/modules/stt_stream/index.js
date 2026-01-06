/**
 * STT Stream Module
 * Vosk 기반 실시간 STT 모듈 - 통합 내보내기
 * 
 * 이 모듈은 프론트엔드 모듈 계층화 규범을 따릅니다.
 * - _01_router: 라우터 설정
 * - _02_views: 뷰 컴포넌트
 * - _03_components: 재사용 가능한 컴포넌트
 * - _04_hooks: 비즈니스 로직 훅
 * - _05_stores: 상태 관리
 * - _07_utils: 유틸리티 함수
 * - _08_constants: 상수 정의
 * - _10_styles: 스타일
 */

// Router
export { getSttStreamRoutes, routes } from './_01_router'

// Views
export { SttStreamView } from './_02_views'

// Components
export {
  DebugPanel,
  LanguageSelect,
  StatusIndicator,
  ActionButton,
  TranscriptDisplay
} from './_03_components'

// Hooks
export { useVoskRecognition } from './_04_hooks'

// Stores
export {
  useTranscriptStore,
  useDebugStore
} from './_05_stores'

// Utils
export {
  normalizeText,
  addPunctuation,
  normalizeForComparison,
  overlapMerge,
  generateFileName,
  downloadAsFile
} from './_07_utils'

// Constants
export {
  LANGUAGE_OPTIONS,
  MODEL_URLS,
  STATUS,
  LOG_TYPES,
  LOG_TYPE_COLORS,
  DEFAULT_LANGUAGE,
  MAX_LOGS,
  SAMPLE_RATE
} from './_08_constants'
