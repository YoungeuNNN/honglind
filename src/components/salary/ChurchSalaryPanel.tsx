import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import * as DS from '@/api/dataService'
import { MIN_WAGE_HOURLY } from '@/utils/constants'
import type { ChurchSalaryAgg } from '@/types'

const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const manwon = (n: number) => `${Math.round(n / 10000).toLocaleString('ko-KR')}만원`
const pct = (r: number) => Math.round(r * 100)

/**
 * 청빙 상세에 붙는 "이 교회 실지급 사례비" 패널.
 * churchKey 가 있고 제보가 3건 이상이면 집계를 보여주고, 아니면 제보 CTA 로 유입 루프를 닫는다.
 * (초빙게시판이 구조적으로 못 하는 것 — 지원 전에 실지급을 확인 + 직접 제보)
 */
export function ChurchSalaryPanel({ churchKey, churchName }: { churchKey?: string; churchName?: string }) {
  const navigate = useNavigate()
  const [agg, setAgg] = useState<ChurchSalaryAgg | null>(null)
  const [loading, setLoading] = useState(!!churchKey)

  useEffect(() => {
    if (!churchKey) return
    let alive = true
    DS.fetchSalaryByChurch(churchKey)
      .then(a => { if (alive) setAgg(a) })
      .catch(() => { if (alive) setAgg(null) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [churchKey])

  // 교회키를 URL 로 넘겨 제보가 이 교회에 자동 연결되게 한다
  const reportHref = `/salary/new?${churchKey ? `churchKey=${encodeURIComponent(churchKey)}&` : ''}church=${encodeURIComponent(churchName || '')}`

  return (
    <div className="cheongbing-fields" style={{ margin: '16px 0', background: '#E0F2F1', borderColor: '#B2DFDB' }}>
      <h4 style={{ color: '#00796B' }}>{'\u{1F4B0}'} 이 교회 실지급 사례비</h4>

      {loading ? (
        <div style={{ fontSize: 13, color: 'var(--subtext)' }}>불러오는 중...</div>
      ) : agg ? (
        <>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--subtext)' }}>월 사례비 중앙값</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{manwon(agg.medianMonthly)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--subtext)' }}>환산 시급</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: agg.medianHourly < MIN_WAGE_HOURLY ? 'var(--danger)' : 'var(--success)' }}>
                {won(agg.medianHourly)}원
                {agg.medianHourly < MIN_WAGE_HOURLY && <span style={{ fontSize: 11, marginLeft: 4 }}>{'⚠'} 최저 미만</span>}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--subtext)', marginBottom: 10 }}>
            <span>제보 {agg.count}건</span>
            <span>사택 {pct(agg.housingRate)}%</span>
            <span>4대보험 {pct(agg.insuranceRate)}%</span>
          </div>
          <div style={{ fontSize: 12 }}>
            여기서 섬겼거나 지원해봤다면{' '}
            <span onClick={() => navigate(reportHref)} role="button" tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(reportHref) } }}
              style={{ color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}>내 사례비도 제보</span>
          </div>
        </>
      ) : (
        <div style={{ fontSize: 13, lineHeight: 1.7 }}>
          아직 이 교회의 사례비 데이터가 부족합니다. <b>3건</b>이 모이면 공개돼요.<br />
          <button className="btn btn-primary btn-small" style={{ marginTop: 8 }} onClick={() => navigate(reportHref)}>
            이 교회 사례비 제보하기
          </button>
        </div>
      )}
    </div>
  )
}
