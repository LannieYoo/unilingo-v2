/**
 * Dictionary 모듈 라우터 설정
 */

import { lazy } from 'react'

const DictionaryView = lazy(() => import('../_02_views/DictionaryView'))

/**
 * Dictionary 모듈 라우터 설정 가져오기
 */
export function getDictionaryRoutes(options = {}) {
  const {
    basePath = 'dictionary',
    LazyWrapper = ({ children }) => children,
  } = options

  return {
    path: basePath,
    element: (
      <LazyWrapper>
        <DictionaryView />
      </LazyWrapper>
    ),
  }
}

export const routes = getDictionaryRoutes()
export default routes
