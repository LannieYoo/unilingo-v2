/**
 * PageLayout
 * 공통 페이지 레이아웃 컴포넌트
 * 모든 페이지에서 일관된 스타일을 제공
 */

import './page-layout.css'

/**
 * @param {Object} props
 * @param {string} props.title - 페이지 제목
 * @param {string} [props.subtitle] - 페이지 부제목 (선택)
 * @param {React.ReactNode} props.children - 페이지 콘텐츠
 * @param {boolean} [props.fullHeight] - 전체 높이 사용 여부 (기본: false)
 * @param {string} [props.className] - 추가 클래스명
 */
export function PageLayout({ 
  title, 
  subtitle, 
  children, 
  fullHeight = false,
  className = '' 
}) {
  return (
    <div className={`page-layout ${fullHeight ? 'page-layout--full-height' : ''} ${className}`}>
      <div className="page-layout__container">
        <h1 className="page-layout__title">{title}</h1>
        {subtitle && <p className="page-layout__subtitle">{subtitle}</p>}
        <div className={`page-layout__content ${fullHeight ? 'page-layout__content--flex' : ''}`}>
          {children}
        </div>
      </div>
    </div>
  )
}

/**
 * PageBox - 페이지 내 콘텐츠 박스
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 * @param {boolean} [props.noPadding]
 * @param {boolean} [props.flex] - flex 레이아웃 사용
 */
export function PageBox({ children, className = '', noPadding = false, flex = false }) {
  return (
    <div className={`page-layout__box ${noPadding ? 'page-layout__box--no-padding' : ''} ${flex ? 'page-layout__box--flex' : ''} ${className}`}>
      {children}
    </div>
  )
}

export default PageLayout
