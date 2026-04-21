import type { InventorySnapshot } from './Inventory';
import type { QuestSnapshot } from './Quest';
import type { PlayerClass } from './Inventory';

const SAVE_KEY     = 'webplayer_save_v1';
const SAVE_VERSION = 1;

export interface PlayerStats {
  hp:          number;
  mp:          number;
  level:       number;
  exp:         number;
  gold:        number;
  playerClass: PlayerClass;
}

export interface SaveData {
  version:   number;
  timestamp: number;
  playtime:  number;
  player:    PlayerStats;
  inventory: InventorySnapshot;
  quests:    QuestSnapshot;
  puzzles:   Record<string, boolean>; // puzzleId → solved
}

export class SaveManager {
  /**
   * 현재 게임 상태를 localStorage에 저장한다.
   */
  save(data: Omit<SaveData, 'version' | 'timestamp'>): void {
    const record: SaveData = {
      version:   SAVE_VERSION,
      timestamp: Date.now(),
      ...data,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(record));
  }

  /**
   * localStorage에서 저장 데이터를 불러온다.
   * 버전 불일치 또는 데이터 없을 시 null 반환.
   */
  load(): SaveData | null {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      (parsed as SaveData).version !== SAVE_VERSION
    ) {
      return null;
    }

    return parsed as SaveData;
  }

  hasSave(): boolean {
    return localStorage.getItem(SAVE_KEY) !== null;
  }

  deleteSave(): void {
    localStorage.removeItem(SAVE_KEY);
  }
}
