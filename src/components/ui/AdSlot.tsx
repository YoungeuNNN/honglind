import { useEffect } from 'react'
import type { CSSProperties } from 'react'

// Google AdSense 광고 슬롯.
// 환경변수 VITE_ADSENSE_CLIENT(=ca-pub-...) 와 slot 이 모두 있을 때만 실제 광고를 렌더한다.
// 미설정(개발/승인 전)이면 기존 '광고 영역' 자리표시자를 그대로 보여준다.

const CLIENT = import.meta.env.VITE_ADSENSE_CLIENT as string | undefined

let scriptRequested = false
function ensureScript(client: string) {
  if (scriptRequested) return
  scriptRequested = true
  const s = document.createElement('script')
  s.async = true
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`
  s.crossOrigin = 'anonymous'
  document.head.appendChild(s)
}

export function AdSlot({ slot, className = 'home-rail-ad', style }: { slot?: string; className?: string; style?: CSSProperties }) {
  useEffect(() => {
    if (!CLIENT || !slot) return
    ensureScript(CLIENT)
    try {
      const w = window as unknown as { adsbygoogle?: unknown[] }
      ;(w.adsbygoogle = w.adsbygoogle || []).push({})
    } catch { /* 광고 로드 실패는 무시 */ }
  }, [slot])

  if (!CLIENT || !slot) {
    return <div className={className} style={style}>광고 영역</div>
  }

  return (
    <ins
      className="adsbygoogle"
      style={{ display: 'block', ...style }}
      data-ad-client={CLIENT}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  )
}
