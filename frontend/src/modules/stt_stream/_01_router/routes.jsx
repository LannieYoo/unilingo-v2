/**
 * STT Stream Routes
 * 라우터 설정
 */

import { lazy } from 'react'

const SttStreamView = lazy(() => import('../_02_views/SttStreamView'))

/**
 * STT Stream 모듈 라우터 설정 가져오기
 * @param {Object} options
 * @param {string} options.basePath - 기본 경로
 * @param {Function} options.LazyWrapper - 지연 로딩 래퍼
 */
export function getSttStreamRoutes(options = {}) {
  const {
    basePath = 'stt-stream',
    LazyWrapper = ({ children }) => children,
  } = options

  return {
    path: basePath,
    element: (
      <LazyWrapper>
        <SttStreamView />
      </LazyWrapper>
    ),
  }
}

export const routes = getSttStreamRoutes()
export default routes
