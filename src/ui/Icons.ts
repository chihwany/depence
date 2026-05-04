import Phaser from "phaser";
import type { CardDef, ShapeId, TowerType } from "../data/balance";

export type IconKind =
  | "sniper"
  | "cannon"
  | "frost"
  | "straight"
  | "lturn"
  | "uturn"
  | "upgrade"
  | "boost"
  | "repair";

const SHAPE_TO_ICON: Record<ShapeId, IconKind> = {
  I: "straight",
  L: "lturn",
  U: "uturn",
};

export function towerIconKind(type: TowerType): IconKind {
  return type;
}

export function shapeIconKind(id: ShapeId): IconKind {
  return SHAPE_TO_ICON[id];
}

export function cardIconKind(card: CardDef): IconKind | null {
  switch (card.effect.kind) {
    case "addTower":
      return card.effect.towerType;
    case "addShape":
      return SHAPE_TO_ICON[card.effect.shapeId];
    case "upgrade":
      return "upgrade";
    case "damageBoost":
      return "boost";
    case "repair":
      return "repair";
  }
}

/**
 * Draw a procedural icon at (x, y). Returns the Graphics object so the
 * caller can add it to a container or destroy it.
 *
 * If a Phaser texture named `icon-<kind>` is loaded (e.g. via preload),
 * the function returns a sprite with that texture instead — making it a
 * drop-in upgrade path once real image assets are added.
 */
export function drawIcon(
  scene: Phaser.Scene,
  kind: IconKind,
  x: number,
  y: number,
  size: number,
  color: number = 0xffffff,
): Phaser.GameObjects.GameObject {
  const textureKey = `icon-${kind}`;
  if (scene.textures.exists(textureKey)) {
    const img = scene.add.image(x, y, textureKey);
    img.setDisplaySize(size, size);
    return img;
  }

  const g = scene.add.graphics();
  g.x = x;
  g.y = y;
  switch (kind) {
    case "sniper":
      drawSniper(g, size, color);
      break;
    case "cannon":
      drawCannon(g, size, color);
      break;
    case "frost":
      drawFrost(g, size, color);
      break;
    case "straight":
      drawStraight(g, size, color);
      break;
    case "lturn":
      drawLTurn(g, size, color);
      break;
    case "uturn":
      drawUTurn(g, size, color);
      break;
    case "upgrade":
      drawUpgrade(g, size, color);
      break;
    case "boost":
      drawBoost(g, size, color);
      break;
    case "repair":
      drawRepair(g, size, color);
      break;
  }
  return g;
}

// ---- procedural icon definitions -----------------------------------------

function drawSniper(g: Phaser.GameObjects.Graphics, s: number, c: number) {
  const h = s / 2;
  g.lineStyle(Math.max(1.5, s * 0.08), c, 1);
  g.beginPath();
  g.moveTo(0, -h * 0.9);
  g.lineTo(h * 0.85, h * 0.7);
  g.lineTo(-h * 0.85, h * 0.7);
  g.closePath();
  g.strokePath();
  g.fillStyle(c, 1);
  g.fillCircle(0, h * 0.05, s * 0.08);
}

function drawCannon(g: Phaser.GameObjects.Graphics, s: number, c: number) {
  const h = s / 2;
  g.lineStyle(Math.max(1.8, s * 0.09), c, 1);
  g.strokeCircle(0, 0, h * 0.78);
  g.lineBetween(-h * 0.55, 0, h * 0.55, 0);
  g.lineBetween(0, -h * 0.55, 0, h * 0.55);
}

function drawFrost(g: Phaser.GameObjects.Graphics, s: number, c: number) {
  const h = s / 2;
  g.lineStyle(Math.max(1.5, s * 0.08), c, 1);
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const ox = Math.cos(angle) * h * 0.95;
    const oy = Math.sin(angle) * h * 0.95;
    g.lineBetween(0, 0, ox, oy);
    // small ticks near tip for snowflake feel
    const tickAngle1 = angle + Math.PI / 6;
    const tickAngle2 = angle - Math.PI / 6;
    const tx = Math.cos(angle) * h * 0.55;
    const ty = Math.sin(angle) * h * 0.55;
    g.lineBetween(tx, ty, tx + Math.cos(tickAngle1) * h * 0.2, ty + Math.sin(tickAngle1) * h * 0.2);
    g.lineBetween(tx, ty, tx + Math.cos(tickAngle2) * h * 0.2, ty + Math.sin(tickAngle2) * h * 0.2);
  }
}

function drawStraight(g: Phaser.GameObjects.Graphics, s: number, c: number) {
  const h = s / 2;
  g.fillStyle(c, 1);
  g.fillRect(-s * 0.18, -h * 0.85, s * 0.36, h * 1.7);
}

function drawLTurn(g: Phaser.GameObjects.Graphics, s: number, c: number) {
  const h = s / 2;
  const t = s * 0.22;
  g.fillStyle(c, 1);
  // vertical leg
  g.fillRect(-h * 0.7, -h * 0.7, t, h * 1.4);
  // horizontal leg at bottom
  g.fillRect(-h * 0.7, h * 0.7 - t, h * 1.4, t);
}

function drawUTurn(g: Phaser.GameObjects.Graphics, s: number, c: number) {
  const h = s / 2;
  const t = s * 0.18;
  g.fillStyle(c, 1);
  g.fillRect(-h * 0.7, -h * 0.6, t, h * 1.3);
  g.fillRect(-h * 0.7, h * 0.7 - t, h * 1.4, t);
  g.fillRect(h * 0.7 - t, -h * 0.6, t, h * 1.3);
}

function drawUpgrade(g: Phaser.GameObjects.Graphics, s: number, c: number) {
  const h = s / 2;
  g.fillStyle(c, 1);
  g.beginPath();
  g.moveTo(0, -h * 0.9);
  g.lineTo(h * 0.7, -h * 0.1);
  g.lineTo(h * 0.28, -h * 0.1);
  g.lineTo(h * 0.28, h * 0.85);
  g.lineTo(-h * 0.28, h * 0.85);
  g.lineTo(-h * 0.28, -h * 0.1);
  g.lineTo(-h * 0.7, -h * 0.1);
  g.closePath();
  g.fillPath();
}

function drawBoost(g: Phaser.GameObjects.Graphics, s: number, c: number) {
  const h = s / 2;
  g.fillStyle(c, 1);
  g.beginPath();
  g.moveTo(h * 0.15, -h * 0.95);
  g.lineTo(-h * 0.55, h * 0.05);
  g.lineTo(-h * 0.05, h * 0.05);
  g.lineTo(-h * 0.3, h * 0.95);
  g.lineTo(h * 0.55, -h * 0.05);
  g.lineTo(h * 0.05, -h * 0.05);
  g.closePath();
  g.fillPath();
}

function drawRepair(g: Phaser.GameObjects.Graphics, s: number, c: number) {
  const h = s / 2;
  const t = h * 0.34;
  g.fillStyle(c, 1);
  g.fillRect(-t, -h * 0.85, t * 2, h * 1.7);
  g.fillRect(-h * 0.85, -t, h * 1.7, t * 2);
}
