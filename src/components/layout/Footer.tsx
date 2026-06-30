import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-links">
          <Link to="/about">서비스 소개</Link>
          <span className="site-footer-sep">·</span>
          <Link to="/privacy">개인정보처리방침</Link>
          <span className="site-footer-sep">·</span>
          <Link to="/terms">이용약관</Link>
          <span className="site-footer-sep">·</span>
          <a href="mailto:honglind.help@gmail.com">광고 문의</a>
        </div>
        <p className="site-footer-copy">
          © {2026} 홍라인드 · 사역자 &amp; 신학생 익명 커뮤니티
        </p>
      </div>
    </footer>
  )
}
