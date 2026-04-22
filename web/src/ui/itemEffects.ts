import type { Player } from '../entities/Player';

export type ItemEffect =
  | { type: 'heal_hp'; value: number }
  | { type: 'heal_mp'; value: number };

const EFFECTS: Record<string, ItemEffect> = {
  item_potion_small:     { type: 'heal_hp', value: 30 },
  item_potion_medium:    { type: 'heal_hp', value: 80 },
  item_potion_large:     { type: 'heal_hp', value: Infinity },
  item_mp_potion_small:  { type: 'heal_mp', value: 20 },
  item_mp_potion_medium: { type: 'heal_mp', value: 60 },
};

export function getItemEffect(id: string): ItemEffect | null {
  return EFFECTS[id] ?? null;
}

export function applyItemEffect(effect: ItemEffect, player: Player): void {
  if (effect.type === 'heal_hp') {
    player.hp = Math.min(player.maxHp, player.hp + effect.value);
  } else if (effect.type === 'heal_mp') {
    player.mp = Math.min(player.maxMp, player.mp + effect.value);
  }
}
