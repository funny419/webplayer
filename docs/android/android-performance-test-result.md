# Android WebView 성능 검증 결과 — M2 스파이크

**이슈:** #9
**날짜:** 2026-04-20
**빌드:** `web/dist/` (vite build, M2 이동/대시 포함)

---

## 요약

| 항목 | 결과 |
|------|------|
| 에셋 복사 | ✅ 완료 (`web/dist/` → `android/app/src/main/assets/`) |
| 실기기 FPS 측정 | ⚠️ 사용자 직접 실행 필요 (에뮬레이터 환경 없음) |
| 정적 분석 | ✅ 완료 — 이슈 3건 발견 |

---

## 정적 분석 발견 이슈

### 이슈 1 (수정 완료): `allowFileAccessFromFileURLs` 미설정 ✅
- **원인**: Vite 빌드 HTML이 `<script type="module" crossorigin>` 생성
- **영향**: API 24~29 일부 구형 WebView에서 `file://` 상의 모듈 스크립트 로드 실패 가능
- **조치**: `MainActivity.kt`에 `allowFileAccessFromFileURLs = true` 추가 (커밋 예정)

### 이슈 2 (web-dev 조치 필요): FPS 오버레이 프로덕션 빌드에서 비활성

```typescript
// WorldScene.ts:30, 107
if (import.meta.env.DEV) { ... }        // 프로덕션에서 false로 트리셰이킹
.setVisible(import.meta.env.DEV)        // fpsText 생성 시 hidden
```

- **영향**: `npm run build` dist에서는 FPS 오버레이가 표시되지 않음
- **조치**: 두 가지 중 택1
  - **A** (권장): `vite.config.ts`에서 `define: { 'import.meta.env.DEV': 'true' }` 를 dev 빌드에만 적용, 혹은 별도 `npm run build:debug` 스크립트 추가
  - **B** (임시): `chrome://inspect` DevTools Performance 탭으로 FPS 측정 (오버레이 없어도 가능)

### 이슈 3 (모니터링): JS 번들 크기 1.4MB

| 파일 | 크기 | 비고 |
|------|------|------|
| `assets/index-CNDTxNj6.js` | 1.4MB | Phaser.js 라이브러리 포함 |
| `assets/sprites/` | 72KB | 스프라이트시트 |
| **전체 assets/** | **1.5MB** | `file://` 로드 시 gzip 없음 |

- **영향**: 저사양 기기(Snapdragon 425급, RAM 2GB)에서 초기 JS 파싱 시 3~5초 블로킹 예상
- **조치**: M6(최적화) 단계에서 Phaser.js code-splitting 검토. M2 단계에서는 허용.

---

## 실기기 테스트 절차 (사용자 직접 수행)

```bash
# 1. Android Studio에서 기기/에뮬레이터 연결 확인
adb devices

# 2. 앱 빌드 & 설치
# Android Studio: Run > Run 'app' (debug 빌드 선택)

# 3. chrome://inspect 연결 (PC Chrome 브라우저)
# 주소창: chrome://inspect → WebView 항목 → "inspect"

# 4. Performance 탭 → Record → 30초 이동/대시 플레이 → Stop

# 5. Frames 섹션에서 FPS 확인
```

### 측정 체크리스트

- [ ] 기기 정보 기록 (모델명, Android 버전, WebView 버전)
- [ ] 초기 로드 시간 (앱 실행 → 게임 시작까지)
- [ ] 일반 이동 FPS (30초 평균)
- [ ] 대시 직후 FPS (순간 드롭 확인)
- [ ] 60초 연속 후 메모리 증가량 (chrome://inspect → Memory)
- [ ] 터치 입력 지연 체감 (이상 시 슬로모션 촬영)

---

## 판정 기준

| FPS | 판정 | 조치 |
|-----|------|------|
| 30FPS 이상 | PASS | 없음 |
| 20~30FPS | 조건부 PASS | Tier 2 Phaser config 적용 후 재측정 |
| 20FPS 미만 | FAIL | Tier 1~3 전체 적용, PM 보고 |
