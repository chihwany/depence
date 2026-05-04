import Phaser from "phaser";
import {
  BASE,
  SCREEN,
  TOWERS,
  WAVES,
  type CardDef,
  type TowerType,
} from "../data/balance";
import {
  GRID_CONFIG,
  SPAWN_CELL,
  BASE_CELL,
  INITIAL_ROADS,
  buildCurvePath,
  isPathValid,
} from "../systems/Path";
import { Grid, type GridPosition } from "../systems/Grid";
import { WaveRunner } from "../systems/WaveRunner";
import { drawCards } from "../systems/CardPool";
import { Enemy } from "../entities/Enemy";
import { Tower } from "../entities/Tower";
import { Projectile } from "../entities/Projectile";
import { createButton } from "../ui/Button";
import type { ResultData } from "./ResultScene";

type Phase = "build" | "wave" | "cardPick" | "ended";
type Selection =
  | { kind: "tower"; towerType: TowerType }
  | { kind: "upgrade" }
  | null;

export class GameScene extends Phaser.Scene {
  private grid!: Grid;
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private path: Phaser.Curves.Path | null = null;
  private enemies: Enemy[] = [];
  private towers: Tower[] = [];
  private projectiles: Projectile[] = [];
  private cellTowers = new Map<string, Tower>();

  private phase: Phase = "build";
  private waveIndex = 0;
  private baseHp: number = BASE.maxHp;
  private damageMul = 1;
  private waveRunner: WaveRunner | null = null;

  private towerTokens: TowerType[] = [];
  private upgradeTokens = 0;
  private selection: Selection = null;

  private hpText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private startButton!: Phaser.GameObjects.Container;
  private handContainer!: Phaser.GameObjects.Container;
  private cardModal: Phaser.GameObjects.Container | null = null;
  private pauseModal: Phaser.GameObjects.Container | null = null;
  private isPaused = false;
  private matchStartTime = 0;

  private gameTime = 0;
  private speedMul = 1;
  private speedButton!: Phaser.GameObjects.Container;

  constructor() {
    super("GameScene");
  }

  create(): void {
    this.resetState();
    this.matchStartTime = this.time.now;
    this.grid = new Grid(GRID_CONFIG, SPAWN_CELL, BASE_CELL);
    this.applyInitialRoads();
    this.gridGraphics = this.add.graphics();
    this.redrawGrid();
    this.drawSpawnAndBase();
    this.setupGridInput();
    this.drawHud();
    this.drawSpeedButton();
    this.drawPauseButton();
    this.handContainer = this.add.container(0, 0);
    this.drawStartButton();
    this.refreshHand();
    this.updateStartButton();

    this.input.on(
      "gameobjectdown",
      (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
        const tower = this.towers.find((t) => t.shape === obj);
        if (tower) this.onTowerTap(tower);
      },
    );
  }

  override update(_time: number, delta: number): void {
    if (this.isPaused) return;
    if (this.phase === "ended" || this.phase === "cardPick") return;

    const scaledDeltaMs = delta * this.speedMul;
    this.gameTime += scaledDeltaMs;
    const dt = scaledDeltaMs / 1000;
    const t = this.gameTime;

    if (this.phase === "wave" && this.waveRunner && this.path) {
      const newSpawns = this.waveRunner.tick(t);
      for (const stats of newSpawns) {
        this.enemies.push(new Enemy(this, this.path, stats));
      }
    }

    for (const e of this.enemies) {
      e.update(dt, t);
      if (e.reachedEnd && !e.isDead) {
        this.baseHp -= e.stats.damage;
        e.isDead = true;
        this.updateHud();
      }
    }

    for (const tower of this.towers) {
      tower.update(t, this.enemies, (target) => this.fireFrom(tower, target));
    }

    for (const p of this.projectiles) {
      p.update(dt);
    }

    this.enemies = this.enemies.filter((e) => {
      if (e.isDead) {
        if (!e.reachedEnd) {
          this.spawnDeathEffect(e.shape.x, e.shape.y, e.stats.color);
        }
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
      } else if (this.waveRunner?.isDone() && this.enemies.length === 0) {
        this.endWave();
      }
    }
  }

  // === Setup ===

  private resetState(): void {
    this.enemies = [];
    this.towers = [];
    this.projectiles = [];
    this.cellTowers.clear();
    this.path = null;
    this.phase = "build";
    this.waveIndex = 0;
    this.baseHp = BASE.maxHp;
    this.damageMul = 1;
    this.waveRunner = null;
    this.towerTokens = ["sniper"];
    this.upgradeTokens = 0;
    this.selection = null;
    this.cardModal = null;
    this.pauseModal = null;
    this.isPaused = false;
    this.gameTime = 0;
    this.speedMul = 1;
    this.tweens.timeScale = 1;
  }

  private applyInitialRoads(): void {
    for (const r of INITIAL_ROADS) {
      this.grid.setCellType(r.col, r.row, "road");
    }
  }

  private redrawGrid(): void {
    this.gridGraphics.clear();
    const size = this.grid.config.cellSize;
    const inner = size - 2;
    for (let row = 0; row < this.grid.config.rows; row++) {
      for (let col = 0; col < this.grid.config.cols; col++) {
        const cell = this.grid.getCell(col, row);
        if (!cell) continue;
        const w = this.grid.cellToWorld(col, row);
        const x = w.x - size / 2 + 1;
        const y = w.y - size / 2 + 1;

        switch (cell.type) {
          case "empty":
            this.gridGraphics.fillStyle(0xffffff, 0.04);
            this.gridGraphics.fillRect(x, y, inner, inner);
            break;
          case "road":
            this.gridGraphics.fillStyle(0x78716c, 0.7);
            this.gridGraphics.fillRect(x, y, inner, inner);
            break;
          case "spawn":
            this.gridGraphics.fillStyle(0xef4444, 0.45);
            this.gridGraphics.fillRect(x, y, inner, inner);
            break;
          case "base":
            this.gridGraphics.fillStyle(0x16a34a, 0.45);
            this.gridGraphics.fillRect(x, y, inner, inner);
            break;
          case "tower":
            this.gridGraphics.fillStyle(0x1f2937, 0.6);
            this.gridGraphics.fillRect(x, y, inner, inner);
            break;
        }

        this.gridGraphics.lineStyle(1, 0xffffff, 0.08);
        this.gridGraphics.strokeRect(x, y, inner, inner);
      }
    }
  }

  private drawSpawnAndBase(): void {
    const s = this.grid.cellToWorld(this.grid.spawn.col, this.grid.spawn.row);
    this.add
      .text(s.x, s.y, "SPAWN", {
        fontFamily: "sans-serif",
        fontSize: "12px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);
    const b = this.grid.cellToWorld(this.grid.base.col, this.grid.base.row);
    this.add
      .text(b.x, b.y, "BASE", {
        fontFamily: "sans-serif",
        fontSize: "12px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);
  }

  private setupGridInput(): void {
    const cfg = this.grid.config;
    const cx = cfg.offsetX + (cfg.cols * cfg.cellSize) / 2;
    const cy = cfg.offsetY + (cfg.rows * cfg.cellSize) / 2;
    const w = cfg.cols * cfg.cellSize;
    const h = cfg.rows * cfg.cellSize;
    const area = this.add.rectangle(cx, cy, w, h, 0x000000, 0);
    area.setInteractive();
    area.on("pointerdown", (p: Phaser.Input.Pointer) => {
      const cell = this.grid.worldToCell(p.x, p.y);
      if (cell) this.onCellTap(cell);
    });
  }

  private drawHud(): void {
    this.hpText = this.add.text(20, 20, "", {
      fontFamily: "sans-serif",
      fontSize: "26px",
      color: "#ffffff",
    });
    this.waveText = this.add.text(20, 56, "", {
      fontFamily: "sans-serif",
      fontSize: "16px",
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
    const x = SCREEN.width - 160;
    const y = SCREEN.height - 60;
    const bg = this.add.rectangle(0, 0, 280, 70, 0x4ade80);
    bg.setStrokeStyle(2, 0xffffff);
    const label = this.add
      .text(0, 0, "START WAVE 1", {
        fontFamily: "sans-serif",
        fontSize: "20px",
        fontStyle: "bold",
        color: "#0f172a",
      })
      .setOrigin(0.5);
    this.startButton = this.add.container(x, y, [bg, label]);
    this.startButton.setSize(280, 70);
    this.startButton.setInteractive({ useHandCursor: true });
    this.startButton.on("pointerdown", () => this.startWave());
  }

  private updateStartButton(): void {
    if (!this.startButton.scene) return;
    if (this.phase === "build" && this.waveIndex < WAVES.length) {
      const valid = isPathValid(this.grid);
      const lbl = this.startButton.list[1] as Phaser.GameObjects.Text;
      const bg = this.startButton.list[0] as Phaser.GameObjects.Rectangle;
      if (valid) {
        lbl.setText(`START WAVE ${this.waveIndex + 1}`);
        bg.setFillStyle(0x4ade80);
      } else {
        lbl.setText("PATH INCOMPLETE");
        bg.setFillStyle(0x6b7280);
      }
      this.startButton.setVisible(true);
    } else {
      this.startButton.setVisible(false);
    }
  }

  private updateHud(): void {
    this.hpText.setText(`HP ${Math.max(0, this.baseHp)} / ${BASE.maxHp}`);
    const phaseLabel =
      this.phase === "build"
        ? "Build"
        : this.phase === "wave"
          ? "Defend"
          : this.phase === "cardPick"
            ? "Pick a card"
            : "—";
    const wIdx = Math.min(this.waveIndex + 1, WAVES.length);
    const boost =
      this.damageMul > 1
        ? `   Boost ×${this.damageMul.toFixed(2)}`
        : "";
    this.waveText.setText(
      `Wave ${wIdx} / ${WAVES.length} — ${phaseLabel}${boost}`,
    );
  }

  // === Phase transitions ===

  private startWave(): void {
    if (this.phase !== "build") return;
    if (this.waveIndex >= WAVES.length) return;
    const newPath = buildCurvePath(this.grid);
    if (!newPath) return;
    this.path = newPath;
    this.phase = "wave";
    this.selection = null;
    const wave = WAVES[this.waveIndex];
    if (!wave) return;
    this.waveRunner = new WaveRunner(wave, this.gameTime);
    this.showWaveBanner(this.waveIndex + 1, wave.isBoss === true);
    this.updateHud();
    this.refreshHand();
    this.updateStartButton();
  }

  private endWave(): void {
    this.waveIndex++;
    if (this.waveIndex >= WAVES.length) {
      this.endGame(true);
      return;
    }
    this.phase = "cardPick";
    this.updateHud();
    this.updateStartButton();
    this.showCardPick();
  }

  private endGame(won: boolean): void {
    this.phase = "ended";
    this.updateStartButton();
    this.statusText.setText(won ? "VICTORY" : "DEFEAT");
    this.statusText.setColor(won ? "#4ade80" : "#ef4444");

    const waveReached = won ? WAVES.length : this.waveIndex + 1;
    const duration = Math.floor((this.time.now - this.matchStartTime) / 1000);
    const result: ResultData = { won, waveReached, duration };

    this.time.delayedCall(900, () => {
      this.scene.start("ResultScene", result);
    });
  }

  // === Pause ===

  private drawPauseButton(): void {
    createButton(this, SCREEN.width - 60, 40, {
      label: "PAUSE",
      width: 100,
      height: 44,
      fillColor: 0x475569,
      textColor: "#ffffff",
      fontSize: 14,
      onClick: () => this.togglePause(),
    });
  }

  private togglePause(): void {
    if (this.phase === "ended" || this.phase === "cardPick") return;
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.showPauseModal();
    } else {
      this.hidePauseModal();
    }
  }

  private showPauseModal(): void {
    const overlay = this.add.rectangle(
      SCREEN.width / 2,
      SCREEN.height / 2,
      SCREEN.width,
      SCREEN.height,
      0x000000,
      0.7,
    );
    overlay.setInteractive();

    const title = this.add
      .text(SCREEN.width / 2, SCREEN.height * 0.32, "PAUSED", {
        fontFamily: "sans-serif",
        fontSize: "56px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    const resume = createButton(this, SCREEN.width / 2, SCREEN.height * 0.48, {
      label: "RESUME",
      width: 280,
      height: 64,
      fillColor: 0x4ade80,
      onClick: () => this.togglePause(),
    });
    const restart = createButton(this, SCREEN.width / 2, SCREEN.height * 0.58, {
      label: "RESTART",
      width: 280,
      height: 64,
      fillColor: 0xf59e0b,
      onClick: () => this.scene.restart(),
    });
    const quit = createButton(this, SCREEN.width / 2, SCREEN.height * 0.68, {
      label: "QUIT TO TITLE",
      width: 280,
      height: 64,
      fillColor: 0x475569,
      textColor: "#ffffff",
      onClick: () => this.scene.start("TitleScene"),
    });

    this.pauseModal = this.add.container(0, 0, [
      overlay,
      title,
      resume,
      restart,
      quit,
    ]);
  }

  private hidePauseModal(): void {
    this.pauseModal?.destroy();
    this.pauseModal = null;
  }

  // === Combat ===

  private fireFrom(tower: Tower, target: Enemy): void {
    const damage = tower.damage * this.damageMul;
    const stats = TOWERS[tower.type];
    this.spawnFireFlash(tower);
    const onHit = (hitTarget: Enemy, hx: number, hy: number) => {
      const now = this.gameTime;
      if (stats.aoeRadius) {
        for (const e of this.enemies) {
          if (e.isDead || e.reachedEnd) continue;
          const d = Math.hypot(e.shape.x - hx, e.shape.y - hy);
          if (d <= stats.aoeRadius) {
            e.takeDamage(damage);
            this.spawnDamagePopup(e.shape.x, e.shape.y, damage);
            if (stats.slowMul && stats.slowDuration) {
              e.applySlow(stats.slowMul, stats.slowDuration, now);
            }
          }
        }
        const splash = this.add.circle(hx, hy, stats.aoeRadius, stats.color, 0.35);
        this.tweens.add({
          targets: splash,
          alpha: 0,
          scale: 1.3,
          duration: 280,
          onComplete: () => splash.destroy(),
        });
      } else {
        hitTarget.takeDamage(damage);
        this.spawnDamagePopup(hitTarget.shape.x, hitTarget.shape.y, damage);
        if (stats.slowMul && stats.slowDuration) {
          hitTarget.applySlow(stats.slowMul, stats.slowDuration, now);
        }
      }
    };
    this.projectiles.push(
      new Projectile(this, tower.x, tower.y, target, onHit, stats.color),
    );
  }

  // === Polish effects ===

  private spawnDamagePopup(x: number, y: number, amount: number): void {
    const text = this.add
      .text(x, y - 16, Math.ceil(amount).toString(), {
        fontFamily: "sans-serif",
        fontSize: "16px",
        fontStyle: "bold",
        color: "#fef3c7",
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: text,
      y: y - 56,
      alpha: { from: 1, to: 0 },
      duration: 600,
      ease: "Sine.out",
      onComplete: () => text.destroy(),
    });
  }

  private spawnDeathEffect(x: number, y: number, color: number): void {
    const ring = this.add.circle(x, y, 10, color, 0.7);
    this.tweens.add({
      targets: ring,
      scale: { from: 1, to: 3 },
      alpha: 0,
      duration: 320,
      ease: "Quad.out",
      onComplete: () => ring.destroy(),
    });
  }

  private spawnFireFlash(tower: Tower): void {
    this.tweens.add({
      targets: tower.shape,
      scale: { from: 1.2, to: 1 },
      duration: 120,
      ease: "Quad.out",
    });
  }

  private showWaveBanner(waveNum: number, isBoss: boolean): void {
    const text = this.add
      .text(
        SCREEN.width / 2,
        SCREEN.height / 2 - 80,
        isBoss ? "BOSS WAVE" : `WAVE ${waveNum}`,
        {
          fontFamily: "sans-serif",
          fontSize: isBoss ? "60px" : "72px",
          fontStyle: "bold",
          color: isBoss ? "#ef4444" : "#ffffff",
        },
      )
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({
      targets: text,
      alpha: 1,
      scale: { from: 1.6, to: 1 },
      duration: 280,
      ease: "Back.out",
      onComplete: () => {
        this.tweens.add({
          targets: text,
          alpha: 0,
          duration: 400,
          delay: 700,
          onComplete: () => text.destroy(),
        });
      },
    });
  }

  // === Speed control ===

  private drawSpeedButton(): void {
    this.speedButton = createButton(this, SCREEN.width - 170, 40, {
      label: "1×",
      width: 80,
      height: 44,
      fillColor: 0x475569,
      textColor: "#ffffff",
      fontSize: 18,
      onClick: () => this.toggleSpeed(),
    });
  }

  private toggleSpeed(): void {
    if (this.phase === "ended") return;
    this.speedMul = this.speedMul === 1 ? 2 : 1;
    this.tweens.timeScale = this.speedMul;
    const lbl = this.speedButton.list[1] as Phaser.GameObjects.Text;
    lbl.setText(`${this.speedMul}×`);
  }

  // === Card pick ===

  private showCardPick(): void {
    const cards = drawCards(3);

    const overlay = this.add.rectangle(
      SCREEN.width / 2,
      SCREEN.height / 2,
      SCREEN.width,
      SCREEN.height,
      0x000000,
      0.75,
    );
    overlay.setInteractive();

    const title = this.add
      .text(SCREEN.width / 2, 230, `Wave ${this.waveIndex} cleared`, {
        fontFamily: "sans-serif",
        fontSize: "32px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);
    const subtitle = this.add
      .text(SCREEN.width / 2, 280, "Pick one card", {
        fontFamily: "sans-serif",
        fontSize: "20px",
        color: "#9ca3af",
      })
      .setOrigin(0.5);

    const cardW = 200;
    const cardH = 280;
    const gap = 18;
    const totalW = cardW * 3 + gap * 2;
    const startX = (SCREEN.width - totalW) / 2 + cardW / 2;
    const cardY = SCREEN.height / 2;

    const cardObjects: Phaser.GameObjects.Container[] = [];
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      if (!card) continue;
      const cx = startX + i * (cardW + gap);
      const bg = this.add.rectangle(0, 0, cardW, cardH, 0x1f2937);
      bg.setStrokeStyle(4, card.color);
      const colorBlock = this.add.rectangle(0, -80, cardW - 20, 80, card.color);
      const labelTxt = this.add
        .text(0, -8, card.label, {
          fontFamily: "sans-serif",
          fontSize: "26px",
          fontStyle: "bold",
          color: "#ffffff",
        })
        .setOrigin(0.5);
      const descTxt = this.add
        .text(0, 50, card.description, {
          fontFamily: "sans-serif",
          fontSize: "16px",
          color: "#d1d5db",
          align: "center",
          wordWrap: { width: cardW - 24 },
        })
        .setOrigin(0.5);

      const container = this.add.container(cx, cardY, [
        bg,
        colorBlock,
        labelTxt,
        descTxt,
      ]);
      container.setSize(cardW, cardH);
      container.setInteractive({ useHandCursor: true });
      container.on("pointerdown", () => this.pickCard(card));
      cardObjects.push(container);
    }

    this.cardModal = this.add.container(0, 0, [
      overlay,
      title,
      subtitle,
      ...cardObjects,
    ]);
  }

  private pickCard(card: CardDef): void {
    if (this.phase !== "cardPick") return;

    switch (card.effect.kind) {
      case "addTower":
        this.towerTokens.push(card.effect.towerType);
        break;
      case "upgrade":
        this.upgradeTokens++;
        break;
      case "damageBoost":
        this.damageMul *= card.effect.mul;
        break;
      case "repair":
        this.baseHp = Math.min(BASE.maxHp, this.baseHp + card.effect.amount);
        break;
    }

    this.cardModal?.destroy();
    this.cardModal = null;
    this.phase = "build";
    this.refreshHand();
    this.updateHud();
    this.updateStartButton();
  }

  // === Hand UI ===

  private refreshHand(): void {
    this.handContainer.removeAll(true);

    const yPos = SCREEN.height - 130;
    let xPos = 50;
    const tokenSize = 26;
    const tokenGap = 18;

    for (let i = 0; i < this.towerTokens.length; i++) {
      const type = this.towerTokens[i];
      if (!type) continue;
      const stats = TOWERS[type];
      const isSelected =
        this.selection?.kind === "tower" &&
        this.selection.towerType === type &&
        this.towerTokens.indexOf(type) === i;

      const token = this.add.circle(xPos, yPos, tokenSize, stats.color);
      token.setStrokeStyle(
        isSelected ? 4 : 2,
        0xffffff,
        isSelected ? 1 : 0.5,
      );
      token.setInteractive({ useHandCursor: true });
      token.on("pointerdown", () => this.selectTowerToken(type));

      const lbl = this.add
        .text(xPos, yPos, stats.label, {
          fontFamily: "sans-serif",
          fontSize: "18px",
          fontStyle: "bold",
          color: "#ffffff",
        })
        .setOrigin(0.5);

      this.handContainer.add(token);
      this.handContainer.add(lbl);
      xPos += tokenSize * 2 + tokenGap;
    }

    if (this.upgradeTokens > 0) {
      const isSelected = this.selection?.kind === "upgrade";
      const token = this.add.circle(xPos, yPos, tokenSize, 0xa855f7);
      token.setStrokeStyle(
        isSelected ? 4 : 2,
        0xffffff,
        isSelected ? 1 : 0.5,
      );
      token.setInteractive({ useHandCursor: true });
      token.on("pointerdown", () => this.selectUpgradeToken());
      const lbl = this.add
        .text(xPos, yPos, `U×${this.upgradeTokens}`, {
          fontFamily: "sans-serif",
          fontSize: "13px",
          fontStyle: "bold",
          color: "#ffffff",
        })
        .setOrigin(0.5);
      this.handContainer.add(token);
      this.handContainer.add(lbl);
      xPos += tokenSize * 2 + tokenGap;
    }

    if (this.towerTokens.length === 0 && this.upgradeTokens === 0) {
      const empty = this.add
        .text(50, yPos, "no cards in hand", {
          fontFamily: "sans-serif",
          fontSize: "14px",
          color: "#6b7280",
        })
        .setOrigin(0, 0.5);
      this.handContainer.add(empty);
    }

    if (this.selection) {
      const hintText =
        this.selection.kind === "tower"
          ? "tap a slot to place"
          : "tap a tower to upgrade";
      const hint = this.add
        .text(SCREEN.width - 30, yPos, hintText, {
          fontFamily: "sans-serif",
          fontSize: "13px",
          color: "#fde047",
        })
        .setOrigin(1, 0.5);
      this.handContainer.add(hint);
    }
  }

  private selectTowerToken(type: TowerType): void {
    if (
      this.selection?.kind === "tower" &&
      this.selection.towerType === type
    ) {
      this.selection = null;
    } else {
      this.selection = { kind: "tower", towerType: type };
    }
    this.refreshHand();
  }

  private selectUpgradeToken(): void {
    if (this.selection?.kind === "upgrade") {
      this.selection = null;
    } else {
      this.selection = { kind: "upgrade" };
    }
    this.refreshHand();
  }

  // === Slot / tower interactions ===

  private onCellTap(pos: GridPosition): void {
    if (this.phase !== "build") return;
    const cell = this.grid.getCell(pos.col, pos.row);
    if (!cell) return;

    if (this.selection?.kind === "tower") {
      if (cell.type !== "empty") return;
      const type = this.selection.towerType;
      const idx = this.towerTokens.indexOf(type);
      if (idx === -1) return;

      const w = this.grid.cellToWorld(pos.col, pos.row);
      const tower = new Tower(this, w.x, w.y, type);
      this.towers.push(tower);
      this.cellTowers.set(`${pos.col},${pos.row}`, tower);
      this.grid.setCellType(pos.col, pos.row, "tower");

      this.towerTokens.splice(idx, 1);
      this.selection = null;
      this.refreshHand();
      this.redrawGrid();
      this.updateStartButton();
      return;
    }

    if (cell.type === "empty") {
      this.grid.setCellType(pos.col, pos.row, "road");
      this.redrawGrid();
      this.updateStartButton();
    } else if (cell.type === "road") {
      this.grid.setCellType(pos.col, pos.row, "empty");
      this.redrawGrid();
      this.updateStartButton();
    }
  }

  private onTowerTap(tower: Tower): void {
    if (this.phase === "ended" || this.phase === "cardPick") return;
    if (!this.selection || this.selection.kind !== "upgrade") return;
    if (this.upgradeTokens <= 0) return;

    tower.upgrade();
    this.upgradeTokens--;
    this.selection = null;
    this.refreshHand();
  }
}
