# Android M3 사전 준비 메모

---

## 1. 터치 입력 대응 계획

### 배경
현재 게임은 키보드 입력만 지원 (`Player.ts` 내 `cursors` + 스페이스바 대시).
Android WebView에는 물리 키보드가 없으므로, 화면 터치 컨트롤이 필수.

### 디자이너 준비 에셋 (확인됨)

| 파일 | 용도 |
|------|------|
| `design/ui/hud/mobile_dpad.png` | 8방향 이동 D-Pad |
| `design/ui/hud/mobile_btn_attack.png` | 공격 버튼 |
| `design/ui/hud/mobile_btn_dash.png` | 대시 버튼 |

### 구현 방식 (web-dev 담당, Android-aware 설계)

**방식 A: CSS/HTML 오버레이 (권장)**
- `<div>` 기반 가상 D-Pad를 게임 캔버스 위에 렌더링
- `touchstart` / `touchmove` / `touchend` 이벤트로 방향 감지
- Phaser input 시스템과 분리 — 웹 브라우저에서도 마우스로 조작 가능

```
[게임 캔버스 960×540]
 ┌──────────────────────────────┐
 │                              │
 │       (게임 화면)             │  ← Phaser canvas
 │                              │
 │  [D-Pad]         [⚔] [→]    │  ← HTML div overlay (position:absolute)
 └──────────────────────────────┘
```

**방식 B: Phaser 내장 터치 (대안)**
- `this.input.addPointer()` + 존 감지
- Phaser만으로 완결되지만 D-Pad 이미지 렌더링이 복잡

**권고: 방식 A** — 에셋이 PNG로 준비되어 있고, CSS로 배치가 간단.

### Android 측 필요 설정

현재 `MainActivity.kt`에 추가 불필요.
단, viewport `user-scalable=no` 확인이 필요:

```html
<!-- index.html — 핀치 줌 방지 -->
<meta name="viewport" content="width=device-width, initial-scale=1.0,
      user-scalable=no, maximum-scale=1.0">
```

현재 `index.html`은 `user-scalable` 미설정 → **web-dev 확인 요청 필요**.

### M3 스코프 (web-dev 담당)

- [ ] HTML 터치 오버레이 구현 (`mobile_dpad.png`, `mobile_btn_attack.png`, `mobile_btn_dash.png` 사용)
- [ ] `touchstart/move/end` → Phaser input 이벤트 브리지
- [ ] `index.html` viewport `user-scalable=no` 추가
- [ ] Android WebView에서 터치 지연 제거: `touch-action: none` CSS 설정

---

## 2. M6 번들 최적화 메모

### 현재 상태 (M2 기준)

```
index-CNDTxNj6.js  1,485 KB  (Phaser 3 전체 번들 포함)
sprites/           72 KB
tilesets           (미포함, 아직 없음)
```

### 최적화 방안 (M6 단계 적용 순서)

#### Step 1: Phaser 트리셰이킹 (최대 효과 예상)
```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],        // Phaser만 별도 청크 → 캐시 재활용
        },
      },
    },
  },
});
```
Phaser 전체 import 대신 필요 모듈만 import하면 500KB+ 절약 가능.
단, Phaser 3는 트리셰이킹 지원이 제한적 → 효과 측정 후 판단.

#### Step 2: 에셋 최적화
- 스프라이트시트 → WebP 변환 (PNG 대비 30~50% 감소)
- 타일셋 atlas 통합 (여러 파일 → 1개)

#### Step 3: 지연 로딩 (M6 이후)
```typescript
// 씬별 동적 import
const { BossScene } = await import('./scenes/BossScene');
```
초기 번들에 보스 씬 코드 제외 → 첫 로드 최적화.

### 목표
| 단계 | 번들 크기 | 초기 로드 (저사양) |
|------|---------|----------------|
| M2 현재 | 1.4MB | ~3~5초 예상 |
| M6 목표 | <700KB | <2초 |
