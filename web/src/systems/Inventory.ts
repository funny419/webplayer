import Phaser from 'phaser';

export type PlayerClass = 'class_swordsman' | 'class_mage';

export interface Equipment {
  weapon: string | null;
  armor: string | null;
}

export interface InventorySnapshot {
  items: Record<string, number>;
  equipment: Equipment;
  keyItems: string[];
}

// balance.json armors[].restriction 기반
const ARMOR_RESTRICTIONS: Record<string, PlayerClass> = {
  armor_chain:          'class_swordsman',
  armor_iron:           'class_swordsman',
  armor_steel:          'class_swordsman',
  armor_rune_leather:   'class_mage',
  armor_mage_robe:      'class_mage',
  armor_enchanted_robe: 'class_mage',
};

// balance.json weapons[].type 기반
const WEAPON_TYPE: Record<string, 'melee' | 'ranged'> = {
  weapon_wood_sword:   'melee',
  weapon_iron_sword:   'melee',
  weapon_silver_sword: 'melee',
  weapon_flame_sword:  'melee',
  weapon_dark_blade:   'melee',
  weapon_basic_staff:  'ranged',
  weapon_iron_staff:   'ranged',
  weapon_mana_staff:   'ranged',
  weapon_fire_staff:   'ranged',
  weapon_void_staff:   'ranged',
};

// balance.json weapons[].atk_bonus 기반
const WEAPON_BONUS: Record<string, number> = {
  weapon_wood_sword: 0,  weapon_iron_sword: 10, weapon_silver_sword: 20,
  weapon_flame_sword: 30, weapon_dark_blade: 45,
  weapon_basic_staff: 0, weapon_iron_staff: 8,  weapon_mana_staff: 18,
  weapon_fire_staff: 28, weapon_void_staff: 40,
};

// balance.json armors[].def_bonus 기반
const ARMOR_BONUS: Record<string, number> = {
  armor_cloth: 0,        armor_leather: 5,       armor_chain: 12,
  armor_iron: 20,        armor_steel: 30,         armor_rune_leather: 8,
  armor_mage_robe: 4,    armor_enchanted_robe: 15, armor_dragon_scale: 35,
  armor_shadow: 45,
};

/**
 * 인벤토리 시스템
 *
 * 이벤트:
 *   item_added(id, qty)
 *   item_removed(id, qty)
 *   key_item_added(id)
 *   equipped(slot, id)
 *   unequipped(slot)
 *   equip_failed(id, reason)
 */
export class InventorySystem extends Phaser.Events.EventEmitter {
  private items = new Map<string, number>();
  private keyItems = new Set<string>();
  private equipment: Equipment = { weapon: null, armor: null };
  private playerClass: PlayerClass = 'class_swordsman';

  setPlayerClass(cls: PlayerClass): void {
    this.playerClass = cls;
  }

  getPlayerClass(): PlayerClass {
    return this.playerClass;
  }

  // ── 일반 아이템 ─────────────────────────────────────────────────────────

  addItem(id: string, qty: number): void {
    this.items.set(id, (this.items.get(id) ?? 0) + qty);
    this.emit('item_added', id, qty);
  }

  removeItem(id: string, qty: number): boolean {
    const current = this.items.get(id) ?? 0;
    if (current < qty) return false;
    const next = current - qty;
    if (next === 0) {
      this.items.delete(id);
    } else {
      this.items.set(id, next);
    }
    this.emit('item_removed', id, qty);
    return true;
  }

  getQty(id: string): number {
    return this.items.get(id) ?? 0;
  }

  hasItem(id: string): boolean {
    return this.getQty(id) > 0;
  }

  // ── 키 아이템 ───────────────────────────────────────────────────────────

  addKeyItem(id: string): void {
    if (!this.keyItems.has(id)) {
      this.keyItems.add(id);
      this.emit('key_item_added', id);
    }
  }

  hasKeyItem(id: string): boolean {
    return this.keyItems.has(id);
  }

  // ── 장착 ────────────────────────────────────────────────────────────────

  equipWeapon(id: string): boolean {
    const wtype = WEAPON_TYPE[id];
    if (wtype === 'melee' && this.playerClass === 'class_mage') {
      this.emit('equip_failed', id, '마도사는 근접 무기를 착용할 수 없습니다.');
      return false;
    }
    if (wtype === 'ranged' && this.playerClass === 'class_swordsman') {
      this.emit('equip_failed', id, '검사는 원거리 무기를 착용할 수 없습니다.');
      return false;
    }
    this.equipment.weapon = id;
    this.emit('equipped', 'weapon', id);
    return true;
  }

  equipArmor(id: string): boolean {
    const restriction = ARMOR_RESTRICTIONS[id];
    if (restriction && restriction !== this.playerClass) {
      const msg = restriction === 'class_swordsman'
        ? '검사 전용 갑옷입니다.'
        : '마도사 전용 갑옷입니다.';
      this.emit('equip_failed', id, msg);
      return false;
    }
    this.equipment.armor = id;
    this.emit('equipped', 'armor', id);
    return true;
  }

  unequip(slot: 'weapon' | 'armor'): void {
    this.equipment[slot] = null;
    this.emit('unequipped', slot);
  }

  getEquipment(): Readonly<Equipment> {
    return this.equipment;
  }

  getWeaponBonus(): number {
    return this.equipment.weapon ? (WEAPON_BONUS[this.equipment.weapon] ?? 0) : 0;
  }

  getArmorBonus(): number {
    return this.equipment.armor ? (ARMOR_BONUS[this.equipment.armor] ?? 0) : 0;
  }

  // ── 직렬화 ──────────────────────────────────────────────────────────────

  toJSON(): InventorySnapshot {
    return {
      items:     Object.fromEntries(this.items),
      equipment: { ...this.equipment },
      keyItems:  [...this.keyItems],
    };
  }

  fromJSON(data: InventorySnapshot): void {
    this.items    = new Map(Object.entries(data.items));
    this.equipment = { ...data.equipment };
    this.keyItems  = new Set(data.keyItems);
  }
}
