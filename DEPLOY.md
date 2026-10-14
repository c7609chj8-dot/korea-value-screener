# Vercel 배포 안내

## 확인된 상태

- Next.js 16.4.0 프로덕션 빌드 통과
- 재무 계산·CSV 검증 테스트 10개 통과
- 데스크톱·모바일·CSV 업로드·API 제거 브라우저 테스트 4개 통과
- 프로덕션 의존성 npm audit: 0 vulnerabilities

## GitHub에서 Vercel로 배포

1. Vercel의 Add New → Project에서 업로드한 GitHub 저장소를 선택합니다.
2. Framework Preset은 Next.js, Root Directory는 저장소 루트로 설정합니다.
3. Install Command는 `npm ci`, Build Command는 `npm run build`로 설정합니다.
4. Node.js 22.x 또는 24.x를 선택하고 Deploy를 실행합니다.

공식 API를 제거한 버전이므로 API 인증키와 별도 환경변수는 필요하지 않습니다.

## CLI로 배포

프로젝트 폴더에서 실행하세요. 기존 서비스 대신 새 프로젝트 `korea-value-screener`을 선택합니다.

```powershell
npm ci
npm test
npm run build
npx vercel login
npx vercel link --project korea-value-screener
npx vercel project inspect --non-interactive
npx vercel deploy --prod
```

로그인은 본인이 완료하세요. 링크 시 소유 계정과 팀을 확인한 뒤 진행합니다. `project inspect` 결과가 의도한 새 프로젝트와 다르면 배포를 중단하고 연결을 수정하세요. 배포 후 READY 상태와 공개 URL을 확인하고 CSV 업로드·필터·모바일 동작을 다시 점검하세요.

공식 API 기능을 제거한 CSV 전용 버전입니다. API 인증키와 앱용 환경변수는 필요하지 않습니다.

## 실제 데이터 연결 시 결정할 사항

- 개인용 검색기: 본인이 이용 권한을 보유한 CSV를 업로드하여 브라우저 내 분석
- 공개 서비스: 종목·가격·재무 공급원, 재배포 허용 범위, 비용 확정 후 수집과 저장소 연결
- 실전 지표 확장: TTM, 최신 분기 전년 동기 비교, 업종별 평가, 일회성 이익과 희석 위험 검토
- 점수 검증: 공시 발표 시점을 보존한 과거 데이터로 검증. 단순 현재 재무 데이터로 과거 수익률을 계산하면 미래 정보 편향 발생
