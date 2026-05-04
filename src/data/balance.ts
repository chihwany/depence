export const SCREEN = {
  width: 720,
  height: 1280,
} as const;

export const BASE = {
  maxHp: 10,
} as const;

export const WAVE = {
  enemyCount: 12,
  spawnInterval: 700,
} as const;

export interface EnemyStats {
  hp: number;
  speed: number;
  damage: number;
  reward: number;
  color: number;
  radius: number;
}

export const ENEMIES: Record<string, EnemyStats> = {
  grunt: {
    hp: 10,
    speed: 90,
    damage: 1,
    reward: 5,
    color: 0xef4444,
    radius: 14,
  },
};

export interface TowerStats {
  damage: number;
  range: number;
  fireRate: number;
  cost: number;
  color: number;
  radius: number;
}

export const TOWERS: Record<string, TowerStats> = {
  sniper: {
    damage: 5,
    range: 220,
    fireRate: 700,
    cost: 100,
    color: 0x3b82f6,
    radius: 18,
  },
};

export const PROJECTILE = {
  speed: 700,
  color: 0xfacc15,
  radius: 5,
  hitDistance: 8,
} as const;
