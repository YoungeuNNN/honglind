import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import * as DS from '@/api/dataService'
import { useSeoMeta } from '@/hooks/useSeoMeta'
import { MIN_WAGE_HOURLY, DENOMINATIONS, MINISTRY_POSITIONS } from '@/utils/constants'
import type { SalaryAggRow, SalaryOverview } from '@/types'

const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const manwon = (n: number) => `${Math.round(n / 10000).toLocaleString('ko-KR')}만원`
const pct = (r: number) => Math.round(r * 100)

export function SalaryPage() {
  // 신원추적 위험 차단 — 사례비 페이지는 검색 색인에서 제외
  useSeoMeta({
    title: '사례비 현황',
    description: '사역자 실지급 사례비·환산 시급을 익명으로 집계합니다.',
    robots: 'noindex, follow',
  })
  const navigate = useNavigate()
  const [overview, setOverview] = useState<SalaryOverview | null>(null)
  const [rows, setRows] = useState<SalaryAggRow[]>([])
  const [denom, setDenom] = useState('')
  const [position, setPosition] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    DS.fetchSalaryOverview().then(setOverview).catch(() => setOverview(null))
  }, [])

  useEffect(() => {
    let alive = true
    DS.fetchSalaryByRegion(denom || undefined, position || undefined)
      .then(r => { if (alive) setRows(r) })
      .catch(() => { if (alive) setRows([]) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [denom, position])

  const maxMedian = Math.max(1, ...rows.map(r => r.medianMonthly))

  return (
    <>
      <div className="feed-header">
        <h2 className="feed-title">&#128202; 사례비 현황</h2>
        <button className="btn btn-primary btn-small" onClick={() => navigate('/salary/new')}>제보하기</button>
      </div>

      {/* 헤드라인 — 파트전도사 실시급 */}
      {overview && overview.totalReports > 0 && (
        <div className="fade-in" style={{
          background: 'linear-gradient(135deg, var(--primary), var(--primary-dark, #4527A0))',
          color: '#fff', borderRadius: 'var(--radius-lg)', padding: 20, marginBottom: 16,
        }}>
          <div style={{ fontSize: 13, opacity: 0.9 }}>파트전도사 환산 시급 중앙값</div>
          <div style={{ fontSize: 30, fontWeight: 800, margin: '2px 0 8px' }}>
            {won(overview.medianHourlyPart)}<span style={{ fontSize: 16, fontWeight: 600 }}>원</span>
          </div>
          <div style={{ fontSize: 13, opacity: 0.95, lineHeight: 1.6 }}>
            제보 <b>{won(overview.totalReports)}건</b> 기준 ·{' '}
            최저임금({won(MIN_WAGE_HOURLY)}원) 미만이 <b>{pct(overview.belowMinWageRate)}%</b>
          </div>
        </div>
      )}

      {/* 필터 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <select value={denom} onChange={e => setDenom(e.target.value)}
          style={{ flex: 1, minWidth: 120, padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--card)', color: 'var(--text)', fontSize: 13 }}>
          <option value="">교단 전체</option>
          {DENOMINATIONS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={position} onChange={e => setPosition(e.target.value)}
          style={{ flex: 1, minWidth: 120, padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--card)', color: 'var(--text)', fontSize: 13 }}>
          <option value="">직분 전체</option>
          {MINISTRY_POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div style={{ fontSize: 12, color: 'var(--subtext)', marginBottom: 16, lineHeight: 1.6 }}>
        같은 지역·직분 제보가 <b>3건 이상</b> 모인 집계만 공개됩니다. 익명 보호를 위한 최소 표본 기준이에요.
      </div>

      {loading ? (
        <div className="empty-state fade-in"><p>불러오는 중...</p></div>
      ) : rows.length === 0 ? (
        <div className="empty-state fade-in" style={{ lineHeight: 1.7 }}>
          <p>아직 공개된 집계가 없습니다.<br />제보가 3건 모이면 이 지역이 열립니다.</p>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => navigate('/salary/new')}>
            첫 제보 남기기
          </button>
        </div>
      ) : (
        <>
          {rows.map(r => (
            <div key={r.groupLabel} className="post-card fade-in" style={{ cursor: 'default' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <span style={{ fontWeight: 700 }}>{r.groupLabel}</span>
                <span style={{ fontSize: 12, color: 'var(--subtext)' }}>제보 {r.count}건</span>
              </div>

              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--subtext)' }}>월 사례비 중앙값</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{manwon(r.medianMonthly)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--subtext)' }}>환산 시급</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: r.medianHourly < MIN_WAGE_HOURLY ? 'var(--danger)' : 'var(--success)' }}>
                    {won(r.medianHourly)}원
                    {r.medianHourly < MIN_WAGE_HOURLY && <span style={{ fontSize: 11, marginLeft: 4 }}>&#9888; 최저임금 미만</span>}
                  </div>
                </div>
              </div>

              {/* 25~75% 범위 바 */}
              <div style={{ position: 'relative', height: 6, background: 'var(--bg)', borderRadius: 3, marginBottom: 6 }}>
                <div style={{
                  position: 'absolute', height: '100%', borderRadius: 3, background: 'var(--primary)',
                  left: `${(r.p25Monthly / maxMedian) * 100}%`,
                  width: `${Math.max(2, ((r.p75Monthly - r.p25Monthly) / maxMedian) * 100)}%`,
                }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--subtext)', marginBottom: 8 }}>
                하위 25% {manwon(r.p25Monthly)} ~ 상위 25% {manwon(r.p75Monthly)}
              </div>

              <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--subtext)' }}>
                <span>사택 제공 {pct(r.housingRate)}%</span>
                <span>4대보험 {pct(r.insuranceRate)}%</span>
              </div>
            </div>
          ))}

          <div className="post-card fade-in" style={{ textAlign: 'center', background: 'var(--bg)' }}>
            <div style={{ fontSize: 13, color: 'var(--subtext)', marginBottom: 10 }}>
              찾는 지역이 없거나 표본이 부족한가요? 당신의 제보가 다음 사람을 지킵니다.
            </div>
            <button className="btn btn-primary btn-small" onClick={() => navigate('/salary/new')}>사례비 제보하기</button>
          </div>
        </>
      )}
    </>
  )
}
