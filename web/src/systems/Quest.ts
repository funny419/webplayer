import Phaser from 'phaser';
import { InventorySystem } from './Inventory';
import type { PlayerClass } from './Inventory';

export type ObjectiveType = 'kill' | 'collect' | 'location' | 'talk';
export type QuestStatus   = 'locked' | 'available' | 'active' | 'completed';

export interface QuestObjective {
  id:           string;
  type:         ObjectiveType;
  target:       string;
  count?:       number;
  display_text: string;
  hint_text?:   string;
  scene?:       string;
  marker?:      string;
  drop_sources?: unknown[];
}

export interface QuestReward {
  exp:    number;
  gold:   number;
  items:  { id: string; qty: number; condition?: string }[];
  unlock?:       string;
  title?:        string;
  clear_record?: boolean;
}

export interface QuestData {
  id:           string;
  title:        string;
  type:         'main' | 'side';
  giver_npc:    string;
  description:  string;
  objectives:   QuestObjective[];
  reward:       QuestReward;
  requires?:    string[];
  available_after?: string;
  dialogue:     { start: string; complete: string };
  triggers_ending?: boolean;
}

interface QuestRuntime {
  status:   QuestStatus;
  progress: Record<string, number>; // objectiveId → current count
}

export interface QuestSnapshot {
  statuses: Record<string, QuestStatus>;
  progress: Record<string, Record<string, number>>;
}

/**
 * 퀘스트 시스템
 *
 * 이벤트:
 *   quest_accepted(questId)
 *   quest_progress(questId, objectiveId, current, total)
 *   quest_completed(questId, title, reward)
 *   quest_reward(questId, reward)   — 보상 지급 시점
 *   game_ending()                   — mq_11 완료 시 엔딩 트리거
 */
export class QuestSystem extends Phaser.Events.EventEmitter {
  private quests  = new Map<string, QuestData>();
  private runtime = new Map<string, QuestRuntime>();
  private playerClass: PlayerClass = 'class_swordsman';

  constructor(
    questData: { main_quests: QuestData[]; side_quests: QuestData[] },
    private readonly inventory: InventorySystem,
  ) {
    super();

    const all = [...questData.main_quests, ...questData.side_quests];
    for (const q of all) {
      this.quests.set(q.id, q);
      this.runtime.set(q.id, {
        status:   this.initialStatus(q),
        progress: {},
      });
    }
    this.updateAvailability();
  }

  setPlayerClass(cls: PlayerClass): void {
    this.playerClass = cls;
  }

  // ── 조회 ────────────────────────────────────────────────────────────────

  getStatus(questId: string): QuestStatus {
    return this.runtime.get(questId)?.status ?? 'locked';
  }

  getProgress(questId: string, objectiveId: string): number {
    return this.runtime.get(questId)?.progress[objectiveId] ?? 0;
  }

  getActiveQuests(): QuestData[] {
    return [...this.quests.values()].filter(q => this.getStatus(q.id) === 'active');
  }

  getAvailableQuests(): QuestData[] {
    return [...this.quests.values()].filter(q => this.getStatus(q.id) === 'available');
  }

  // ── 액션 ────────────────────────────────────────────────────────────────

  accept(questId: string): boolean {
    if (this.getStatus(questId) !== 'available') return false;
    this.setStatus(questId, 'active');
    this.emit('quest_accepted', questId);
    return true;
  }

  /** 적 처치 이벤트 (WorldScene에서 호출) */
  onEnemyKilled(enemyId: string): void {
    this.forEachActiveObjective('kill', enemyId, (qid, obj) => {
      this.incrementProgress(qid, obj);
    });
  }

  /** 아이템 획득 이벤트 (InventorySystem item_added 연동) */
  onItemCollected(itemId: string, qty: number): void {
    this.forEachActiveObjective('collect', itemId, (qid, obj) => {
      this.incrementProgress(qid, obj, qty);
    });
  }

  /** 위치 도달 이벤트 (WorldScene 마커 충돌 시 호출) */
  onLocationReached(scene: string, marker: string): void {
    for (const quest of this.quests.values()) {
      if (this.getStatus(quest.id) !== 'active') continue;
      for (const obj of quest.objectives) {
        if (obj.type !== 'location' || obj.scene !== scene || obj.marker !== marker) continue;
        if (!this.isObjComplete(quest.id, obj)) {
          this.setObjProgress(quest.id, obj.id, 1);
          this.emit('quest_progress', quest.id, obj.id, 1, 1);
          this.checkCompletion(quest.id);
        }
      }
    }
  }

  /** NPC 대화 이벤트 (DialogueSystem 연동) */
  onTalkedToNpc(npcId: string): void {
    this.forEachActiveObjective('talk', npcId, (qid, obj) => {
      if (!this.isObjComplete(qid, obj)) {
        this.setObjProgress(qid, obj.id, 1);
        this.emit('quest_progress', qid, obj.id, 1, 1);
        this.checkCompletion(qid);
      }
    });
  }

  // ── 직렬화 ──────────────────────────────────────────────────────────────

  toJSON(): QuestSnapshot {
    const statuses: Record<string, QuestStatus> = {};
    const progress: Record<string, Record<string, number>> = {};

    for (const [id, rt] of this.runtime) {
      statuses[id] = rt.status;
      if (Object.keys(rt.progress).length > 0) {
        progress[id] = { ...rt.progress };
      }
    }
    return { statuses, progress };
  }

  fromJSON(data: QuestSnapshot): void {
    for (const [id, status] of Object.entries(data.statuses)) {
      const rt = this.runtime.get(id);
      if (rt) {
        rt.status   = status;
        rt.progress = { ...(data.progress[id] ?? {}) };
      }
    }
  }

  // ── 내부 헬퍼 ───────────────────────────────────────────────────────────

  private initialStatus(quest: QuestData): QuestStatus {
    const hasDepend =
      (quest.requires && quest.requires.length > 0) ||
      quest.available_after !== undefined;
    return hasDepend ? 'locked' : 'available';
  }

  private setStatus(questId: string, status: QuestStatus): void {
    const rt = this.runtime.get(questId);
    if (rt) rt.status = status;
  }

  private updateAvailability(): void {
    let changed = true;
    // 연쇄 해금을 위해 변화가 없을 때까지 반복
    while (changed) {
      changed = false;
      for (const quest of this.quests.values()) {
        if (this.getStatus(quest.id) !== 'locked') continue;

        const requiresMet = !quest.requires ||
          quest.requires.every(r => this.getStatus(r) === 'completed');
        const afterMet = !quest.available_after ||
          this.getStatus(quest.available_after) === 'completed';

        if (requiresMet && afterMet) {
          this.setStatus(quest.id, 'available');
          changed = true;
        }
      }
    }
  }

  private forEachActiveObjective(
    type: ObjectiveType,
    target: string,
    cb: (questId: string, obj: QuestObjective) => void,
  ): void {
    for (const quest of this.quests.values()) {
      if (this.getStatus(quest.id) !== 'active') continue;
      for (const obj of quest.objectives) {
        if (obj.type === type && obj.target === target) cb(quest.id, obj);
      }
    }
  }

  private incrementProgress(questId: string, obj: QuestObjective, by = 1): void {
    if (this.isObjComplete(questId, obj)) return;
    const total   = obj.count ?? 1;
    const current = this.getProgress(questId, obj.id);
    const next    = Math.min(current + by, total);
    this.setObjProgress(questId, obj.id, next);
    this.emit('quest_progress', questId, obj.id, next, total);
    this.checkCompletion(questId);
  }

  private setObjProgress(questId: string, objectiveId: string, value: number): void {
    const rt = this.runtime.get(questId);
    if (rt) rt.progress[objectiveId] = value;
  }

  private isObjComplete(questId: string, obj: QuestObjective): boolean {
    return this.getProgress(questId, obj.id) >= (obj.count ?? 1);
  }

  private checkCompletion(questId: string): void {
    const quest = this.quests.get(questId);
    if (!quest) return;
    const allDone = quest.objectives.every(obj => this.isObjComplete(questId, obj));
    if (!allDone) return;
    this.completeQuest(quest);
  }

  private completeQuest(quest: QuestData): void {
    this.setStatus(quest.id, 'completed');

    // 조건부 아이템 지급
    for (const item of quest.reward.items) {
      if (!item.condition || item.condition === this.playerClass) {
        this.inventory.addItem(item.id, item.qty);
      }
    }

    this.emit('quest_reward',    quest.id, quest.reward);
    this.emit('quest_completed', quest.id, quest.title, quest.reward);

    if (quest.triggers_ending) {
      this.emit('game_ending');
    }

    this.updateAvailability();
  }
}
