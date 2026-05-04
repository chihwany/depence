import Phaser from "phaser";

export interface SlotPos {
  x: number;
  y: number;
}

export function createPath(): Phaser.Curves.Path {
  const path = new Phaser.Curves.Path(360, 60);
  path.lineTo(520, 300);
  path.lineTo(200, 500);
  path.lineTo(520, 700);
  path.lineTo(200, 900);
  path.lineTo(360, 1180);
  return path;
}

export const TOWER_SLOTS: SlotPos[] = [
  { x: 240, y: 200 },
  { x: 480, y: 200 },
  { x: 240, y: 400 },
  { x: 480, y: 400 },
  { x: 240, y: 600 },
  { x: 480, y: 600 },
  { x: 240, y: 800 },
  { x: 480, y: 800 },
  { x: 240, y: 1000 },
  { x: 480, y: 1000 },
];
