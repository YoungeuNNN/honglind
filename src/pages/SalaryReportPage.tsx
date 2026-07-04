import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { useToastStore } from '@/stores/toastStore'
import * as DS from '@/api/dataService'
import { BackIcon } from '@/components/ui/Icons'
import {
  MIN_WAGE_HOURLY, WEEKS_PER_MONTH,
  SIDO_LIST, DENOMINATIONS, CHURCH_SIZE_BUCKETS, MINISTRY_POSITIONS,
} from '@/utils/constants'
import type { ChurchSizeBucket, MinistryPosition } from '@/types'

const won = (n: number) => n.toLocaleString('ko-KR')

export function SalaryReportPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { user } = useAuthStore()
  const openVerifyPrompt = useUIStore(s => s.openVerifyPrompt)
  const toast = useToastStore(s => s.show)
  // 제보(쓰기) = verified 만 [A안]. 글쓰기와 동일 게이트.
  const canReport = !!user && (user.verificationStatus === 'verified' || user.role === 'admin')

  useEffect(() => {
    if (user && !canReport) { openVerifyPrompt(); navigate('/', { replace: true }) }
  }, [user, canReport, openVerifyPrompt, navigate])

  const thisYear = new Date().getFullYear()
  const [denomination, setDenomination] = useState('')
  const [regionSido, setRegionSido] = useState('')
  const [regionSigungu, setRegionSigungu] = useState('')
  const [churchSize, setChurchSize] = useState<ChurchSizeBucket | ''>('')
  const [position, setPosition] = useState<MinistryPosition | ''>('')
  const [monthly, setMonthly] = useState('')   // 숫자만 담는 문자열
  const [weekly, setWeekly] = useState('')
  const [housing, setHousing] = useState(false)
  const [meals, setMeals] = useState(false)
  const [transport, setTransport] = useState(false)
  const [insurance, setInsurance] = useState(false)
  const [serveYear, setServeYear] = useState(thisYear)
  const [note, setNote] = useState('')
  const [churchName, setChurchName] = useState(params.get('church') || '')
  // 청빙 글의 '제보하기' CTA 에서 URL 로 전달된 교회키 — 화면에 안 보이고, 제보를 그 교회에 자동 연결
  const churchKey = params.get('churchKey')
  const [submitting, setSubmitting] = useState(false)

  const monthlyNum = Number(monthly.replace(/[^0-9]/g, ''))
  const weeklyNum = Number(weekly)
  // 실시간 시급 환산 = 월 실수령 / (주당 * 4.345)
  const hourly = useMemo(() => {
    if (!monthlyNum || !weeklyNum) return null
    return Math.round(monthlyNum / (weeklyNum * WEEKS_PER_MONTH))
  }, [monthlyNum, weeklyNum])
  const belowMin = hourly !== null && hourly < MIN_WAGE_HOURLY

  const handleSubmit = async () => {
    if (!user) return
    if (!denomination.trim()) { toast('교단을 선택하세요.'); return }
    if (!regionSido) { toast('시/도를 선택하세요.'); return }
    if (!regionSigungu.trim()) { toast('시/군/구를 입력하세요.'); return }
    if (!churchSize) { toast('교회 규모를 선택하세요.'); return }
    if (!position) { toast('직분을 선택하세요.'); return }
    // "협의/미기재" 차단 — 숫자만 허용
    if (!monthlyNum) { toast('월 사례비를 숫자로 입력하세요. ("협의"는 안 됩니다)'); return }
    if (!weeklyNum || weeklyNum <= 0) { toast('주당 사역시간을 숫자로 입력하세요.'); return }

    setSubmitting(true)
    try {
      await DS.submitSalaryReport({
        denomination: denomination.trim(),
        regionSido,
        regionSigungu: regionSigungu.trim(),
        churchSize,
        position,
        monthlyStipend: monthlyNum,
        weeklyHours: weeklyNum,
        housingProvided: housing,
        mealsProvided: meals,
        transportProvided: transport,
        insurance4: insurance,
        serveYear,
        note: note.trim() || null,
        churchName: churchName.trim() || null,
        churchKey: churchKey || null,
      })
      toast('제보 감사합니다. 이 데이터가 다음 전도사를 지킵니다.')
      // TODO 스텝4: 집계 화면 '/salary' 완성되면 그쪽으로 이동
      navigate('/', { replace: true })
    } catch (e) {
      toast(e instanceof Error ? e.message : '제보에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const smallLabel = { fontSize: 12 } as const
  const yearOptions = Array.from({ length: 6 }, (_, i) => thisYear - i)

  return (
    <>
      <div className="back-btn" onClick={() => navigate('/')} role="button" tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/') } }}>
        <BackIcon /> 목록으로
      </div>
      <div className="write-page fade-in">
        <h2>&#128176; 사례비 제보</h2>
        <p style={{ color: 'var(--subtext)', fontSize: 13, marginTop: -8, marginBottom: 20, lineHeight: 1.6 }}>
          익명으로 집계됩니다. 교회명은 데이터를 묶는 데만 쓰이고 <b>화면에 노출되지 않습니다</b>.
          같은 교회 제보가 <b>3건 이상</b> 모이기 전엔 개별 정보가 표시되지 않아요.
        </p>

        <div className="cheongbing-fields">
          <h4>&#128200; 기본 정보</h4>
          <div className="cheongbing-row">
            <div className="form-group"><label style={smallLabel}>교단</label>
              <select value={denomination} onChange={e => setDenomination(e.target.value)}>
                <option value="">선택</option>
                {DENOMINATIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group"><label style={smallLabel}>직분</label>
              <select value={position} onChange={e => setPosition(e.target.value as MinistryPosition)}>
                <option value="">선택</option>
                {MINISTRY_POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="cheongbing-row">
            <div className="form-group"><label style={smallLabel}>시/도</label>
              <select value={regionSido} onChange={e => setRegionSido(e.target.value)}>
                <option value="">선택</option>
                {SIDO_LIST.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group"><label style={smallLabel}>시/군/구</label>
              <input type="text" className="form-input" value={regionSigungu}
                onChange={e => setRegionSigungu(e.target.value)} placeholder="예: 강남구" />
            </div>
          </div>
          <div className="cheongbing-row">
            <div className="form-group"><label style={smallLabel}>교회 규모(출석)</label>
              <select value={churchSize} onChange={e => setChurchSize(e.target.value as ChurchSizeBucket)}>
                <option value="">선택</option>
                {CHURCH_SIZE_BUCKETS.map(b => <option key={b} value={b}>{b}명</option>)}
              </select>
            </div>
            <div className="form-group"><label style={smallLabel}>사역 연도</label>
              <select value={serveYear} onChange={e => setServeYear(Number(e.target.value))}>
                {yearOptions.map(y => <option key={y} value={y}>{y}년</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="cheongbing-fields" style={{ background: '#E0F2F1', borderColor: '#B2DFDB' }}>
          <h4 style={{ color: '#00796B' }}>&#128181; 사례비</h4>
          <div className="cheongbing-row">
            <div className="form-group"><label style={smallLabel}>월 실수령 사례비</label>
              <input type="text" inputMode="numeric" className="form-input"
                value={monthly ? won(monthlyNum) : ''}
                onChange={e => setMonthly(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="예: 1,300,000 (원)" />
            </div>
            <div className="form-group"><label style={smallLabel}>주당 사역시간</label>
              <input type="number" min={1} max={100} className="form-input"
                value={weekly} onChange={e => setWeekly(e.target.value)} placeholder="예: 24 (시간)" />
            </div>
          </div>

          {hourly !== null && (
            <div style={{
              marginTop: 4, padding: '10px 14px', borderRadius: 'var(--radius-md)',
              background: belowMin ? '#FDECEA' : '#E6F4EA',
              color: belowMin ? 'var(--danger)' : 'var(--success)',
              fontSize: 14, fontWeight: 600,
            }}>
              환산 시급 약 {won(hourly)}원
              {belowMin
                ? <> &nbsp;&#9888; {thisYear}년 최저임금({won(MIN_WAGE_HOURLY)}원) 미만</>
                : <> &nbsp;&#10003; 최저임금 이상</>}
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 12 }}>
            {([['사택', housing, setHousing], ['식사', meals, setMeals],
               ['교통비', transport, setTransport], ['4대보험', insurance, setInsurance]] as const).map(
              ([label, val, set]) => (
                <label key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                  <input type="checkbox" checked={val} onChange={e => set(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: 'var(--primary)' }} />
                  {label}
                </label>
              ))}
          </div>
        </div>

        <div className="form-group"><label>교회명 <span style={{ color: 'var(--subtext)', fontWeight: 400 }}>(선택 · 비공개)</span></label>
          <input type="text" className="form-input" value={churchName}
            onChange={e => setChurchName(e.target.value)}
            placeholder="같은 교회 데이터를 묶는 데만 쓰입니다. 화면엔 안 나옵니다." />
        </div>

        <div className="form-group"><label>비고 <span style={{ color: 'var(--subtext)', fontWeight: 400 }}>(선택)</span></label>
          <textarea value={note} onChange={e => setNote(e.target.value)}
            placeholder="특이사항(계약 형태, 추가 수당 등). 개인이나 교회를 특정할 수 있는 내용은 쓰지 마세요." />
        </div>

        <div className="write-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/')}>취소</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? '제보 중...' : '제보하기'}
          </button>
        </div>
      </div>
    </>
  )
}
