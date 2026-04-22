import { QuestSystem } from './Quest';

// Phaser 없이 테스트하기 위한 최소 mock
vi.mock('phaser', () => ({
  default: {
    Events: {
      EventEmitter: class {
        emit() {}
        on() {}
        off() {}
      },
    },
  },
}));

const MINIMAL_QUEST_DATA = {
  main_quests: [
    {
      id: 'mq_01', title: '시작의 부름', type: 'main' as const,
      giver_npc: 'npc_elder', description: '장로와 이야기하라',
      objectives: [{ id: 'obj_1', type: 'talk' as const, target: 'npc_elder', count: 1, display_text: '장로와 대화' }],
      reward: { exp: 30, gold: 0, items: [] },
      dialogue: { start: '부탁이 있네', complete: '고맙네' },
    },
  ],
  side_quests: [
    {
      id: 'sq_01', title: '사라진 아이', type: 'side' as const,
      giver_npc: 'npc_child', description: '소녀를 찾아라',
      objectives: [{ id: 'obj_1', type: 'location' as const, target: 'rescue_point', count: 1, display_text: '위치 도달' }],
      reward: { exp: 60, gold: 0, items: [] },
      dialogue: { start: '도와주세요', complete: '감사해요' },
    },
  ],
};

describe('QuestSystem.getAllQuests()', () => {
  it('메인·사이드 퀘스트 전체를 반환한다', () => {
    const qs = new QuestSystem(MINIMAL_QUEST_DATA, null as unknown as import('./Inventory').InventorySystem);
    const all = qs.getAllQuests();
    expect(all).toHaveLength(2);
    expect(all.map(q => q.id)).toContain('mq_01');
    expect(all.map(q => q.id)).toContain('sq_01');
  });

  it('locked 상태 퀘스트도 포함한다', () => {
    const qs = new QuestSystem(MINIMAL_QUEST_DATA, null as unknown as import('./Inventory').InventorySystem);
    const all = qs.getAllQuests();
    expect(all.length).toBeGreaterThan(0);
  });
});
