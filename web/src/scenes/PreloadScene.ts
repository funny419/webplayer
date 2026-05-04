import Phaser from 'phaser';
import { SaveManager } from '../systems/SaveManager';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    const { width, height } = this.scale;

    const barBg = this.add.rectangle(width / 2, height / 2, 320, 20, 0x333333);
    const bar = this.add.rectangle(barBg.x - 160, height / 2, 0, 16, 0x00ff88);
    bar.setOrigin(0, 0.5);
    this.load.on('progress', (value: number) => { bar.width = 320 * value; });

    const pf = { frameWidth: 32, frameHeight: 32 };

    // 플레이어 스프라이트시트
    this.load.spritesheet('player_walk_down',    'assets/sprites/player/player_walk_down.png',    pf);
    this.load.spritesheet('player_walk_up',      'assets/sprites/player/player_walk_up.png',      pf);
    this.load.spritesheet('player_walk_left',    'assets/sprites/player/player_walk_left.png',    pf);
    this.load.spritesheet('player_walk_right',   'assets/sprites/player/player_walk_right.png',   pf);
    this.load.spritesheet('player_idle',         'assets/sprites/player/player_idle.png',         pf);
    this.load.spritesheet('player_dash',         'assets/sprites/player/player_dash.png',         pf);
    this.load.spritesheet('player_attack_melee', 'assets/sprites/player/player_attack_melee.png', pf);
    this.load.spritesheet('player_attack_ranged','assets/sprites/player/player_attack_ranged.png',pf);
    this.load.spritesheet('player_death',        'assets/sprites/player/player_death.png',        pf);

    // 고블린 스프라이트시트
    this.load.spritesheet('goblin_walk_down',  'assets/sprites/enemies/goblin_walk_down.png',  pf);
    this.load.spritesheet('goblin_walk_up',    'assets/sprites/enemies/goblin_walk_up.png',    pf);
    this.load.spritesheet('goblin_walk_left',  'assets/sprites/enemies/goblin_walk_left.png',  pf);
    this.load.spritesheet('goblin_walk_right', 'assets/sprites/enemies/goblin_walk_right.png', pf);
    this.load.spritesheet('goblin_attack',     'assets/sprites/enemies/goblin_attack.png',     pf);
    this.load.spritesheet('goblin_death',      'assets/sprites/enemies/goblin_death.png',      pf);

    // 타일셋
    this.load.image('dungeon_floor', 'assets/tilesets/dungeon/dungeon_floor.png');
    this.load.image('dungeon_walls', 'assets/tilesets/dungeon/dungeon_walls.png');
    this.load.image('town_ground',   'assets/tilesets/town/town_ground.png');

    // 플레이어 피격 스프라이트 (누락 수정)
    this.load.spritesheet('player_hurt', 'assets/sprites/player/player_hurt.png', pf);

    // 게임 데이터
    this.load.json('quests',    'data/quests.json');
    this.load.json('balance',   'data/balance.json');
    this.load.json('dialogues', 'data/dialogues.json');

    // NPC 스프라이트시트
    const nf = { frameWidth: 32, frameHeight: 32 };
    this.load.spritesheet('npc_elder',      'assets/sprites/npc/npc_elder.png',      nf);
    this.load.spritesheet('npc_blacksmith', 'assets/sprites/npc/npc_blacksmith.png', nf);
    this.load.spritesheet('npc_merchant',   'assets/sprites/npc/npc_merchant.png',   nf);

    // Tiled 맵 파일
    this.load.tilemapTiledJSON('map_haven',    'assets/maps/haven-village.tmj');
    this.load.tilemapTiledJSON('map_forest',   'assets/maps/forest-dungeon.tmj');
    this.load.tilemapTiledJSON('map_ruins',    'assets/maps/ancient-ruins.tmj');
    this.load.tilemapTiledJSON('map_cavern',   'assets/maps/lava-cave.tmj');
    this.load.tilemapTiledJSON('map_fortress', 'assets/maps/dark-castle.tmj');
  }

  create(): void {
    const hasSave = new SaveManager().hasSave();
    this.scene.start(hasSave ? 'WorldScene' : 'CharSelectScene');
  }
}
