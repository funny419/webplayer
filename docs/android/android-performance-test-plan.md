# Android WebView 성능 검증 스파이크 — 테스트 계획

**이슈:** #9
**마일스톤:** M2
**완료 기준:** 30FPS 이상 안정적 동작 또는 최적화 계획 수립

---

## 1. 테스트 환경

### 1.1 대상 기기

| 등급 | 기준 | 목적 |
|------|------|------|
| 하급 | API 24 (Android 7.0), RAM 2GB, Snapdragon 425급 | 최소 지원 환경 |
| 중급 | API 28~30, RAM 4GB, Snapdragon 660급 | 일반 사용자 대표 |
| 고급 | API 33+, RAM 8GB, Snapdragon 8급 | 최대 성능 기준선 |

에뮬레이터 사용 시: **Google Play API 이미지** 권장 (Chrome WebView 포함)
→ AVD Manager → API 24, x86_64, Google APIs 이미지

### 1.2 에셋 복사 절차 (M2 빌드 수신 후)

```bash
# 1. web-dev로부터 web/dist/ 빌드 완성 신호 수신
# 2. 에셋 복사
cp -r web/dist/* android/app/src/main/assets/

# 3. Android Studio에서 빌드 & 실행
# Run > Run 'app' (기기/에뮬레이터 선택)
```

---

## 2. FPS 측정 방법

### 방법 A: Chrome Remote DevTools (권장, 가장 정밀)

1. 기기에서 앱 실행 (debug 빌드)
2. PC Chrome에서 `chrome://inspect` 접속
3. WebView 항목 → **inspect** 클릭
4. Performance 탭 → **Record** → 30초 게임플레이
5. **Frames** 섹션에서 FPS 그래프 확인

> `MainActivity.kt`에 디버깅 활성화가 필요합니다 (개발 빌드 한정):
> ```kotlin
> if (BuildConfig.DEBUG) {
>     WebView.setWebContentsDebuggingEnabled(true)
> }
> ```

### 방법 B: Phaser Stats 플러그인 (인게임 오버레이)

`web/src/` 게임 코드에 추가 (web-dev 협조 필요):

```typescript
// main.ts 또는 BootScene에 추가
const config: Phaser.Types.Core.GameConfig = {
    // ...
    plugins: {
        global: [{
            key: 'rexFpsPlugin',
            // 또는 Phaser 내장 게임 오브젝트 활용
        }]
    }
};

// 씬 내에서 간단한 FPS 표시
this.add.text(10, 10, '', { fontSize: '12px', color: '#00ff00' })
    .setDepth(999)
    .setScrollFactor(0);

// update()에서:
fpsText.setText(`FPS: ${Math.round(this.game.loop.actualFps)}`);
```

### 방법 C: Android Profiler (CPU/메모리 병목 분석)

Android Studio → **View > Tool Windows > Profiler**
- CPU 프로파일링: 메인 스레드 vs WebView 렌더 스레드 부하 확인
- Memory: JS 힙 누수 여부 확인

---

## 3. 측정 시나리오

### 3.1 기본 씬 렌더링 (M2 단계)

| 시나리오 | 측정 항목 | 기준 |
|---------|----------|------|
| 빈 월드 씬 로드 | 초기 로드 시간, 초기 FPS | 로드 3초 이내 |
| 플레이어 이동 | 이동 중 FPS | 30FPS 이상 |
| 적 10마리 동시 활성 | FPS 저하 폭 | 드롭 10FPS 이내 |
| 파티클/이펙트 (공격) | FPS 순간 저하 | 드롭 15FPS 이내 |
| 60초 연속 플레이 | 평균 FPS, 메모리 증가량 | 메모리 누수 없음 |

### 3.2 입력 지연 측정

- **터치 입력**: 화면 탭 → 캐릭터 반응까지 체감 지연
  - 허용 기준: 100ms 이내 (체감 즉각적)
- **측정법**: 슬로모션 촬영(60fps 기록) 후 프레임 카운트
- **가상 키패드 고려**: 모바일 전용 터치 컨트롤 UI 추후 필요 여부 확인

---

## 4. 최적화 대응 계획

성능이 기준 미달일 경우 우선순위 순서:

### Tier 1: 설정 변경 (코드 수정 최소)

```kotlin
// MainActivity.kt — 렌더링 최적화
webView.settings.apply {
    // 하드웨어 가속 (기본값이지만 명시적 설정)
    // AndroidManifest.xml의 <application android:hardwareAccelerated="true"> 확인
}

// WebView 레이어 타입 설정
webView.setLayerType(View.LAYER_TYPE_HARDWARE, null)
```

### Tier 2: Phaser 설정 조정 (web-dev 협조)

```typescript
// main.ts
const config = {
    type: Phaser.WEBGL,          // CANVAS 대신 WebGL 강제
    backgroundColor: '#000000',
    render: {
        antialias: false,        // 안티앨리어싱 비활성화
        pixelArt: true,          // 픽셀아트 스케일링 최적화
        powerPreference: 'high-performance'
    },
    fps: {
        target: 30,              // 60→30으로 타겟 낮춤 (배터리 절약)
        forceSetTimeOut: false
    }
};
```

### Tier 3: 콘텐츠 최적화

- 동시 활성 적 수 제한 (오프스크린 적 비활성화)
- 텍스처 아틀라스 사용 (여러 스프라이트 → 1개 스프라이트시트)
- 파티클 이펙트 수 제한

### Tier 4: 성능 허용 불가 판정

30FPS 달성 불가 시 → PM과 협의:
- 해상도 스케일 다운 (0.75x)
- 특정 이펙트 Android 전용 비활성화

---

## 5. 결과 보고 형식

테스트 완료 후 아래 형식으로 팀장에게 보고:

```
## 성능 측정 결과 (기기명, Android 버전)

| 시나리오 | FPS | 판정 |
|---------|-----|------|
| 기본 이동 | XX | PASS/FAIL |
| 적 10마리 | XX | PASS/FAIL |
| ...      | .. | ...      |

입력 지연: XXms (PASS/FAIL)
메모리 60초 후 증가량: XXmb

결론: PASS / 최적화 필요 (Tier N 적용 권고)
```
