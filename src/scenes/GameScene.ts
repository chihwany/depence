import Phaser from "phaser";
import { BASE, ENEMIES, SCREEN, TOWERS, WAVE } from "../data/balance";
import { createPath, TOWER_SLOTS, type SlotPos } from "../systems/Path";
import { Enemy } from "../entities/Enemy";
import { Tower } from "../entities/Tower";
import { Projectile } from "../entities/Projectile";

type Phase = "build" | "wave" | "ended";

export class GameScene extends Phaser.Scene {
  private path!: Phaser.Curves.Path;
  private enemies: Enemy[] = [];
  private towers: Tower[] = [];
  private projectiles: Projectile[] = [];
  private slotMarkers = new Map<SlotPos, Phaser.GameObjects.Arc>();

  private baseHp = BASE.maxHp;
  private spawned = 0;
  private nextSpawnTime = 0;
  private phase: Phase = "build";

  private hpText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private startButton!: Phaser.GameObjects.Container;

  constructor() {
    super("GameScene");
  }

  create(): void {
    this.resetState();

    this.path = createPath();
    this.drawPath();
    this.drawBase();
    this.drawSlots();
    this.drawHud();
    this.drawStartButton();
  }

  override update(time: number, delta: number): void {
    if (this.phase === "ended") return;
    const dt = delta / 1000;

    if (this.phase === "wave") {
      this.spawnTick(time);
    }

    for (const e of this.enemies) {
      e.update(dt);
      if (e.reachedEnd && !e.isDead) {
        this.baseHp -= e.stats.damage;
        e.isDead = true;
        this.updateHud();
      }
    }

    for (const t of this.towers) {
      t.update(time, this.enemies, (target) => {
        const p = new Projectile(this, t.x, t.y, target, t.stats.damage);
        this.projectiles.push(p);
      });
    }

    for (const p of this.projectiles) {
      p.update(dt);
    }

    this.enemies = this.enemies.filter((e) => {
      if (e.isDead) {
        e.destroy();
        return false;
      }
      return true;
    });
    this.projectiles = this.projectiles.filter((p) => {
      if (p.isDone) {
        p.destroy();
        return false;
      }
      return true;
    });

    if (this.phase === "wave") {
      if (this.baseHp <= 0) {
        this.endGame(false);
      } else if (this.spawned >= WAVE.enemyCount && this.enemies.length === 0) {
        this.endGame(true);
      }
    }
  }

  private resetState(): void {
    this.enemies = [];
    this.towers = [];
    this.projectiles = [];
    this.slotMarkers.clear();
    this.baseHp = BASE.maxHp;
    this.spawned = 0;
    this.nextSpawnTime = 0;
    this.phase = "build";
  }

  private drawPath(): void {
    const g = this.add.graphics();
    g.lineStyle(28, 0x57534e, 0.45);
    this.path.draw(g);
  }

  private drawBase(): void {
    const end = this.path.getPoint(1);
    if (!end) return;
    const base = this.add.rectangle(end.x, end.y, 90, 70, 0x166534);
    base.setStrokeStyle(3, 0x4ade80);
    this.add
      .text(end.x, end.y, "BASE", {
        fontFamily: "sans-serif",
        fontSize: "16px",
        color: "#ffffff",
      })
      .setOrigin(0.5);
  }

  private drawSlots(): void {
    for (const slot of TOWER_SLOTS) {
      const marker = this.add.circle(slot.x, slot.y, 22, 0xffffff, 0.08);
      marker.setStrokeStyle(2, 0xffffff, 0.35);
      marker.setInteractive({ useHandCursor: true });
      marker.on("pointerdown", () => this.placeTower(slot));
      this.slotMarkers.set(slot, marker);
    }
  }

  private placeTower(slot: SlotPos): void {
    if (this.phase === "ended") return;
    const marker = this.slotMarkers.get(slot);
    if (!marker) return;
    const tower = new Tower(this, slot.x, slot.y, TOWERS.sniper);
    this.towers.push(tower);
    marker.destroy();
    this.slotMarkers.delete(slot);
  }

  private drawHud(): void {
    this.hpText = this.add.text(20, 20, "", {
      fontFamily: "sans-serif",
      fontSize: "26px",
      color: "#ffffff",
    });
    this.waveText = this.add.text(20, 56, "Wave 1 — Build phase", {
      fontFamily: "sans-serif",
      fontSize: "18px",
      color: "#9ca3af",
    });
    this.statusText = this.add
      .text(SCREEN.width / 2, SCREEN.height / 2, "", {
        fontFamily: "sans-serif",
        fontSize: "56px",
        color: "#ffffff",
      })
      .setOrigin(0.5);
    this.updateHud();
  }

  private drawStartButton(): void {
    const x = SCREEN.width / 2;
    const y = SCREEN.height - 80;
    const bg = this.add.rectangle(0, 0, 240, 60, 0x4ade80);
    bg.setStrokeStyle(2, 0xffffff);
    const label = this.add
      .text(0, 0, "START WAVE", {
        fontFamily: "sans-serif",
        fontSize: "22px",
        color: "#0f172a",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.startButton = this.add.container(x, y, [bg, label]);
    this.startButton.setSize(240, 60);
    this.startButton.setInteractive({ useHandCursor: true });
    this.startButton.on("pointerdown", () => this.startWave());
  }

  private startWave(): void {
    if (this.phase !== "build") return;
    this.phase = "wave";
    this.nextSpawnTime = this.time.now;
    this.startButton.destroy();
    this.waveText.setText(`Wave 1 — Defend!`);
  }

  private spawnTick(time: number): void {
    if (this.spawned >= WAVE.enemyCount) return;
    if (time < this.nextSpawnTime) return;
    this.enemies.push(new Enemy(this, this.path, ENEMIES.grunt));
    this.spawned++;
    this.nextSpawnTime = time + WAVE.spawnInterval;
  }

  private updateHud(): void {
    this.hpText.setText(`HP ${Math.max(0, this.baseHp)} / ${BASE.maxHp}`);
  }

  private endGame(won: boolean): void {
    this.phase = "ended";
    this.statusText.setText(won ? "VICTORY" : "DEFEAT");
    this.statusText.setColor(won ? "#4ade80" : "#ef4444");

    const hint = this.add
      .text(SCREEN.width / 2, SCREEN.height / 2 + 80, "Tap anywhere to retry", {
        fontFamily: "sans-serif",
        fontSize: "20px",
        color: "#e5e7eb",
      })
      .setOrigin(0.5);

    this.time.delayedCall(600, () => {
      this.input.once("pointerdown", () => {
        hint.destroy();
        this.scene.restart();
      });
    });
  }
}
