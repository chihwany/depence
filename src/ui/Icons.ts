import Phaser from "phaser";
import type { CardDef, ShapeId, TowerType } from "../data/balance";

export type IconKind =
  | "sniper"
  | "cannon"
  | "frost"
  | "tesla"
  | "laser"
  | "frostgun"
  | "fireworks"
  | "inferno"
  | "tornado"
  | "mechanest"
  | "straight"
  | "lturn"
  | "uturn"
  | "upgrade"
  | "boost"
  | "repair";

const SHAPE_TO_ICON: Record<ShapeId, IconKind> = {
  I1: "straight",
  I2: "straight",
  I3: "straight",
  L3: "lturn",
  L4: "lturn",
  L5: "lturn",
  U4: "uturn",
  U5: "uturn",
  U7: "uturn",
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
    // Use setScale based on the frame's own width — more reliable across
    // texture types (256×256 PNGs vs 64×64 SVGs) and survives re-parenting
    // into a scaled container, which setDisplaySize did not.
    const frameW = img.frame?.width || 256;
    img.setScale(size / frameW);
    return img;
  }

  const g = scene.add.graphics();
  g.x = x;
  g.y = y;
  switch (kind) {
    case "sniper":    drawSniper(g, size, color); break;
    case "cannon":    drawCannon(g, size, color); break;
    case "frost":     drawFrost(g, size, color); break;
    case "tesla":     drawTesla(g, size, color); break;
    case "laser":     drawLaser(g, size, color); break;
    case "frostgun":  drawFrostGun(g, size, color); break;
    case "fireworks": drawFireworks(g, size, color); break;
    case "inferno":   drawInferno(g, size, color); break;
    case "tornado":   drawTornado(g, size, color); break;
    case "mechanest": drawMechaNest(g, size, color); break;
    case "straight":  drawStraight(g, size, color); break;
    case "lturn":     drawLTurn(g, size, color); break;
    case "uturn":     drawUTurn(g, size, color); break;
    case "upgrade":   drawUpgrade(g, size, color); break;
    case "boost":     drawBoost(g, size, color); break;
    case "repair":    drawRepair(g, size, color); break;
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

// ---- new tower icons -----------------------------------------------------

function drawTesla(g: Phaser.GameObjects.Graphics, s: number, c: number) {
  const h = s / 2;
  // Coil base (stack of horizontal lines) + spark on top
  g.lineStyle(Math.max(1.5, s * 0.07), c, 1);
  g.strokeCircle(0, h * 0.5, h * 0.45);
  g.strokeCircle(0, h * 0.2, h * 0.35);
  g.strokeCircle(0, -h * 0.05, h * 0.27);
  // Spark / lightning bolt rising from top
  g.fillStyle(c, 1);
  g.beginPath();
  g.moveTo(h * 0.1, -h * 0.95);
  g.lineTo(-h * 0.2, -h * 0.35);
  g.lineTo(0, -h * 0.35);
  g.lineTo(-h * 0.1, h * 0.05);
  g.lineTo(h * 0.2, -h * 0.45);
  g.lineTo(0, -h * 0.45);
  g.closePath();
  g.fillPath();
}

function drawLaser(g: Phaser.GameObjects.Graphics, s: number, c: number) {
  const h = s / 2;
  // Horizontal beam with crosshair sight on right
  g.lineStyle(Math.max(2, s * 0.1), c, 1);
  g.lineBetween(-h * 0.95, 0, h * 0.6, 0);
  g.strokeCircle(h * 0.78, 0, h * 0.18);
  g.lineBetween(h * 0.78 - h * 0.28, 0, h * 0.78 - h * 0.18, 0);
  g.lineBetween(h * 0.78 + h * 0.18, 0, h * 0.78 + h * 0.28, 0);
}

function drawFrostGun(g: Phaser.GameObjects.Graphics, s: number, c: number) {
  const h = s / 2;
  // Denser snowflake (8 spokes + outer ring)
  g.lineStyle(Math.max(1.5, s * 0.07), c, 1);
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI / 4) * i;
    g.lineBetween(0, 0, Math.cos(angle) * h * 0.95, Math.sin(angle) * h * 0.95);
  }
  g.strokeCircle(0, 0, h * 0.35);
}

function drawFireworks(g: Phaser.GameObjects.Graphics, s: number, c: number) {
  const h = s / 2;
  // Starburst — 12 spokes radiating from center
  g.lineStyle(Math.max(1.5, s * 0.07), c, 1);
  for (let i = 0; i < 12; i++) {
    const angle = ((Math.PI * 2) / 12) * i;
    const inner = h * 0.18;
    const outer = h * 0.95;
    g.lineBetween(
      Math.cos(angle) * inner,
      Math.sin(angle) * inner,
      Math.cos(angle) * outer,
      Math.sin(angle) * outer,
    );
  }
  g.fillStyle(c, 1);
  g.fillCircle(0, 0, h * 0.18);
}

function drawInferno(g: Phaser.GameObjects.Graphics, s: number, c: number) {
  const h = s / 2;
  // Flame silhouette (zigzag bottom for the flicker)
  g.fillStyle(c, 1);
  g.beginPath();
  g.moveTo(0, -h * 0.95);
  g.lineTo(h * 0.55, -h * 0.2);
  g.lineTo(h * 0.3, h * 0.3);
  g.lineTo(h * 0.6, h * 0.85);
  g.lineTo(h * 0.15, h * 0.55);
  g.lineTo(0, h * 0.85);
  g.lineTo(-h * 0.15, h * 0.55);
  g.lineTo(-h * 0.6, h * 0.85);
  g.lineTo(-h * 0.3, h * 0.3);
  g.lineTo(-h * 0.55, -h * 0.2);
  g.closePath();
  g.fillPath();
}

function drawTornado(g: Phaser.GameObjects.Graphics, s: number, c: number) {
  const h = s / 2;
  // Funnel — wide bands at top tapering down
  g.lineStyle(Math.max(2, s * 0.1), c, 1);
  g.lineBetween(-h * 0.9, -h * 0.75, h * 0.9, -h * 0.75);
  g.lineBetween(-h * 0.7, -h * 0.3, h * 0.7, -h * 0.3);
  g.lineBetween(-h * 0.45, h * 0.15, h * 0.45, h * 0.15);
  g.lineBetween(-h * 0.2, h * 0.6, h * 0.2, h * 0.6);
  g.lineBetween(-h * 0.05, h * 0.9, h * 0.05, h * 0.9);
}

function drawMechaNest(g: Phaser.GameObjects.Graphics, s: number, c: number) {
  const h = s / 2;
  // Hex outline with center dot — fortress-like
  g.lineStyle(Math.max(2, s * 0.09), c, 1);
  g.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i + Math.PI / 6;
    const x = Math.cos(angle) * h * 0.85;
    const y = Math.sin(angle) * h * 0.85;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.closePath();
  g.strokePath();
  g.fillStyle(c, 1);
  g.fillCircle(0, 0, h * 0.22);
  // 4 corner studs
  for (let i = 0; i < 4; i++) {
    const angle = (Math.PI / 2) * i + Math.PI / 4;
    g.fillCircle(Math.cos(angle) * h * 0.5, Math.sin(angle) * h * 0.5, h * 0.08);
  }
}
