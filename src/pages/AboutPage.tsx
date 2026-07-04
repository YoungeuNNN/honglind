import { useNavigate } from 'react-router-dom'
import { BackIcon } from '@/components/ui/Icons'

export function AboutPage() {
  const navigate = useNavigate()
  return (
    <div className="legal-page">
      <div className="legal-page-inner">
        <div className="back-btn" onClick={() => navigate(-1)}><BackIcon /> 돌아가기</div>
        <h1 className="legal-title">서비스 소개</h1>
        <p className="legal-lead">
          홍라인드는 사역자와 신학생이 신원을 드러내지 않고 마음 편히 이야기를 나눌 수 있는
          익명 커뮤니티입니다. 목회 현장과 신학교라는 좁은 울타리 안에서는 꺼내기 어려운 고민도,
          같은 길을 걷는 사람들끼리는 솔직하게 나눌 수 있다고 믿습니다.
        </p>

        <section className="legal-section">
          <h2>왜 홍라인드인가요?</h2>
          <p>
            사역의 길은 보람만큼이나 외로움이 큽니다. 사례비·진로·관계·소명에 대한 고민을 교회 안에서
            솔직히 털어놓기는 쉽지 않고, 신학생은 학업과 미래 사이에서 비슷한 무게를 짊어집니다.
            홍라인드는 이런 이야기를 <strong>익명으로, 그러나 같은 처지를 아는 사람들과</strong> 나눌 수 있는
            공간을 지향합니다.
          </p>
        </section>

        <section className="legal-section">
          <h2>누구를 위한 곳인가요?</h2>
          <ul>
            <li>현직 목회자·전도사·사역자</li>
            <li>신학대학교·신학대학원 재학생 및 졸업생</li>
            <li>사역과 신학의 길을 진지하게 고민하는 분</li>
          </ul>
          <p className="legal-note">
            ※ 건강한 익명 커뮤니티를 지키기 위해, 글쓰기·댓글 등 핵심 기능은 학생증 또는 재학·자격
            확인을 거친 회원에게만 제공됩니다.
          </p>
        </section>

        <section className="legal-section">
          <h2>이런 이야기를 나눠요</h2>
          <ul>
            <li><strong>자유게시판</strong> — 일상과 소소한 이야기</li>
            <li><strong>사역 고민</strong> — 현장에서 마주하는 어려움과 진로</li>
            <li><strong>기도 요청</strong> — 서로의 제목을 위해 함께 기도</li>
            <li><strong>사역장터</strong> — 자료 나눔·구함, 사역에 필요한 거래</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>우리가 지키는 것</h2>
          <ul>
            <li><strong>익명성</strong> — 닉네임으로만 활동하며, 자격 확인 정보는 인증 목적으로만 쓰입니다.</li>
            <li><strong>안전함</strong> — 신고·차단 기능과 운영 관리로 비방·광고·부적절한 글을 관리합니다.</li>
            <li><strong>서로에 대한 존중</strong> — 다른 교단·신학·관점을 존중하는 대화를 지향합니다.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>문의</h2>
          <p>
            서비스 이용·제휴·광고에 관한 문의는 페이지 하단의 <strong>광고 문의</strong> 또는
            개인정보처리방침에 안내된 이메일로 연락해 주세요. 보내주시는 의견은 서비스를 다듬는 데
            소중하게 쓰입니다.
          </p>
        </section>
      </div>
    </div>
  )
}
