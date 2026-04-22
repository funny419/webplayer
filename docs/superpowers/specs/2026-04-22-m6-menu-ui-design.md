# M6 메뉴 UI 설계 스펙

**날짜:** 2026-04-22
**마일스톤:** M6 (UI 폴리싱·버그 픽스·QA)
**담당:** web-dev
**상태:** 확정

---

## 1. 배경 및 목표

M5까지 인벤토리(`InventorySystem`), 퀘스트(`QuestSystem`), 세이브(`SaveManager`) 데이터 시스템은 구현됐으나 시각적 UI 패널이 없다. M6에서 플레이어가 아이템 확인·사용, 퀘스트 진행 상황 조회, 세이브를 할 수 있는 메뉴 UI를 구현한다.

---

## 2. 아키텍처

### 2.1 DOM 오버레이 방식

Phaser 캔버스 위에 HTML/CSS `div#menu-overlay`를 `position: absolute; z-index: 10`으로 배치한다. 기존 HUD(HP/MP 바, 대시 인디케이터)는 Phaser 방식 그대로 유지한다.

```
┌──────────────────────────────────────────┐
│  <div id="menu-overlay">  z-index: 10    │
│    탭 바 · 인벤토리 · 퀘스트 · 세이브   │
├──────────────────────────────────────────┤
│  Phaser Canvas (WorldScene)              │
│    HUD (hp/mp/dash) — 기존 유지          │
└──────────────────────────────────────────┘
```

### 2.2 열기/닫기

| 입력 | 동작 |
|------|------|
| `I` 키 | 메뉴 표시 + 인벤토리 탭 활성 + `this.scene.pause()` |
| `Q` 키 | 메뉴 표시 + 퀘스트 탭 활성 + `this.scene.pause()` |
| `ESC` 키 | 메뉴 숨김 + `this.scene.resume()` |

WorldScene이 pause 상태에서는 `update()` 루프가 멈추므로 전투·이동 입력이 차단된다.

---

## 3. 컴포넌트 설계

### 3.1 탭 바

3개 탭: **📦 인벤토리 / 📜 퀘스트 일지 / 💾 세이브**

- 활성 탭: 노란색(`#f1c40f`) + 하단 2px 밑줄
- 비활성 탭: 회색(`#555`)
- 세이브 탭: 하벤 마을(`scene_haven`)이 아닐 경우 비활성화(클릭 불가, 툴팁 표시)
- 우측 끝: `[ESC] 닫기` 힌트 텍스트

### 3.2 인벤토리 탭

**레이아웃:** 좌측 그리드 + 우측 상세 패널

#### 좌측 — 아이템 그리드

3개 카테고리 섹션으로 구분:

1. **소비 아이템** — 6열 그리드. 각 슬롯 32×32px. 보유 수량 배지(우하단).
2. **장비** — 무기·갑옷 각 1칸(현재 장착 중인 아이템).
3. **🗝 키 아이템** — 획득한 키 아이템 목록(가로 나열).

슬롯 상태:
- 선택된 슬롯: 노란 테두리(`border: 2px solid #f1c40f`)
- 빈 슬롯: 점선 테두리(`border: 1px dashed #444`)

#### 우측 — 상세 패널 (130px 고정)

선택된 아이템 표시:
- 아이템 이름(색상 코딩: 소비 빨강, 장비 보라, 키 아이템 노랑)
- 효과 설명 + 보유 수량
- **사용 버튼** (`Enter` 또는 클릭) — 소비 아이템에만 표시
- 장비: **장착 버튼** — 직업 제한(`balance.json`) 검사 후 착용 불가 시 경고 텍스트

### 3.3 퀘스트 일지 탭

**레이아웃:** 좌측 퀘스트 목록 + 우측 상세

#### 좌측 — 퀘스트 목록

- 진행 중 퀘스트: 노란 강조(`#f1c40f22` 배경)
- 완료된 퀘스트: 회색 + `✓` 접미사
- 메인 퀘스트(mq_*)와 사이드 퀘스트(sq_*) 구분 없이 혼합 표시 (시간순)

#### 우측 — 퀘스트 상세

- 퀘스트 제목, 의뢰자
- 🎯 현재 목표 (QuestSystem에서 미완료 objective 조회)
- 보상 목록

### 3.4 세이브 탭

- **세이브 슬롯 1개** (LocalStorage 키: `webplayer_save_v1`)
- 저장 정보: 플레이 시간, 레벨, 현재 위치, 저장 일시
- 버튼: **저장하기** / **불러오기**
- 하벤 마을 외 접근 시: 탭 자체 비활성화, `"마을에서만 저장할 수 있습니다"` 툴팁

---

## 4. 데이터 흐름

```
InventorySystem.getSnapshot()  →  renderInventory()
QuestSystem.getAllQuests()      →  renderQuestLog()
SaveManager.save() / load()    →  renderSavePanel()

아이템 사용:
  DOM 클릭 → InventorySystem.useItem(id)
           → Phaser 이벤트('item_used') 발생
           → WorldScene에서 플레이어 HP/MP 갱신
           → HUD 즉시 업데이트
```

---

## 5. 파일 구조

```
web/src/
  ui/
    MenuOverlay.ts   # DOM 오버레이 생성·제어 클래스
  scenes/
    WorldScene.ts    # I/Q/ESC 키 바인딩 추가, MenuOverlay 연동
```

`MenuOverlay` 클래스:
- `constructor(scene, inventorySystem, questSystem, saveManager)`
- `open(tab: 'inventory' | 'quest' | 'save')` / `close()`
- `renderInventory()` / `renderQuestLog()` / `renderSave()`

---

## 6. 제약 및 규칙

- `vite build` + `tsc --noEmit` 성공 후 Done 처리
- DOM 스타일은 인라인 또는 `<style>` 태그 삽입 방식 (외부 CSS 파일 불필요)
- 모바일(Android WebView) 대응: 터치 이벤트도 클릭과 동일하게 처리
- 세이브 탭 비활성화 조건: `WorldScene.currentArea === 'scene_haven'` 확인

---

## 7. 성공 기준

1. I키 → 인벤토리 탭 열림, 월드씬 일시정지
2. Q키 → 퀘스트 탭 열림
3. ESC → 메뉴 닫힘, 게임 재개
4. 인벤토리에서 소형 포션 사용 시 플레이어 HP 증가 + HUD 갱신
5. 퀘스트 목록에서 진행 중 퀘스트 선택 시 목표 표시
6. 하벤 마을에서 저장 → localStorage에 데이터 기록
7. `tsc --noEmit` 오류 없음, `vite build` 성공
