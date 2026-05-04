import Phaser from "phaser";
import { TOWERS, type TowerStats, type TowerType } from "../data/balance";
import { Enemy } from "./Enemy";

export class Tower {
  x: number;
  y: number;
  type: TowerType;
  baseStats: TowerStats;
  level = 1;
  shape: Phaser.GameObjects.Arc;
  rangeRing: Phaser.GameObjects.Arc;

  private levelText: Phaser.GameObjects.Text;
  private lastFireTime = 0;
  private target: Enemy | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, type: TowerType) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.baseStats = TOWERS[type];

    this.rangeRing = scene.add.circle(x, y, this.baseStats.range, this.baseStats.color, 0.05);
    this.rangeRing.setStrokeStyle(1, this.baseStats.color, 0.25);

    this.shape = scene.add.circle(x, y, this.baseStats.radius, this.baseStats.color);
    this.shape.setStrokeStyle(3, 0xffffff);
    this.shape.setInteractive({ useHandCursor: true });

    scene.add
      .text(x, y, this.baseStats.label, {
        fontFamily: "sans-serif",
        fontSize: "16px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.levelText = scene.add
      .text(x + this.baseStats.radius + 2, y - this.baseStats.radius - 2, "1", {
        fontFamily: "sans-serif",
        fontSize: "14px",
        fontStyle: "bold",
        color: "#fde047",
      })
      .setOrigin(0.5);
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
    this.shape.scene.tweens.add({
      targets: this.shape,
      scale: { from: 1.3, to: 1 },
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
