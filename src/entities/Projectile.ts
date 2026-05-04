import Phaser from "phaser";
import { PROJECTILE } from "../data/balance";
import { Enemy } from "./Enemy";

export class Projectile {
  shape: Phaser.GameObjects.Arc;
  isDone = false;

  private target: Enemy;
  private damage: number;

  constructor(scene: Phaser.Scene, x: number, y: number, target: Enemy, damage: number) {
    this.target = target;
    this.damage = damage;
    this.shape = scene.add.circle(x, y, PROJECTILE.radius, PROJECTILE.color);
  }

  update(deltaSec: number): void {
    if (this.isDone) return;

    if (this.target.isDead || this.target.reachedEnd) {
      this.isDone = true;
      return;
    }

    const dx = this.target.shape.x - this.shape.x;
    const dy = this.target.shape.y - this.shape.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < PROJECTILE.hitDistance) {
      this.target.takeDamage(this.damage);
      this.isDone = true;
      return;
    }

    const step = PROJECTILE.speed * deltaSec;
    this.shape.x += (dx / dist) * step;
    this.shape.y += (dy / dist) * step;
  }

  destroy(): void {
    this.shape.destroy();
  }
}
