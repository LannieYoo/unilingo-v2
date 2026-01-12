/**
 * Translator 모듈 라우터 설정
 */

import { lazy } from 'react'

const TranslatorView = lazy(() => import('../_02_views/TranslatorView'))
const TranslationHistoryView = lazy(() => import('../_02_views/TranslationHistoryView'))

/**
 * 모듈 라우터 설정 가져오기
 */
export function getTranslatorRoutes(options = {}) {
  const {
    basePath = 'translator',
    LazyWrapper = ({ children }) => children,
  } = options

  return {
    path: basePath,
    children: [
      {
        index: true,
        element: (
          <LazyWrapper>
            <TranslatorView />
          </LazyWrapper>
        ),
      },
      {
        path: 'history',
        element: (
          <LazyWrapper>
            <TranslationHistoryView />
          </LazyWrapper>
        ),
      },
    ],
  }
}

export const routes = getTranslatorRoutes()
export default routes
