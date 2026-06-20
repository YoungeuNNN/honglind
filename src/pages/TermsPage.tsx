import { useNavigate } from 'react-router-dom'
import { BackIcon } from '@/components/ui/Icons'

export function TermsPage() {
  const navigate = useNavigate()
  return (
    <div className="legal-page">
      <div className="legal-page-inner">
        <div className="back-btn" onClick={() => navigate(-1)}><BackIcon /> 돌아가기</div>
        <h1 className="legal-title">이용약관</h1>
        <p className="legal-meta">시행일자: 2026년 6월 21일</p>

        <section className="legal-section">
          <h2>제1조 (목적)</h2>
          <p>
            본 약관은 홍라인드(이하 "서비스")가 제공하는 사역자·신학생 익명 커뮤니티 서비스의 이용과 관련하여
            서비스와 회원 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.
          </p>
        </section>

        <section className="legal-section">
          <h2>제2조 (정의)</h2>
          <ul>
            <li>"회원"이란 본 약관에 동의하고 서비스에 가입하여 이용하는 자를 말합니다.</li>
            <li>"게시물"이란 회원이 서비스에 게시한 글·댓글·쪽지·이미지 등 일체의 정보를 말합니다.</li>
            <li>"자격 인증"이란 학생증·재학증명서를 통해 사역자·신학생 자격을 확인하는 절차를 말합니다.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>제3조 (약관의 효력 및 변경)</h2>
          <p>
            본 약관은 서비스 화면에 게시함으로써 효력이 발생합니다. 서비스는 관련 법령을 위배하지 않는 범위에서
            약관을 변경할 수 있으며, 변경 시 적용일자와 사유를 명시하여 서비스 내에 공지합니다.
          </p>
        </section>

        <section className="legal-section">
          <h2>제4조 (회원가입 및 자격 인증)</h2>
          <ul>
            <li>회원가입은 본 약관과 개인정보처리방침에 동의하고 가입 절차를 완료함으로써 성립합니다.</li>
            <li>일부 기능(글 본문 열람, 글쓰기·댓글·쪽지 등)은 학생증 및 재학증명서 인증이 완료된 회원에게만 제공됩니다.</li>
            <li>타인의 명의·자격을 도용하거나 허위 자료로 인증한 경우 서비스 이용이 제한될 수 있습니다.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>제5조 (서비스의 제공 및 변경)</h2>
          <p>
            서비스는 연중무휴 제공을 원칙으로 하나, 시스템 점검·장애·천재지변 등 부득이한 사유가 있는 경우
            일시 중단될 수 있습니다. 서비스는 운영상·기술상 필요에 따라 제공 내용을 변경할 수 있습니다.
          </p>
        </section>

        <section className="legal-section">
          <h2>제6조 (회원의 의무)</h2>
          <p>회원은 다음 행위를 하여서는 안 됩니다.</p>
          <ul>
            <li>타인의 개인정보 도용 또는 허위 정보 등록</li>
            <li>욕설·비방·차별·혐오·음란물 등 부적절한 게시물 작성</li>
            <li>허위사실 유포 및 타인의 명예를 훼손하는 행위</li>
            <li>서비스의 정상적인 운영을 방해하는 행위</li>
            <li>법령 또는 공서양속에 위배되는 행위</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>제7조 (게시물의 관리)</h2>
          <p>
            회원이 작성한 게시물이 관련 법령 또는 본 약관에 위반되는 경우, 서비스는 사전 통지 없이 해당 게시물을
            삭제하거나 게시를 제한할 수 있으며, 위반 정도에 따라 회원 자격을 제한·정지할 수 있습니다. 회원은
            신고 기능을 통해 부적절한 게시물의 검토를 요청할 수 있습니다.
          </p>
        </section>

        <section className="legal-section">
          <h2>제8조 (게시물의 저작권)</h2>
          <p>
            회원이 작성한 게시물의 저작권은 해당 회원에게 귀속됩니다. 다만 서비스는 서비스 운영·노출·홍보를 위해
            필요한 범위 내에서 게시물을 사용할 수 있습니다. 회원은 자신의 게시물이 타인의 권리를 침해하지 않도록
            할 책임이 있습니다.
          </p>
        </section>

        <section className="legal-section">
          <h2>제9조 (계정 해지 및 이용 제한)</h2>
          <p>
            회원은 언제든지 "계정 설정"을 통해 탈퇴할 수 있습니다. 서비스는 회원이 본 약관을 위반한 경우
            경고·게시물 삭제·이용 정지·계정 삭제 등의 조치를 취할 수 있습니다.
          </p>
        </section>

        <section className="legal-section">
          <h2>제10조 (면책조항)</h2>
          <ul>
            <li>서비스는 천재지변, 회원의 귀책사유, 제3자의 행위 등 서비스가 통제할 수 없는 사유로 발생한 손해에 대해 책임을 지지 않습니다.</li>
            <li>서비스는 회원이 게시한 게시물의 정확성·신뢰성에 대해 보증하지 않으며, 회원 간 또는 회원과 제3자 간 분쟁에 개입하지 않습니다.</li>
            <li>익명 커뮤니티 특성상 게시물의 내용은 작성자 본인의 견해이며 서비스의 입장과 무관합니다.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>제11조 (준거법 및 분쟁 해결)</h2>
          <p>
            본 약관은 대한민국 법령에 따라 해석되며, 서비스와 회원 간 분쟁은 상호 협의를 원칙으로 하되 협의가
            이루어지지 않을 경우 관할 법원에 제소할 수 있습니다.
          </p>
        </section>

        <section className="legal-section">
          <h2>문의</h2>
          <p>본 약관에 관한 문의는 이메일([문의 이메일])로 연락해 주시기 바랍니다.</p>
        </section>
      </div>
    </div>
  )
}
