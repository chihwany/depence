import Phaser from "phaser";
import type { TowerStats } from "../data/balance";
import { Enemy } from "./Enemy";

export class Tower {
  x: number;
  y: number;
  stats: TowerStats;
  shape: Phaser.GameObjects.Arc;
  rangeRing: Phaser.GameObjects.Arc;

  private lastFireTime = 0;
  private target: Enemy | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, stats: TowerStats) {
    this.x = x;
    this.y = y;
    this.stats = stats;

    this.rangeRing = scene.add.circle(x, y, stats.range, stats.color, 0.06);
    this.rangeRing.setStrokeStyle(1, stats.color, 0.25);

    this.shape = scene.add.circle(x, y, stats.radius, stats.color);
    this.shape.setStrokeStyle(3, 0xffffff);
  }

  update(time: number, enemies: readonly Enemy[], onFire: (target: Enemy) => void): void {
    if (
      !this.target ||
      this.target.isDead ||
      this.target.reachedEnd ||
      this.distanceTo(this.target) > this.stats.range
    ) {
      this.target = this.findTarget(enemies);
    }

    if (this.target && time - this.lastFireTime >= this.stats.fireRate) {
      onFire(this.target);
      this.lastFireTime = time;
    }
  }

  private findTarget(enemies: readonly Enemy[]): Enemy | null {
    let best: Enemy | null = null;
    let bestProgress = -1;
    for (const e of enemies) {
      if (e.isDead || e.reachedEnd) continue;
      if (this.distanceTo(e) > this.stats.range) continue;
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
