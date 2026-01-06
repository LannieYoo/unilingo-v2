/**
 * Recording 모듈 라우터 설정
 */

import { lazy } from 'react'

const RecordingView = lazy(() => import('../_02_views/RecordingView'))

/**
 * 모듈 라우터 설정 가져오기
 */
export function getRecordingRoutes(options = {}) {
  const {
    basePath = 'recording',
    LazyWrapper = ({ children }) => children,
  } = options

  return {
    path: basePath,
    element: (
      <LazyWrapper>
        <RecordingView />
      </LazyWrapper>
    ),
  }
}

export const routes = getRecordingRoutes()
export default routes
