export const SCREEN = {
  width: 720,
  height: 1280,
} as const;

export const BASE = {
  maxHp: 15,
  // Base auto-defense: a built-in turret on the base that fires at
  // anything within `range` pixels. range = 2 cells (cellSize is 70).
  damage: 5,
  range: 140,
  fireRate: 700,
  color: 0x4ade80,
} as const;

export type EnemyType = "grunt" | "runner" | "tank" | "boss";

export interface EnemyStats {
  hp: number;
  speed: number;
  damage: number;
  reward: number;
  color: number;
  radius: number;
  label: string;
}

export const ENEMIES: Record<EnemyType, EnemyStats> = {
  grunt:  { hp: 12,  speed: 90,  damage: 1, reward: 5,  color: 0xef4444, radius: 14, label: "G" },
  runner: { hp: 6,   speed: 170, damage: 1, reward: 4,  color: 0xfbbf24, radius: 11, label: "R" },
  tank:   { hp: 50,  speed: 50,  damage: 2, reward: 12, color: 0x8b5cf6, radius: 18, label: "T" },
  boss:   { hp: 250, speed: 45,  damage: 5, reward: 50, color: 0xdc2626, radius: 28, label: "B" },
};

export type TowerType = "sniper" | "cannon" | "frost";

export interface TowerStats {
  damage: number;
  range: number;
  fireRate: number;
  color: number;
  radius: number;
  label: string;
  aoeRadius?: number;
  slowMul?: number;
  slowDuration?: number;
}

export const TOWERS: Record<TowerType, TowerStats> = {
  sniper: { damage: 8, range: 240, fireRate: 800,  color: 0x3b82f6, radius: 18, label: "S" },
  cannon: { damage: 5, range: 180, fireRate: 1200, color: 0xf97316, radius: 20, label: "C", aoeRadius: 70 },
  frost:  { damage: 1, range: 150, fireRate: 500,  color: 0x06b6d4, radius: 16, label: "F", slowMul: 0.5, slowDuration: 1500 },
};

export const PROJECTILE = {
  speed: 700,
  color: 0xfacc15,
  radius: 5,
  hitDistance: 8,
} as const;

export interface SpawnDef {
  type: EnemyType;
  count: number;
  interval: number;
  delay?: number;
}

export interface WaveDef {
  spawns: SpawnDef[];
  isBoss?: boolean;
}

// Smooth progression: 4 -> 6 -> 10 -> 15 -> 20 -> boss.
// Early waves are deliberately light because the player only starts
// with 1 tower + 1 road token. Each subsequent wave bumps enemy count,
// then adds variety (runners at wave 3, tanks at wave 4), and tightens
// spawn intervals.
export const WAVES: WaveDef[] = [
  // Wave 1 — gentle intro: 4 grunts, slow spawn
  { spawns: [
      { type: "grunt", count: 4, interval: 1000 },
    ] },
  // Wave 2 — slightly more grunts
  { spawns: [
      { type: "grunt", count: 6, interval: 900 },
    ] },
  // Wave 3 — introduce runners
  { spawns: [
      { type: "grunt", count: 8, interval: 800 },
      { type: "runner", count: 2, interval: 500, delay: 4000 },
    ] },
  // Wave 4 — more runners + first tank
  { spawns: [
      { type: "grunt", count: 10, interval: 700 },
      { type: "runner", count: 4, interval: 400, delay: 3000 },
      { type: "tank", count: 1, interval: 0, delay: 6000 },
    ] },
  // Wave 5 — heavy mixed wave
  { spawns: [
      { type: "grunt", count: 12, interval: 600 },
      { type: "runner", count: 6, interval: 350, delay: 2000 },
      { type: "tank", count: 2, interval: 3000, delay: 4000 },
    ] },
  // Wave 6 — boss
  { spawns: [{ type: "boss", count: 1, interval: 0 }], isBoss: true },
];

export type ShapeId = "I" | "L" | "U";

import type { ShapeDef } from "../systems/Shape";

// Shape definitions: cell offsets relative to spawn in default (north)
// orientation. Last cell becomes the new spawn after placement.
// At placement time the player picks a rotation by tapping a cell.
export const SHAPES: Record<ShapeId, ShapeDef> = {
  I: {
    id: "I",
    label: "I",
    color: 0x78716c,
    offsets: [{ dCol: 0, dRow: -1 }],
  },
  L: {
    id: "L",
    label: "L",
    color: 0xa78bfa,
    offsets: [
      { dCol: 0, dRow: -1 },
      { dCol: 1, dRow: -1 },
    ],
  },
  U: {
    id: "U",
    label: "U",
    color: 0xfb923c,
    offsets: [
      { dCol: 0, dRow: -1 },
      { dCol: 1, dRow: -1 },
      { dCol: 1, dRow: 0 },
    ],
  },
};

export type CardEffect =
  | { kind: "addTower"; towerType: TowerType }
  | { kind: "upgrade" }
  | { kind: "addShape"; shapeId: ShapeId; amount: number }
  | { kind: "damageBoost"; mul: number }
  | { kind: "repair"; amount: number };

export interface CardDef {
  id: string;
  label: string;
  description: string;
  color: number;
  effect: CardEffect;
}

export const CARD_POOL: CardDef[] = [
  { id: "sniper",   label: "Sniper",   description: "1× Sniper tower",        color: 0x3b82f6, effect: { kind: "addTower", towerType: "sniper" } },
  { id: "cannon",   label: "Cannon",   description: "1× Cannon (AOE)",        color: 0xf97316, effect: { kind: "addTower", towerType: "cannon" } },
  { id: "frost",    label: "Frost",    description: "1× Frost (slow)",        color: 0x06b6d4, effect: { kind: "addTower", towerType: "frost" } },
  { id: "shape-i",  label: "Straight", description: "+2 Straight pieces (1 cell)",  color: 0x78716c, effect: { kind: "addShape", shapeId: "I", amount: 2 } },
  { id: "shape-l",  label: "L Turn",   description: "+1 L-Turn piece (2 cells)",    color: 0xa78bfa, effect: { kind: "addShape", shapeId: "L", amount: 1 } },
  { id: "shape-u",  label: "U Turn",   description: "+1 U-Turn piece (3 cells)",    color: 0xfb923c, effect: { kind: "addShape", shapeId: "U", amount: 1 } },
  { id: "upgrade",  label: "Upgrade",  description: "+1 level on a tower",    color: 0xa855f7, effect: { kind: "upgrade" } },
  { id: "boost",    label: "Power Up", description: "All towers +25% damage", color: 0xfacc15, effect: { kind: "damageBoost", mul: 1.25 } },
  { id: "repair",   label: "Repair",   description: "Restore 5 base HP",      color: 0x22c55e, effect: { kind: "repair", amount: 5 } },
];
