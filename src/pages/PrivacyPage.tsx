import { useNavigate } from 'react-router-dom'
import { BackIcon } from '@/components/ui/Icons'

export function PrivacyPage() {
  const navigate = useNavigate()
  return (
    <div className="legal-page">
      <div className="legal-page-inner">
        <div className="back-btn" onClick={() => navigate(-1)}><BackIcon /> 돌아가기</div>
        <h1 className="legal-title">개인정보처리방침</h1>
        <p className="legal-meta">시행일자: 2026년 6월 21일</p>

        <p className="legal-lead">
          홍라인드(이하 "서비스")는 「개인정보 보호법」 제30조에 따라 정보주체의 개인정보를 보호하고
          이와 관련한 고충을 신속하게 처리할 수 있도록 다음과 같이 개인정보처리방침을 수립·공개합니다.
        </p>

        <section className="legal-section">
          <h2>제1조 (개인정보의 처리 목적)</h2>
          <p>서비스는 다음의 목적을 위하여 개인정보를 처리하며, 목적 이외의 용도로는 이용하지 않습니다.</p>
          <ul>
            <li>회원 가입 및 관리: 본인 확인, 회원자격 유지·관리, 부정이용 방지</li>
            <li>사역자·신학생 자격 확인: 학생증 및 재학증명서를 통한 가입·글쓰기 권한 인증</li>
            <li>서비스 제공: 게시글·댓글·쪽지(DM) 등 커뮤니티 기능 제공</li>
            <li>민원 처리 및 공지사항 전달</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>제2조 (처리하는 개인정보의 항목)</h2>
          <p>서비스는 다음의 개인정보 항목을 처리합니다.</p>
          <ul>
            <li><strong>회원가입 시(필수):</strong> 이메일 주소, 비밀번호, 닉네임</li>
            <li><strong>자격 인증 시(필수):</strong> 학생증 이미지, 재학증명서(이미지 또는 PDF) — 신원 및 재학 사실 확인용</li>
            <li><strong>서비스 이용 중 생성:</strong> 게시글·댓글·쪽지 내용, 북마크, 차단 목록, 기도·투표 등 활동 기록</li>
            <li><strong>자동 수집 항목:</strong> 접속 IP 주소, 쿠키, 서비스 이용 기록, 기기·브라우저 정보</li>
          </ul>
          <p className="legal-note">
            ※ 학생증·재학증명서에는 성명·소속·학적 등 신원 확인 정보가 포함될 수 있으며, 이는 자격 인증이라는
            한정된 목적으로만 처리됩니다.
          </p>
        </section>

        <section className="legal-section">
          <h2>제3조 (개인정보의 처리 및 보유 기간)</h2>
          <ul>
            <li>회원 정보: 회원 탈퇴 시까지. 탈퇴 시 지체 없이 파기하되, 작성한 게시물·댓글은 "탈퇴한 사용자"로 표시되어 보존될 수 있습니다.</li>
            <li>학생증·재학증명서: 자격 심사 완료 후 인증 목적 달성 시 또는 회원 탈퇴 시 파기합니다.</li>
            <li>관계 법령에 따라 보존이 필요한 경우 해당 법령이 정한 기간 동안 보관합니다.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>제4조 (개인정보의 제3자 제공)</h2>
          <p>
            서비스는 정보주체의 개인정보를 제1조에서 명시한 범위 내에서만 처리하며, 정보주체의 동의, 법률의
            특별한 규정 등 「개인정보 보호법」 제17조 및 제18조에 해당하는 경우 외에는 제3자에게 제공하지 않습니다.
          </p>
        </section>

        <section className="legal-section">
          <h2>제5조 (개인정보 처리의 위탁)</h2>
          <p>서비스는 안정적인 운영을 위해 다음과 같이 개인정보 처리 업무를 위탁하고 있습니다.</p>
          <ul>
            <li><strong>Supabase Inc.</strong> — 데이터베이스 및 인증·파일 저장 인프라 운영</li>
            <li><strong>Netlify Inc.</strong> — 웹 호스팅 및 서비스 배포</li>
          </ul>
          <p className="legal-note">
            ※ 위 수탁사는 국외에 서버를 둘 수 있으며, 위탁 계약 시 개인정보가 안전하게 관리되도록 관련 사항을
            규정하고 있습니다.
          </p>
        </section>

        <section className="legal-section">
          <h2>제6조 (정보주체의 권리·의무 및 행사 방법)</h2>
          <p>정보주체는 언제든지 다음의 권리를 행사할 수 있습니다.</p>
          <ul>
            <li>개인정보 열람·정정·삭제·처리정지 요구</li>
            <li>닉네임·이메일·비밀번호 변경 및 계정 삭제(탈퇴)는 서비스 내 "계정 설정"에서 직접 가능합니다.</li>
            <li>그 밖의 요청은 아래 개인정보 보호책임자에게 연락하여 행사할 수 있습니다.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>제7조 (개인정보의 파기 절차 및 방법)</h2>
          <p>
            보유 기간이 경과하거나 처리 목적이 달성된 개인정보는 지체 없이 파기합니다. 전자적 파일은 복구가
            불가능한 방법으로 영구 삭제하며, 종이 문서는 분쇄하거나 소각합니다.
          </p>
        </section>

        <section className="legal-section">
          <h2>제8조 (개인정보의 안전성 확보 조치)</h2>
          <ul>
            <li>비밀번호는 암호화되어 저장·관리됩니다.</li>
            <li>개인정보에 대한 접근 권한을 최소한의 인원으로 제한합니다.</li>
            <li>전송 구간 암호화(HTTPS) 및 접근 통제 등 기술적·관리적 보호조치를 적용합니다.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>제9조 (쿠키 등 자동 수집 장치)</h2>
          <p>
            서비스는 로그인 유지 및 이용 편의를 위해 쿠키 및 브라우저 저장소(localStorage/sessionStorage)를
            사용합니다. 정보주체는 브라우저 설정을 통해 저장을 거부할 수 있으나, 이 경우 로그인 등 일부 기능
            이용이 제한될 수 있습니다.
          </p>
        </section>

        <section className="legal-section">
          <h2>제10조 (광고 게재 및 제3자 광고 쿠키)</h2>
          <p>
            서비스는 운영 유지를 위해 Google AdSense 등 제3자 광고 서비스를 통해 광고를 게재할 수 있습니다.
          </p>
          <ul>
            <li>Google을 포함한 제3자 광고 사업자는 쿠키를 사용하여, 이용자의 이전 방문 기록 등을 바탕으로 맞춤형 광고를 제공할 수 있습니다.</li>
            <li>Google은 광고 제공을 위해 광고 쿠키(DART 쿠키 등)를 사용하며, 이용자는 <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">Google 광고 설정</a>에서 맞춤형 광고를 비활성화할 수 있습니다.</li>
            <li><a href="https://www.aboutads.info" target="_blank" rel="noopener noreferrer">www.aboutads.info</a>에서 제3자 광고 사업자의 맞춤형 광고 쿠키 사용을 일괄적으로 거부할 수도 있습니다.</li>
            <li>제3자 광고 사업자의 개인정보 처리는 <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer">Google 광고 정책</a> 등 각 사업자의 방침을 따릅니다.</li>
          </ul>
          <p className="legal-note">
            ※ 광고 쿠키는 브라우저 설정에서 거부할 수 있으며, 거부하더라도 서비스 이용에는 제한이 없습니다(맞춤형 광고만 비활성화됩니다).
          </p>
        </section>

        <section className="legal-section">
          <h2>제11조 (개인정보 보호책임자)</h2>
          <p>서비스는 개인정보 처리에 관한 업무를 총괄하여 책임지는 개인정보 보호책임자를 다음과 같이 지정합니다.</p>
          <ul>
            <li>개인정보 보호책임자: 홍라인드 운영자</li>
            <li>연락처(이메일): honglind.help@gmail.com</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>제12조 (권익침해 구제 방법)</h2>
          <p>개인정보 침해로 인한 상담·신고가 필요한 경우 아래 기관에 문의할 수 있습니다.</p>
          <ul>
            <li>개인정보분쟁조정위원회 (privacy.go.kr / 국번없이 1833-6972)</li>
            <li>개인정보침해 신고센터 (privacy.kisa.or.kr / 국번없이 118)</li>
            <li>대검찰청 사이버수사과 (국번없이 1301)</li>
            <li>경찰청 사이버수사국 (ecrm.police.go.kr / 국번없이 182)</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>제13조 (개인정보처리방침의 변경)</h2>
          <p>
            이 개인정보처리방침은 법령·정책 또는 서비스 변경에 따라 내용이 추가·삭제·수정될 수 있으며,
            변경 시 서비스 내 공지를 통해 고지합니다.
          </p>
        </section>
      </div>
    </div>
  )
}
