import { useNavigate } from 'react-router-dom'
import { BackIcon } from '@/components/ui/Icons'

export function AboutPage() {
  const navigate = useNavigate()
  return (
    <div className="legal-page">
      <div className="legal-page-inner">
        <div className="back-btn" onClick={() => navigate(-1)}><BackIcon /> 돌아가기</div>
        <h1 className="legal-title">서비스 소개</h1>

        <section className="legal-section">
          {/* TODO: 운영자가 직접 작성 — 아래는 자리표시 문구입니다. */}
          <p>여기에 홍라인드 서비스 소개 내용을 작성하세요.</p>
        </section>
      </div>
    </div>
  )
}
