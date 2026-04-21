# 에셋 목록

**프로젝트:** 웹 기반 탑다운 2D 액션 RPG
**날짜:** 2026-04-20
**작성:** 디자인 담당 (DS)

> 범례: 🔲 미시작 / 🔶 진행중 / ✅ 완료 / 📦 Placeholder

---

## 1. 플레이어 스프라이트 (`sprites/player/`)

| 에셋 이름 | 크기 | 프레임 수 | 상태 | 비고 |
|-----------|------|-----------|------|------|
| `player_idle.png` | 64×32 | 2 | 📦 | 기본 대기 애니메이션 |
| `player_walk_down.png` | 128×32 | 4 | 📦 | 하향 이동 |
| `player_walk_up.png` | 128×32 | 4 | 📦 | 상향 이동 |
| `player_walk_left.png` | 128×32 | 4 | 📦 | 좌향 이동 |
| `player_walk_right.png` | 128×32 | 4 | 📦 | 우향 이동 |
| `player_attack_melee.png` | 128×32 | 4 | 📦 | 근접 공격 (검) |
| `player_attack_ranged.png` | 128×32 | 4 | 📦 | 원거리 공격 (활/마법) |
| `player_dash.png` | 96×32 | 3 | 📦 | 대시 동작 |
| `player_hurt.png` | 64×32 | 2 | 📦 | 피격 |
| `player_death.png` | 128×32 | 4 | 📦 | 사망 |

---

## 2. 적 스프라이트 (`sprites/enemies/`)

### 일반 적 (Normal) — 목표: 10~15종
| 에셋 이름 | 크기 | 프레임 수 | 상태 | 비고 |
|-----------|------|-----------|------|------|
| `goblin_walk_down.png` | 128×32 | 4 | 📦 | 기본 근접 적 (하향) |
| `goblin_walk_up.png` | 128×32 | 4 | 📦 | (상향) |
| `goblin_walk_left.png` | 128×32 | 4 | 📦 | (좌향) |
| `goblin_walk_right.png` | 128×32 | 4 | 📦 | (우향) |
| `goblin_attack.png` | 128×32 | 4 | 📦 | |
| `goblin_death.png` | 96×32 | 3 | 📦 | |
| `slime_walk.png` | 128×32 | 4 | 📦 | 단방향 (대칭) |
| `slime_attack.png` | 32×32 | 3 | 🔲 | |
| `slime_death.png` | 128×32 | 4 | 📦 | |
| `skeleton_walk.png` | 32×32 | 4×4방향 | 🔲 | 언데드 계열 |
| `skeleton_attack.png` | 32×32 | 4 | 🔲 | |
| `skeleton_death.png` | 32×32 | 3 | 🔲 | |
| `orc_walk.png` | 32×32 | 4×4방향 | 🔲 | 엘리트 근접 |
| `orc_attack.png` | 32×32 | 4 | 🔲 | |
| `bat_fly.png` | 32×32 | 4 | 🔲 | 비행 적 (단방향) |
| `bat_attack.png` | 32×32 | 3 | 🔲 | |
| `spider_walk.png` | 32×32 | 4×4방향 | 🔲 | |
| `spider_attack.png` | 32×32 | 3 | 🔲 | 독 이펙트 |

### 보스 — 목표: 5종
| 에셋 이름 | 크기 | 프레임 수 | 상태 | 비고 |
|-----------|------|-----------|------|------|
| `boss_01_idle.png` | 64×64 | 4 | 🔲 | 보스 1: 던전 수호자 |
| `boss_01_attack.png` | 64×64 | 6 | 🔲 | |
| `boss_01_death.png` | 64×64 | 6 | 🔲 | |
| `boss_02_idle.png` | 64×64 | 4 | 🔲 | 보스 2: 스켈레톤 킹 |
| `boss_02_attack.png` | 64×64 | 6 | 🔲 | |
| `boss_02_death.png` | 64×64 | 6 | 🔲 | |
| `boss_03_idle.png` | 64×64 | 4 | 🔲 | 보스 3 (미정) |
| `boss_04_idle.png` | 64×64 | 4 | 🔲 | 보스 4 (미정) |
| `boss_05_idle.png` | 64×64 | 4 | 🔲 | 보스 5 (미정) |

---

## 3. NPC 스프라이트 (`sprites/npc/`)

목표: 10~15명

| 에셋 이름 | 크기 | 프레임 수 | 상태 | 비고 |
|-----------|------|-----------|------|------|
| `npc_elder.png` | 32×32 | 2 | 📦 | 퀘스트 주요 NPC |
| `npc_merchant.png` | 32×32 | 2 | 📦 | 상인 |
| `npc_blacksmith.png` | 32×32 | 2 | 📦 | 대장장이 |
| `npc_guard.png` | 32×32 | 2 | 📦 | 마을 경비 |
| `npc_villager_01.png` | 32×32 | 2 | 📦 | 일반 마을 주민 |
| `npc_villager_02.png` | 32×32 | 2 | 📦 | |
| `npc_villager_03.png` | 32×32 | 2 | 📦 | |
| `npc_child.png` | 32×32 | 2 | 📦 | |
| `npc_innkeeper.png` | 32×32 | 2 | 📦 | 여관 주인 |
| `npc_mage.png` | 32×32 | 2 | 📦 | 마법사 |

---

## 4. 전투 이펙트 (`sprites/effects/`)

| 에셋 이름 | 크기 | 프레임 수 | 상태 | 비고 |
|-----------|------|-----------|------|------|
| `hit_melee.png` | 32×32 | 3 | 🔲 | 근접 히트 섬광 |
| `hit_magic.png` | 32×32 | 5 | 🔲 | 마법 히트 파티클 |
| `dash_trail.png` | 32×32 | 3 | 🔲 | 대시 잔상 |
| `arrow_projectile.png` | 16×8 | 1 | 🔲 | 화살 |
| `magic_projectile.png` | 16×16 | 4 | 🔲 | 마법 투사체 |
| `heal_effect.png` | 32×32 | 4 | 🔲 | 회복 이펙트 |
| `death_effect.png` | 32×32 | 4 | 🔲 | 적 사망 파티클 |
| `torch_flame.png` | 16×24 | 4 | 🔲 | 횃불 (환경) |
| `exp_orb.png` | 8×8 | 4 | 🔲 | 경험치 오브 |
| `item_drop.png` | 16×16 | 2 | 🔲 | 아이템 드롭 반짝임 |

---

## 5. 타일셋 (`tilesets/`)

### 마을 타일셋 (`tilesets/town/`)
| 에셋 이름 | 크기 | 상태 | 비고 |
|-----------|------|------|------|
| `town_ground.png` | 32×32 타일셋 | 🔲 | 석조 길, 흙길, 잔디 |
| `town_buildings.png` | 32×32 타일셋 | 🔲 | 건물 외벽, 지붕, 문 |
| `town_props.png` | 32×32 타일셋 | 🔲 | 우물, 가로등, 간판, 나무 |
| `town_interior.png` | 32×32 타일셋 | 🔲 | 건물 내부 바닥/가구 |

### 야외 타일셋 (`tilesets/world/`)
| 에셋 이름 | 크기 | 상태 | 비고 |
|-----------|------|------|------|
| `world_ground.png` | 32×32 타일셋 | 🔲 | 풀밭, 흙길, 물 |
| `world_nature.png` | 32×32 타일셋 | 🔲 | 나무, 바위, 덤불 |
| `world_transitions.png` | 32×32 타일셋 | 🔲 | 절벽 엣지, 지형 전환 |

### 던전 타일셋 (`tilesets/dungeon/`)
| 에셋 이름 | 크기 | 상태 | 비고 |
|-----------|------|------|------|
| `dungeon_floor.png` | 128×128 (4×4) | 📦 | 석재 바닥 (8종 변형) |
| `dungeon_walls.png` | 128×128 (4×4) | 📦 | 석재 벽, 코너, 문 포함 |
| `dungeon_props.png` | 128×96 (4×3) | 📦 | 횃불, 상자, 함정, 바렐, 해골 등 |
| `dungeon_puzzles.png` | 128×128 (4×4) | 📦 | 거울 반사 퍼즐 타일셋 (마왕의 성 전용) |
| `ruins_puzzles.png` | 128×128 (4×4) | 📦 | 압력 스위치/봉인 제단 타일셋 (고대 유적 전용) |
| `lava_puzzles.png` | 128×128 (4×4) | 📦 | 횃불 점화 퍼즐 타일셋 (용암 동굴 전용) |
| `dungeon_boss.png` | 32×32 타일셋 | 🔲 | 보스 방 전용 장식 |

### 월드 맵 TMJ (`tilesets/world/`)
| 에셋 이름 | 상태 | 비고 |
|-----------|------|------|
| `forest-dungeon.tmj` | ✅ | 어둠의 숲 던전 (M2) |
| `ancient-ruins.tmj` | ✅ | 고대 유적 — 봉인 제단 3곳, 압력 스위치 퍼즐, 리치 보스 (M4) |
| `lava-cave.tmj` | ✅ | 용암 동굴 — 횃불 점화 퍼즐, 용암 게이트, 화염 드래곤 보스 (M4) |
| `dark-castle.tmj` | ✅ | 마왕의 성 — 거울 반사 퍼즐, 어둠의 기사·마왕 발코르 보스 (M4) |

---

## 6. UI 에셋 (`ui/`)

### HUD (`ui/hud/`)
| 에셋 이름 | 크기 | 상태 | 비고 |
|-----------|------|------|------|
| `hud_hp_bar.png` | 128×16 | 📦 | HP 바 프레임 + 채우기 |
| `hud_mp_bar.png` | 128×16 | 📦 | MP 바 프레임 + 채우기 |
| `hud_frame.png` | 200×60 | 📦 | HUD 전체 프레임 |
| `minimap_frame.png` | 128×128 | 📦 | 미니맵 테두리 |
| `boss_hp_bar.png` | 320×24 | 📦 | 보스 HP 바 (화면 하단 중앙) |
| `mobile_btn_attack.png` | 64×64 | 📦 | 모바일 공격 버튼 |
| `mobile_btn_dash.png` | 64×64 | 📦 | 모바일 대시 버튼 |
| `mobile_dpad.png` | 128×128 | 📦 | 모바일 방향키 (D-Pad) |

### 메뉴 패널 (`ui/menus/`)
| 에셋 이름 | 크기 | 상태 | 비고 |
|-----------|------|------|------|
| `panel_inventory.png` | 320×240 | 📦 | 인벤토리 배경 패널 |
| `panel_quest.png` | 280×200 | 📦 | 퀘스트 로그 패널 |
| `panel_dialogue.png` | 480×100 | 📦 | 대화창 패널 |
| `panel_menu_main.png` | 240×160 | 🔲 | 타이틀 메뉴 |
| `popup_quest_accept.png` | — | 📦 | 퀘스트 수락 팝업 (M3 추가) |
| `popup_quest_complete.png` | — | 📦 | 퀘스트 완료 팝업 (M3 추가) |
| `slot_item.png` | 36×36 | 📦 | 인벤토리 슬롯 |
| `slot_item_selected.png` | 36×36 | 📦 | 선택된 슬롯 (골드 테두리) |
| `btn_generic.png` | 120×32 | 📦 | 범용 버튼 (3-slice) |
| `btn_confirm.png` | — | 📦 | 확인 버튼 (M3 추가) |
| `btn_cancel.png` | — | 📦 | 취소 버튼 (M3 추가) |

### 아이콘 (`ui/icons/`)
| 에셋 이름 | 크기 | 상태 | 비고 |
|-----------|------|------|------|
| `icon_sword.png` | 32×32 | 📦 | 검 아이콘 |
| `icon_bow.png` | 32×32 | 📦 | 활 아이콘 |
| `icon_armor.png` | 32×32 | 📦 | 방어구 아이콘 |
| `icon_potion_hp.png` | 32×32 | 📦 | HP 포션 |
| `icon_potion_mp.png` | 32×32 | 📦 | MP 포션 |
| `icon_quest_active.png` | 16×16 | 📦 | 퀘스트 마커 (활성) |
| `icon_quest_complete.png` | 16×16 | 📦 | 퀘스트 마커 (완료 가능) |
| `icon_compass.png` | — | 📦 | 숲의 나침반 키 아이템 아이콘 (M3 추가) |
| `icon_hook.png` | — | 📦 | 고대 갈고리 키 아이템 아이콘 (M3 추가) |
| `icon_flame_shield.png` | — | 📦 | 화염 방패 키 아이템 아이콘 (M3 추가) |

---

## 7. M1 Placeholder 우선순위

M2 개발을 위해 M1에서 준비할 최소 Placeholder 에셋:

| 우선순위 | 에셋 | 비고 |
|---------|------|------|
| 🔴 필수 | `player_walk_*.png` (4방향) | M2 이동 구현에 필요 |
| 🔴 필수 | `goblin_walk.png` | M2 적 AI 구현에 필요 |
| 🔴 필수 | `dungeon_floor.png`, `dungeon_walls.png` | M2 첫 맵에 필요 |
| 🟡 권장 | `player_attack_melee.png` | M2 전투 구현 |
| 🟡 권장 | `hit_melee.png` | M2 전투 피드백 |
| 🟡 권장 | `hud_hp_bar.png`, `hud_mp_bar.png` | M2 HUD |
| 🟢 선택 | 나머지 에셋 | M3~M6 단계적 추가 |

> Placeholder는 단색 사각형 + 레이블 텍스트로 대체 가능. Phaser.js의 `graphics.fillRect()` 또는 간단한 PNG로 WD 팀이 생성할 수 있음.
