import Phaser from "phaser";
import { TOWERS, type TowerStats, type TowerType } from "../data/balance";
import { Enemy } from "./Enemy";
import { drawIcon, towerIconKind } from "../ui/Icons";

export class Tower {
  x: number;
  y: number;
  type: TowerType;
  baseStats: TowerStats;
  level = 1;
  // The icon (PNG sprite or procedural Graphics from drawIcon) is the
  // tower's primary visual. Used as a tween target for fire/upgrade flash.
  shape: Phaser.GameObjects.GameObject;
  rangeRing: Phaser.GameObjects.Arc;

  private levelText: Phaser.GameObjects.Text;
  private lastFireTime = 0;
  private target: Enemy | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    type: TowerType,
    parent: Phaser.GameObjects.Container,
  ) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.baseStats = TOWERS[type];

    this.rangeRing = scene.add.circle(x, y, this.baseStats.range, this.baseStats.color, 0.05);
    this.rangeRing.setStrokeStyle(1, this.baseStats.color, 0.25);

    // Icon-only tower visual: no circle background. Sized to fit inside a
    // grid cell (cellSize=70 → ~85% fill). Procedural fallback uses
    // baseStats.color so it isn't invisible white-on-dark.
    const iconSize = 60;
    this.shape = drawIcon(
      scene,
      towerIconKind(this.type),
      x,
      y,
      iconSize,
      this.baseStats.color,
    );

    const textOffset = iconSize / 2 + 2;
    this.levelText = scene.add
      .text(x + textOffset, y - textOffset, "1", {
        fontFamily: "sans-serif",
        fontSize: "14px",
        fontStyle: "bold",
        color: "#fde047",
      })
      .setOrigin(0.5);

    parent.add([this.rangeRing, this.shape, this.levelText]);
  }

  get damage(): number {
    return this.baseStats.damage * Math.pow(1.5, this.level - 1);
  }

  get range(): number {
    return this.baseStats.range;
  }

  get fireRate(): number {
    return this.baseStats.fireRate;
  }

  upgrade(): void {
    this.level++;
    this.levelText.setText(String(this.level));
    const shape = this.shape as Phaser.GameObjects.GameObject & {
      scene: Phaser.Scene;
      scaleX: number;
    };
    // The icon's base scale was set in drawIcon (e.g., size/textureSize).
    // Tween relative to that — using absolute values would stomp the
    // base scale and the image would balloon to texture size.
    const base = shape.scaleX;
    shape.scene.tweens.add({
      targets: this.shape,
      scaleX: { from: base * 1.3, to: base },
      scaleY: { from: base * 1.3, to: base },
      duration: 250,
      ease: "Back.out",
    });
  }

  update(time: number, enemies: readonly Enemy[], onFire: (target: Enemy) => void): void {
    if (
      !this.target ||
      this.target.isDead ||
      this.target.reachedEnd ||
      this.distanceTo(this.target) > this.range
    ) {
      this.target = this.findTarget(enemies);
    }

    if (this.target && time - this.lastFireTime >= this.fireRate) {
      onFire(this.target);
      this.lastFireTime = time;
    }
  }

  private findTarget(enemies: readonly Enemy[]): Enemy | null {
    let best: Enemy | null = null;
    let bestProgress = -1;
    for (const e of enemies) {
      if (e.isDead || e.reachedEnd) continue;
      if (this.distanceTo(e) > this.range) continue;
      if (e.pathProgress > bestProgress) {
        best = e;
        bestProgress = e.pathProgress;
      }
    }
    return best;
  }

  private distanceTo(enemy: Enemy): number {
    const dx = enemy.shape.x - this.x;
    const dy = enemy.shape.y - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
