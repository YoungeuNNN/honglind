# 홍라인드 시드 (런칭 전 초기 콘텐츠 적재)

빈 커뮤니티의 "빈 방 효과"를 피하려고 초기 글/댓글을 미리 채워 넣는 도구입니다.
`service_role` 키로 동작해 RLS 를 우회하고, 여러 시드 계정 명의로 글·댓글·반응을 적재합니다.

## 구성

| 파일 | 역할 |
|---|---|
| `seed-content.mjs` | **여기에 내용을 채웁니다.** 계정/글/댓글 데이터 |
| `seed.mjs` | 적재 러너 (계정 생성 → 글 → 댓글 → 좋아요/기도) |
| `promote-seed.sql` | 적재 후 시드 계정을 승인·인증 상태로 (SQL 에디터 1회 실행) |
| `teardown.mjs` | 롤백 — 시드 계정과 글을 전부 삭제 |
| `.env.seed.example` | 환경변수 템플릿 |

## 순서

```bash
# 1) 키 설정
cp scripts/seed/.env.seed.example scripts/seed/.env.seed
#    → .env.seed 에 service_role(secret) 키 입력
#    (Supabase 대시보드 → Project Settings → API → service_role)

# 2) seed-content.mjs 에 글/댓글 채우기 (목표: 계정 20 · 글 60)

# 3) 검증 (쓰기 없음)
node scripts/seed/seed.mjs --dry

# 4) 실제 적재
node scripts/seed/seed.mjs

# 5) Supabase 대시보드 SQL 에디터에서 promote-seed.sql 실행
#    → 시드 계정이 '승인·인증' 상태가 되어 작성자 상태와 일치

# (롤백이 필요하면)
node scripts/seed/teardown.mjs
```

## 티 안 나게 채우는 팁

- `daysAgo` 를 0~28 사이로 흩뿌린다. 전부 오늘이면 즉시 가짜 티.
- 댓글은 글보다 **뒤 시점**으로. 모든 글에 댓글을 달지 않는다(댓글 0이 자연스러움).
- 계정마다 말투를 다르게(진지/캐주얼/짧은 한 줄/오타).
- 카테고리는 `자유`·`사역고민`·`기도요청` 위주로 편중, `신학토론`은 드물게.
- **검증 불가능한 사실 주장은 넣지 않는다** — 특정 교회 실명·실제 사례비 금액 등.
  인증 뱃지를 단 시드 계정이 그런 글을 쓰면, 나중에 진짜 유저가 정보로 신뢰했다가
  어긋날 때 커뮤니티 신뢰가 깨진다. 공감·고민·일상 대화로 분위기만 살린다.

## 주의

- `.env.seed` 의 service_role 키는 **RLS 를 우회하는 마스터 키**다. 커밋·공유 금지(.gitignore 처리됨).
- 시드 계정 이메일은 `@seed.honglind.local`. `promote-seed.sql` / `teardown.mjs` 가 이 패턴으로 시드를 식별한다.
- 적재는 **실제 운영 DB** 에 들어간다(mock 아님). 런칭 후에도 그대로 노출된다.
