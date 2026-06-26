import { useEffect, useRef } from 'react'
import * as DS from '@/api/dataService'
import { useUIStore } from '@/stores/uiStore'

// 탭이 다시 보이거나 창에 포커스가 돌아올 때 데이터를 최신화한다.
// 폴링(주기적 호출) 대신 "사용자가 실제로 화면을 다시 볼 때"만 갱신해 비용을 최소화.
const THROTTLE_MS = 30_000  // 마지막 갱신 후 이 시간 안에는 다시 갱신하지 않음

export function useAutoRefresh() {
  const bumpData = useUIStore(s => s.bumpData)
  const lastRef = useRef(0)

  useEffect(() => {
    lastRef.current = Date.now()  // 마운트 시점 기준으로 쓰로틀 시작(부팅 시 이미 loadAll 했으므로)
    const onActive = () => {
      if (document.visibilityState !== 'visible') return
      const now = Date.now()
      if (now - lastRef.current < THROTTLE_MS) return
      lastRef.current = now
      DS.refresh().then(bumpData).catch(() => { /* 네트워크 오류는 조용히 무시, 다음 기회에 갱신 */ })
    }
    document.addEventListener('visibilitychange', onActive)
    window.addEventListener('focus', onActive)
    return () => {
      document.removeEventListener('visibilitychange', onActive)
      window.removeEventListener('focus', onActive)
    }
  }, [bumpData])
}
