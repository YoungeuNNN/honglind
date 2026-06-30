import { useEffect } from 'react'

// 라우트별 SEO 메타(제목/설명/robots/canonical/OG)를 동적으로 설정.
// SPA라 한 index.html을 공유하므로, 각 페이지가 마운트될 때 head 를 갱신한다.
// robots 기본값은 'index, follow' — 전체 색인 정책. 색인에서 빼고 싶은 페이지는 'noindex' 를 넘긴다.

const DEFAULT_TITLE = '홍라인드 - 사역자 & 신학생 익명 커뮤니티'

interface SeoMetaOptions {
  title?: string
  description?: string
  robots?: string
  canonical?: string
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

export function useSeoMeta({ title, description, robots = 'index, follow', canonical }: SeoMetaOptions) {
  useEffect(() => {
    const fullTitle = title ? `${title} | 홍라인드` : DEFAULT_TITLE
    const url = canonical ?? `${location.origin}${location.pathname}`

    document.title = fullTitle
    upsertMeta('name', 'robots', robots)
    if (description) upsertMeta('name', 'description', description)
    upsertCanonical(url)

    // Open Graph — 링크 공유 시 미리보기
    upsertMeta('property', 'og:title', fullTitle)
    if (description) upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:url', url)
    upsertMeta('property', 'og:type', 'website')

    return () => {
      // 페이지를 떠나면 제목을 기본값으로 되돌린다(다음 페이지가 곧바로 덮어씀).
      document.title = DEFAULT_TITLE
    }
  }, [title, description, robots, canonical])
}
