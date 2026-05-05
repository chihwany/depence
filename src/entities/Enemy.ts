import Phaser from "phaser";
import type { EnemyStats } from "../data/balance";

export class Enemy {
  shape: Phaser.GameObjects.Arc;
  stats: EnemyStats;
  hp: number;
  maxHp: number;
  pathProgress = 0;
  isDead = false;
  reachedEnd = false;

  private path: Phaser.Curves.Path;
  private pathLength: number;
  private hpBarBg: Phaser.GameObjects.Rectangle;
  private hpBar: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;

  private slowMul = 1;
  private slowEndTime = 0;
  private originalColor: number;

  constructor(
    scene: Phaser.Scene,
    path: Phaser.Curves.Path,
    stats: EnemyStats,
    parent: Phaser.GameObjects.Container,
  ) {
    this.path = path;
    this.pathLength = path.getLength();
    this.stats = stats;
    this.hp = stats.hp;
    this.maxHp = stats.hp;
    this.originalColor = stats.color;

    const start = path.getPoint(0);
    const sx = start ? start.x : 0;
    const sy = start ? start.y : 0;

    this.shape = scene.add.circle(sx, sy, stats.radius, stats.color);
    this.shape.setStrokeStyle(2, 0xffffff, 0.8);

    this.label = scene.add
      .text(sx, sy, stats.label, {
        fontFamily: "sans-serif",
        fontSize: `${Math.floor(stats.radius)}px`,
        fontStyle: "bold",
        color: "#0f172a",
      })
      .setOrigin(0.5);

    const barW = stats.radius * 2;
    const barY = sy - stats.radius - 8;
    this.hpBarBg = scene.add.rectangle(sx - stats.radius, barY, barW, 4, 0x000000, 0.6);
    this.hpBarBg.setOrigin(0, 0.5);
    this.hpBar = scene.add.rectangle(sx - stats.radius, barY, barW, 4, 0x22c55e);
    this.hpBar.setOrigin(0, 0.5);

    parent.add([this.shape, this.label, this.hpBarBg, this.hpBar]);
  }

  update(deltaSec: number, currentTime: number): void {
    if (this.isDead || this.reachedEnd) return;

    if (this.slowEndTime > 0 && currentTime >= this.slowEndTime) {
      this.slowMul = 1;
      this.slowEndTime = 0;
      this.shape.setFillStyle(this.originalColor);
    }

    const speed = this.stats.speed * this.slowMul;
    this.pathProgress += (speed * deltaSec) / this.pathLength;
    if (this.pathProgress >= 1) {
      this.pathProgress = 1;
      this.reachedEnd = true;
    }

    const point = this.path.getPoint(this.pathProgress);
    if (!point) return;

    this.shape.setPosition(point.x, point.y);
    this.label.setPosition(point.x, point.y);
    const barX = point.x - this.stats.radius;
    const barY = point.y - this.stats.radius - 8;
    this.hpBarBg.setPosition(barX, barY);
    this.hpBar.setPosition(barX, barY);
  }

  takeDamage(amount: number): void {
    if (this.isDead || this.reachedEnd) return;
    this.hp -= amount;
    const ratio = Math.max(0, this.hp / this.maxHp);
    this.hpBar.scaleX = ratio;
    if (this.hp <= 0) {
      this.isDead = true;
    }
  }

  applySlow(mul: number, durationMs: number, currentTime: number): void {
    if (this.isDead || this.reachedEnd) return;
    if (mul < this.slowMul) {
      this.slowMul = mul;
    }
    this.slowEndTime = Math.max(this.slowEndTime, currentTime + durationMs);
    this.shape.setFillStyle(0x06b6d4);
  }

  destroy(): void {
    this.shape.destroy();
    this.label.destroy();
    this.hpBar.destroy();
    this.hpBarBg.destroy();
  }
}
