import type { Player } from '../entities/Player';

export type ItemEffect =
  | { type: 'heal_hp'; value: number }
  | { type: 'heal_mp'; value: number }
  | { type: 'exp'; value: number }
  | { type: 'heal_hp_pct'; value: number }
  | { type: 'aoe_damage'; value: number };

const EFFECTS: Record<string, ItemEffect> = {
  item_potion_small:     { type: 'heal_hp', value: 30 },
  item_potion_medium:    { type: 'heal_hp', value: 80 },
  item_potion_large:     { type: 'heal_hp', value: Infinity },
  item_mp_potion_small:  { type: 'heal_mp', value: 20 },
  item_mp_potion_medium: { type: 'heal_mp', value: 60 },
  item_ether_shard:      { type: 'exp', value: 50 },
  item_revival_herb:     { type: 'heal_hp_pct', value: 0.5 },
  item_bomb:             { type: 'aoe_damage', value: 50 },
};

export function getItemEffect(id: string): ItemEffect | null {
  return EFFECTS[id] ?? null;
}

export function applyItemEffect(effect: ItemEffect, player: Player): void {
  if (effect.type === 'heal_hp') {
    player.hp = Math.min(player.maxHp, player.hp + effect.value);
  } else if (effect.type === 'heal_mp') {
    player.mp = Math.min(player.maxMp, player.mp + effect.value);
  } else if (effect.type === 'exp') {
    player.gainExp(effect.value);
  } else if (effect.type === 'heal_hp_pct') {
    player.hp = Math.min(player.maxHp, player.hp + Math.floor(player.maxHp * effect.value));
  }
  // aoe_damage: WorldScene의 item_used 핸들러에서 처리
}
