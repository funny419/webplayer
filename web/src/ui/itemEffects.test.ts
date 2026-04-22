import { getItemEffect, applyItemEffect } from './itemEffects';

describe('getItemEffect', () => {
  it('소형 포션: HP +30', () => {
    expect(getItemEffect('item_potion_small')).toEqual({ type: 'heal_hp', value: 30 });
  });

  it('중형 포션: HP +80', () => {
    expect(getItemEffect('item_potion_medium')).toEqual({ type: 'heal_hp', value: 80 });
  });

  it('대형 포션: HP 전체 회복', () => {
    expect(getItemEffect('item_potion_large')).toEqual({ type: 'heal_hp', value: Infinity });
  });

  it('소형 마나 포션: MP +20', () => {
    expect(getItemEffect('item_mp_potion_small')).toEqual({ type: 'heal_mp', value: 20 });
  });

  it('알 수 없는 아이템: null', () => {
    expect(getItemEffect('unknown_item')).toBeNull();
  });
});

describe('applyItemEffect', () => {
  it('HP 회복 효과를 플레이어에 적용한다', () => {
    const player = { hp: 50, maxHp: 100, mp: 30, maxMp: 50 } as unknown as Parameters<typeof applyItemEffect>[1];
    applyItemEffect({ type: 'heal_hp', value: 30 }, player);
    expect(player.hp).toBe(80);
  });

  it('HP가 maxHp를 초과하지 않는다', () => {
    const player = { hp: 90, maxHp: 100, mp: 30, maxMp: 50 } as unknown as Parameters<typeof applyItemEffect>[1];
    applyItemEffect({ type: 'heal_hp', value: 30 }, player);
    expect(player.hp).toBe(100);
  });

  it('Infinity 값은 HP를 maxHp로 설정한다', () => {
    const player = { hp: 10, maxHp: 100, mp: 30, maxMp: 50 } as unknown as Parameters<typeof applyItemEffect>[1];
    applyItemEffect({ type: 'heal_hp', value: Infinity }, player);
    expect(player.hp).toBe(100);
  });
});
