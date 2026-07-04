# 홍라인드 (Honglind)

> 사역자 & 신학생을 위한 익명 커뮤니티

운영 사이트: https://honglind.netlify.app

## 기술 스택

- React 19 + TypeScript + Vite 8
- Supabase (Auth + Postgres + RLS)
- React Router 7, React Hook Form, Zustand, React Query
- Netlify (호스팅)

## 로컬 개발

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run lint
```

Node 20 권장 (`.nvmrc` 참고).

## 환경변수

`.env.example` 참고. 로컬은 `.env`, 운영은 Netlify Site configuration → Environment variables.

| Key | 용도 |
|---|---|
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon public key |
| `VITE_API_URL` | (mock 모드 등 보조 API용) |
| `VITE_USE_MOCK` | `true`면 mock dataService 사용 |

## Supabase

- 프로젝트 ref: `xtdxuhherccakugpcwio`
- 마이그레이션: `supabase/migrations/`
- 적용: `supabase db push --linked`

회원가입 도메인 화이트리스트는 `public.allowed_email_domains` 테이블로 관리. 관리자 권한 사용자는 AdminPage에서 추가/삭제 가능. SQL 직접 추가:

```sql
insert into public.allowed_email_domains (domain, description)
values ('example.ac.kr', '설명');
```

## 배포 (Netlify)

- 빌드 명령: `npm run build`, 퍼블리시 디렉토리: `dist` (`netlify.toml`)
- 환경변수 변경 후엔 **Trigger deploy → Clear cache and deploy site** 필수 (Vite는 빌드 시점에 변수를 번들에 굽기 때문)

## 운영 TODO

### 🔴 SMTP 연결 (미완료)

현재 Supabase 내장 메일서버 사용 중 → **시간당 약 2~4통 한도**. 가입자 늘기 전에 외부 SMTP로 전환 필요.

**권장: Resend (무료 3000통/월)**

1. https://resend.com 가입 → API Key 발급 (`re_...`)
2. 본인 도메인이 있으면 Resend → Domains 에 등록 + DNS(SPF/DKIM) 설정 (없으면 일단 `onboarding@resend.dev` 로 본인 메일 한정 테스트)
3. Supabase Dashboard → Authentication → Emails → SMTP Settings → Enable Custom SMTP:
   - Host: `smtp.resend.com`
   - Port: `465`
   - Username: `resend`
   - Password: 발급받은 API Key
   - Sender email / name: 위 2단계에 맞춰
4. Authentication → Users → 본인 계정 → Send magic link 로 발송 검증

대체 provider (SendGrid/SES/Mailgun) 도 동일하게 SMTP 정보 입력만 다르면 됨.

### 기타

- [ ] Resend 도메인 인증 후 운영 sender 주소 확정
- [ ] 이메일 템플릿 한국어화 (Authentication → Email Templates)
- [ ] AdminPage 화이트리스트 관리 UX 다듬기

## 관련 문서

- [PLANNING.md](./PLANNING.md) — 본 기획서 (Step 1~8 전체 명세)
- [PLANNING_EXTENSION.md](./PLANNING_EXTENSION.md) — 확장 기획 (마켓플레이스/기업회원 등)
- [PLANNING_SALARY_TRUTH.md](./PLANNING_SALARY_TRUTH.md) — 사례비 진실 DB & 초빙 유입 루프 (웨지 빌드 스펙)
