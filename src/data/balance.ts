export const SCREEN = {
  width: 720,
  height: 1280,
} as const;

export const BASE = {
  maxHp: 15,
  // Base auto-defense: a built-in turret on the base that fires at
  // anything within `range` pixels. range = 2 cells (cellSize 39 → 78).
  damage: 5,
  range: 78,
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

export type TowerType =
  | "sniper"
  | "cannon"
  | "frost"
  | "tesla"
  | "laser"
  | "frostgun"
  | "fireworks"
  | "inferno"
  | "tornado"
  | "mechanest";

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

// Tower ranges by tier (cellSize 39): long=2.5 cells (98), mid=2 (78), short=1.5 (59).
export const TOWERS: Record<TowerType, TowerStats> = {
  // Original 3 — kept for backwards compatibility
  sniper:    { damage: 8,  range: 98, fireRate: 800,  color: 0x3b82f6, radius: 18, label: "S" },
  cannon:    { damage: 5,  range: 78, fireRate: 1200, color: 0xf97316, radius: 20, label: "C", aoeRadius: 52 },
  frost:     { damage: 1,  range: 78, fireRate: 500,  color: 0x06b6d4, radius: 16, label: "F", slowMul: 0.5, slowDuration: 1500 },
  // New tier — distinct stats per tower
  tesla:     { damage: 3,  range: 59, fireRate: 400,  color: 0x60a5fa, radius: 17, label: "Te", aoeRadius: 50 },
  laser:     { damage: 2,  range: 98, fireRate: 200,  color: 0xeab308, radius: 16, label: "La" },
  frostgun:  { damage: 2,  range: 78, fireRate: 600,  color: 0x67e8f9, radius: 17, label: "Fg", slowMul: 0.3, slowDuration: 2000 },
  fireworks: { damage: 14, range: 78, fireRate: 2500, color: 0xf43f5e, radius: 19, label: "Fw", aoeRadius: 81 },
  inferno:   { damage: 3,  range: 59, fireRate: 250,  color: 0xea580c, radius: 17, label: "In" },
  tornado:   { damage: 4,  range: 78, fireRate: 700,  color: 0x9ca3af, radius: 17, label: "Tn", slowMul: 0.7, slowDuration: 1000 },
  mechanest: { damage: 12, range: 98, fireRate: 900,  color: 0x8b5cf6, radius: 20, label: "Mn" },
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

// 20-wave campaign in four phases. Each wave bumps enemy count and/or
// tightens spawn intervals. Mini-bosses at W10 and W15 break up the
// pacing; W20 sends 3 bosses with heavy support.
//
//   Phase 1 (W1-5)   — Tutorial: meet each enemy type
//   Phase 2 (W6-10)  — Scaling: all types, density rising, mini-boss
//   Phase 3 (W11-15) — Intensifying: denser variants, double boss
//   Phase 4 (W16-20) — Endgame: heavy sustained waves, final boss
//
// The player gets 1 card per cleared wave, so by W20 they've drafted
// ~21 cards (incl. starter). Late waves need to be substantially
// tougher than the previous 6-wave version's W6 boss.
export const WAVES: WaveDef[] = [
  // === Phase 1 — Tutorial ===
  // W1 — gentle intro: 4 grunts, slow spawn
  { spawns: [
      { type: "grunt", count: 4, interval: 1000 },
    ] },
  // W2 — denser grunts
  { spawns: [
      { type: "grunt", count: 6, interval: 900 },
    ] },
  // W3 — meet runner: small rusher group after grunt warm-up
  { spawns: [
      { type: "grunt", count: 4, interval: 800 },
      { type: "runner", count: 6, interval: 350, delay: 3000 },
    ] },
  // W4 — mixed grunts + runners
  { spawns: [
      { type: "grunt", count: 10, interval: 750 },
      { type: "runner", count: 4, interval: 400, delay: 3000 },
    ] },
  // W5 — meet tank: armor introduction
  { spawns: [
      { type: "grunt", count: 8, interval: 700 },
      { type: "tank", count: 2, interval: 4000, delay: 4000 },
    ] },

  // === Phase 2 — Scaling ===
  // W6 — heavy mixed
  { spawns: [
      { type: "grunt", count: 12, interval: 650 },
      { type: "runner", count: 6, interval: 380, delay: 2000 },
      { type: "tank", count: 2, interval: 3000, delay: 4500 },
    ] },
  // W7 — runner rush (lots of fast)
  { spawns: [
      { type: "grunt", count: 4, interval: 800 },
      { type: "runner", count: 12, interval: 300, delay: 1500 },
    ] },
  // W8 — tank wave (heavy armor)
  { spawns: [
      { type: "grunt", count: 8, interval: 600 },
      { type: "tank", count: 4, interval: 2500, delay: 3000 },
    ] },
  // W9 — heavy mixed escalation
  { spawns: [
      { type: "grunt", count: 16, interval: 550 },
      { type: "runner", count: 8, interval: 320, delay: 2000 },
      { type: "tank", count: 3, interval: 2200, delay: 4000 },
    ] },
  // W10 — MINI-BOSS: 1 boss + tank support
  { spawns: [
      { type: "grunt", count: 8, interval: 600 },
      { type: "tank", count: 6, interval: 1800, delay: 3000 },
      { type: "boss", count: 1, interval: 0, delay: 8000 },
    ], isBoss: true },

  // === Phase 3 — Intensifying ===
  // W11 — heavy mixed denser
  { spawns: [
      { type: "grunt", count: 20, interval: 500 },
      { type: "runner", count: 10, interval: 280, delay: 1500 },
      { type: "tank", count: 4, interval: 2000, delay: 3500 },
    ] },
  // W12 — runner rush (lots of runners)
  { spawns: [
      { type: "grunt", count: 6, interval: 600 },
      { type: "runner", count: 18, interval: 250, delay: 1000 },
    ] },
  // W13 — tank rush (lots of armor)
  { spawns: [
      { type: "grunt", count: 10, interval: 550 },
      { type: "tank", count: 8, interval: 1500, delay: 2000 },
    ] },
  // W14 — heavy mixed crescendo
  { spawns: [
      { type: "grunt", count: 22, interval: 450 },
      { type: "runner", count: 12, interval: 260, delay: 1500 },
      { type: "tank", count: 6, interval: 1800, delay: 3500 },
    ] },
  // W15 — DOUBLE BOSS: 2 bosses + heavy support
  { spawns: [
      { type: "grunt", count: 12, interval: 500 },
      { type: "runner", count: 8, interval: 280, delay: 2000 },
      { type: "tank", count: 6, interval: 1500, delay: 4000 },
      { type: "boss", count: 2, interval: 4000, delay: 7000 },
    ], isBoss: true },

  // === Phase 4 — Endgame ===
  // W16 — sustained heavy mixed
  { spawns: [
      { type: "grunt", count: 26, interval: 400 },
      { type: "runner", count: 14, interval: 240, delay: 1500 },
      { type: "tank", count: 8, interval: 1500, delay: 3500 },
    ] },
  // W17 — runner hell
  { spawns: [
      { type: "grunt", count: 8, interval: 500 },
      { type: "runner", count: 24, interval: 200, delay: 1000 },
      { type: "tank", count: 4, interval: 2000, delay: 5000 },
    ] },
  // W18 — armor rush
  { spawns: [
      { type: "grunt", count: 12, interval: 500 },
      { type: "tank", count: 12, interval: 1200, delay: 2000 },
    ] },
  // W19 — final stand before boss
  { spawns: [
      { type: "grunt", count: 30, interval: 350 },
      { type: "runner", count: 16, interval: 220, delay: 1500 },
      { type: "tank", count: 10, interval: 1100, delay: 3500 },
    ] },
  // W20 — FINAL BOSS: 3 bosses + heavy mixed support
  { spawns: [
      { type: "grunt", count: 12, interval: 500 },
      { type: "runner", count: 8, interval: 280, delay: 2500 },
      { type: "tank", count: 12, interval: 1200, delay: 4500 },
      { type: "boss", count: 3, interval: 5000, delay: 9000 },
    ], isBoss: true },
];

export type ShapeId =
  | "I1" | "I2" | "I3"
  | "L3" | "L4" | "L5"
  | "U4" | "U5" | "U7";

import type { ShapeDef } from "../systems/Shape";

// Shape definitions: cell offsets relative to spawn in default (north)
// orientation. Last cell becomes the new spawn after placement.
//   I: 1 / 2 / 3 cells (straight)
//   L: 3 / 4 / 5 cells (one corner)
//   U: 4 / 5 / 7 cells (two corners)
export const SHAPES: Record<ShapeId, ShapeDef> = {
  // === Straight (I) — 1 / 2 / 3 cells ===
  I1: {
    id: "I1",
    label: "I1",
    color: 0x78716c,
    offsets: [{ dCol: 0, dRow: -1 }],
  },
  I2: {
    id: "I2",
    label: "I2",
    color: 0x78716c,
    offsets: [
      { dCol: 0, dRow: -1 },
      { dCol: 0, dRow: -2 },
    ],
  },
  I3: {
    id: "I3",
    label: "I3",
    color: 0x78716c,
    offsets: [
      { dCol: 0, dRow: -1 },
      { dCol: 0, dRow: -2 },
      { dCol: 0, dRow: -3 },
    ],
  },

  // === L turn — 3 / 4 / 5 cells ===
  L3: {
    id: "L3",
    label: "L3",
    color: 0xa78bfa,
    // up 2, right 1 (3 cells)
    offsets: [
      { dCol: 0, dRow: -1 },
      { dCol: 0, dRow: -2 },
      { dCol: 1, dRow: -2 },
    ],
  },
  L4: {
    id: "L4",
    label: "L4",
    color: 0xa78bfa,
    // up 2, right 2 (4 cells)
    offsets: [
      { dCol: 0, dRow: -1 },
      { dCol: 0, dRow: -2 },
      { dCol: 1, dRow: -2 },
      { dCol: 2, dRow: -2 },
    ],
  },
  L5: {
    id: "L5",
    label: "L5",
    color: 0xa78bfa,
    // up 3, right 2 (5 cells) — taller L with longer foot
    offsets: [
      { dCol: 0, dRow: -1 },
      { dCol: 0, dRow: -2 },
      { dCol: 0, dRow: -3 },
      { dCol: 1, dRow: -3 },
      { dCol: 2, dRow: -3 },
    ],
  },

  // === U turn — 4 / 5 / 7 cells ===
  // All U variants form a U-letter shape: spawn enters at the bottom-left,
  // new spawn exits one row above. The filled cells visually trace a U
  // with sides + top-row, opening downward toward the spawn row.
  U4: {
    id: "U4",
    label: "U4",
    color: 0xfb923c,
    // 2×2 block (smallest U) — up 2, right 1, down 1 (4 cells)
    // Visual:
    //   X X
    //   X X*    (* new spawn at (1,-1))
    //   S .
    offsets: [
      { dCol: 0, dRow: -1 },
      { dCol: 0, dRow: -2 },
      { dCol: 1, dRow: -2 },
      { dCol: 1, dRow: -1 },
    ],
  },
  U5: {
    id: "U5",
    label: "U5",
    color: 0xfb923c,
    // Wide U letter — up 2, right 2, down 1 (5 cells)
    // Sides 2 tall, top 3 wide, opening at bottom between cols 0..2.
    // Visual:
    //   X X X
    //   X . X*    (* new spawn at (2,-1))
    //   S . .
    offsets: [
      { dCol: 0, dRow: -1 },
      { dCol: 0, dRow: -2 },
      { dCol: 1, dRow: -2 },
      { dCol: 2, dRow: -2 },
      { dCol: 2, dRow: -1 },
    ],
  },
  U7: {
    id: "U7",
    label: "U7",
    color: 0xfb923c,
    // Large 3×3 U letter — up 3, right 2, down 2 (7 cells)
    // Sides 3 tall, top 3 wide.
    // Visual:
    //   X X X
    //   X . X
    //   X . X*    (* new spawn)
    //   S . .
    offsets: [
      { dCol: 0, dRow: -1 },
      { dCol: 0, dRow: -2 },
      { dCol: 0, dRow: -3 },
      { dCol: 1, dRow: -3 },
      { dCol: 2, dRow: -3 },
      { dCol: 2, dRow: -2 },
      { dCol: 2, dRow: -1 },
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
  // Tower cards — original
  { id: "sniper",    label: "Sniper",    description: "1× Sniper tower",         color: 0x3b82f6, effect: { kind: "addTower", towerType: "sniper" } },
  { id: "cannon",    label: "Cannon",    description: "1× Cannon (AOE)",         color: 0xf97316, effect: { kind: "addTower", towerType: "cannon" } },
  { id: "frost",     label: "Frost",     description: "1× Frost (slow)",         color: 0x06b6d4, effect: { kind: "addTower", towerType: "frost" } },
  // Tower cards — new
  { id: "tesla",     label: "Tesla",     description: "1× Tesla (small AOE, fast)",   color: 0x60a5fa, effect: { kind: "addTower", towerType: "tesla" } },
  { id: "laser",     label: "Laser",     description: "1× Laser (rapid single)",      color: 0xeab308, effect: { kind: "addTower", towerType: "laser" } },
  { id: "frostgun",  label: "Frost Gun", description: "1× Frost Gun (heavy slow)",    color: 0x67e8f9, effect: { kind: "addTower", towerType: "frostgun" } },
  { id: "fireworks", label: "Fireworks", description: "1× Fireworks (huge AOE)",      color: 0xf43f5e, effect: { kind: "addTower", towerType: "fireworks" } },
  { id: "inferno",   label: "Inferno",   description: "1× Inferno (close range DPS)", color: 0xea580c, effect: { kind: "addTower", towerType: "inferno" } },
  { id: "tornado",   label: "Tornado",   description: "1× Tornado (slow + damage)",   color: 0x9ca3af, effect: { kind: "addTower", towerType: "tornado" } },
  { id: "mechanest", label: "Mecha Nest",description: "1× Mecha Nest (elite)",        color: 0x8b5cf6, effect: { kind: "addTower", towerType: "mechanest" } },
  // Shape cards — three variants per letter, sized by cell count.
  //   I (Straight): 1, 2, 3 cells
  //   L (L Turn):   3, 4, 5 cells
  //   U (U Turn):   4, 5, 7 cells
  { id: "shape-i-1", label: "Straight 1", description: "+1 Straight (1 cell)",  color: 0x78716c, effect: { kind: "addShape", shapeId: "I1", amount: 1 } },
  { id: "shape-i-2", label: "Straight 2", description: "+1 Straight (2 cells)", color: 0x78716c, effect: { kind: "addShape", shapeId: "I2", amount: 1 } },
  { id: "shape-i-3", label: "Straight 3", description: "+1 Straight (3 cells)", color: 0x78716c, effect: { kind: "addShape", shapeId: "I3", amount: 1 } },
  { id: "shape-l-3", label: "L Turn 3",   description: "+1 L-Turn (3 cells)",   color: 0xa78bfa, effect: { kind: "addShape", shapeId: "L3", amount: 1 } },
  { id: "shape-l-4", label: "L Turn 4",   description: "+1 L-Turn (4 cells)",   color: 0xa78bfa, effect: { kind: "addShape", shapeId: "L4", amount: 1 } },
  { id: "shape-l-5", label: "L Turn 5",   description: "+1 L-Turn (5 cells)",   color: 0xa78bfa, effect: { kind: "addShape", shapeId: "L5", amount: 1 } },
  { id: "shape-u-4", label: "U Turn 4",   description: "+1 U-Turn (4 cells)",   color: 0xfb923c, effect: { kind: "addShape", shapeId: "U4", amount: 1 } },
  { id: "shape-u-5", label: "U Turn 5",   description: "+1 U-Turn (5 cells)",   color: 0xfb923c, effect: { kind: "addShape", shapeId: "U5", amount: 1 } },
  { id: "shape-u-7", label: "U Turn 7",   description: "+1 U-Turn (7 cells)",   color: 0xfb923c, effect: { kind: "addShape", shapeId: "U7", amount: 1 } },
  // Utility
  { id: "upgrade",   label: "Upgrade",   description: "+1 level on a tower",     color: 0xa855f7, effect: { kind: "upgrade" } },
  { id: "boost",     label: "Power Up",  description: "All towers +25% damage",  color: 0xfacc15, effect: { kind: "damageBoost", mul: 1.25 } },
  { id: "repair",    label: "Repair",    description: "Restore 5 base HP",       color: 0x22c55e, effect: { kind: "repair", amount: 5 } },
];
