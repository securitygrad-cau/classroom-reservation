# 융합보안학과 강의실 대여 웹페이지

## 1. 기술 스택 & 아키텍처

```
[React (Vite) 프론트엔드]  ⇄  fetch (/api/*)  ⇄  [Express 백엔드]  ⇄  [Prisma ORM]  ⇄  [SQLite DB]
```

- **프론트엔드**: React + Vite + TailwindCSS
  - 별도 상태관리 라이브러리 없이 React state로 충분 (규모가 크지 않음)
- **백엔드**: Node.js + Express
  - REST API 방식. 인증은 조교(관리자)만 JWT 토큰 기반 로그인 필요, 일반 신청자는 로그인 없이 신청 가능 (교내 사무실용 소규모 시스템이라 간소화)
- **DB**: 개발 단계는 SQLite (설치 없이 파일 하나로 동작) → 실제 배포 시 `schema.prisma`의 `provider`만 `postgresql`로 바꾸면 그대로 전환 가능
- **배포 아이디어**: 프론트는 Vercel/Netlify, 백엔드+DB는 Railway/Render 같은 무료~저가 PaaS에 올리면 학과 사무실 규모에는 충분합니다.

왜 이 구조인가?
- 액셀 대체가 목적이므로 복잡한 인프라보다 "설치 쉽고, 조교 한 명이 유지보수 가능한" 구조를 우선했습니다.
- 신청자는 로그인 없이 바로 신청 → 진입장벽을 낮춤 (대신 신청 시 이름/연락처를 필수로 받아 본인 확인).
- 승인은 조교만 가능하도록 별도 로그인 분리.

## 2. 핵심 승인 로직 (요구사항의 핵심)

- 예약은 항상 `PENDING`(대기)으로 생성됩니다. 자동 승인 없음.
- 같은 시간대에 여러 명이 동시에 신청(PENDING)하는 것은 허용됩니다 — 조교가 우선순위(교수 요청 등)를 보고 판단해야 하기 때문입니다.
- 단, 이미 `APPROVED`(확정)된 시간대와 겹치는 신규 신청은 서버에서 거부됩니다.
- 교수가 신청하면 `isPriority = true`로 자동 표시되어 조교 승인 화면 맨 위에 노출됩니다.
- 조교가 하나를 승인하면, 같은 시간대에 겹쳐 있던 다른 PENDING 신청들은 자동으로 REJECTED 처리되고 사유가 남습니다.

## 3. DB 스키마 요약 (`backend/prisma/schema.prisma`)

- **Room**: 강의실 (506호/512호/B1 105-1호/721호)
- **Reservation**: 예약 1건 = 강의실 + 날짜 + 시작슬롯~종료슬롯(30분 단위, 0~48) + 신청자 정보 + 상태(PENDING/APPROVED/REJECTED)
- **Admin**: 조교 로그인 계정

## 4. 실행 방법

### 백엔드
```bash
cd backend
npm install
cp .env.example .env
npx prisma migrate dev --name init   # DB(dev.db) 생성
npm run seed                          # 강의실 4개 + 관리자 계정(admin/changeme123) 생성
npm run dev                           # http://localhost:4000
```

### 프론트엔드
```bash
cd frontend
npm install
npm run dev                           # http://localhost:5173
```

`vite.config.js`에 `/api` 프록시가 설정되어 있어 별도 CORS 설정 없이 바로 연결됩니다.

## 5. 앞으로 확장하면 좋을 것들

- 조교 승인/거절 시 신청자에게 이메일·문자 알림 발송
- 승인된 예약을 캘린더(구글 캘린더 등)와 연동
- 신청자 본인이 자신의 신청 내역을 조회/취소할 수 있는 페이지
- 관리자 비밀번호 변경 화면 (현재는 seed 스크립트로만 초기 생성)
 
