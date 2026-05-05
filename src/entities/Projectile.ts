import Phaser from "phaser";
import { PROJECTILE } from "../data/balance";
import { Enemy } from "./Enemy";

export type ProjectileHitCallback = (target: Enemy, x: number, y: number) => void;

export class Projectile {
  shape: Phaser.GameObjects.Arc;
  isDone = false;

  private target: Enemy;
  private onHit: ProjectileHitCallback;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    target: Enemy,
    onHit: ProjectileHitCallback,
    color: number = PROJECTILE.color,
    parent?: Phaser.GameObjects.Container,
  ) {
    this.target = target;
    this.onHit = onHit;
    this.shape = scene.add.circle(x, y, PROJECTILE.radius, color);
    if (parent) parent.add(this.shape);
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
      this.onHit(this.target, this.shape.x, this.shape.y);
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
