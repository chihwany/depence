import Phaser from "phaser";
import {
  BASE,
  SCREEN,
  SHAPES,
  TOWERS,
  WAVES,
  type CardDef,
  type ShapeId,
  type TowerType,
} from "../data/balance";
import {
  GRID_CONFIG,
  INITIAL_PATH_CELLS,
  buildCurvePathFromCells,
} from "../systems/Path";
import { Grid, type GridPosition } from "../systems/Grid";
import {
  DIRECTIONS,
  computeBackDirection,
  isValidPlacement,
  shapeCellsAt,
  type Direction,
  type Placement,
} from "../systems/Shape";
import { WaveRunner } from "../systems/WaveRunner";
import { drawCards, drawStarterCards } from "../systems/CardPool";
import { Enemy } from "../entities/Enemy";
import { Tower } from "../entities/Tower";
import { Projectile } from "../entities/Projectile";
import { createButton } from "../ui/Button";
import { drawIcon, towerIconKind, shapeIconKind, cardIconKind } from "../ui/Icons";
import type { ResultData } from "./ResultScene";

type Phase = "build" | "wave" | "cardPick" | "ended";
type Selection =
  | { kind: "tower"; towerType: TowerType }
  | { kind: "upgrade" }
  | { kind: "shape"; shapeId: ShapeId }
  | null;

export class GameScene extends Phaser.Scene {
  private grid!: Grid;
  private worldLayer!: Phaser.GameObjects.Container;
  private uiLayer!: Phaser.GameObjects.Container;
  private uiCamera!: Phaser.Cameras.Scene2D.Camera;
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private path: Phaser.Curves.Path | null = null;
  private pathCells: GridPosition[] = [];
  private spawnText!: Phaser.GameObjects.Text;
  private enemies: Enemy[] = [];
  private towers: Tower[] = [];
  private projectiles: Projectile[] = [];
  private cellTowers = new Map<string, Tower>();

  // World camera (5×5-ish view + drag-to-pan).
  // 720 / (5 * 70) ≈ 2.057 → ~5 cells visible horizontally; ~9 vertically
  // because the screen is portrait (1280 / (2.057 * 70) ≈ 8.9).
  // Using cameras.main.setZoom (instead of container.setScale) is the
  // canonical Phaser approach and avoids a Phaser 4 quirk where Image
  // scale was not respected inside a scaled container.
  private readonly worldZoom = 720 / (5 * GRID_CONFIG.cellSize);
  private dragState: {
    startX: number;
    startY: number;
    startScrollX: number;
    startScrollY: number;
    isDragging: boolean;
  } | null = null;
  private readonly dragThreshold = 8;
  // Set when pointerdown lands on an interactive UI element (card,
  // button, hand token). Used to suppress drag init + tap fallthrough
  // so picking a card doesn't also place a tower at the card's location.
  private pointerOnUI = false;

  // Shape placement preview — drag-to-position UX. The placement starts
  // at the first valid rotation when a shape token is tapped. The player
  // can rotate it by dragging (drag direction from spawn picks N/E/S/W)
  // and finalize via the confirm button. Cells render green when valid,
  // red when not (e.g., no rotation fits the current grid state).
  private shapePlacement: {
    cells: GridPosition[];
    dir: Direction;
    isValid: boolean;
  } | null = null;
  private shapeDragActive = false;
  private tokenLongPress: { shapeId: ShapeId; timer: number } | null = null;
  private tokenLongPressFired = false;
  private confirmButton: Phaser.GameObjects.Container | null = null;
  private cancelButton: Phaser.GameObjects.Container | null = null;

  private phase: Phase = "build";
  private waveIndex = 0;
  private baseHp: number = BASE.maxHp;
  private damageMul = 1;
  private waveRunner: WaveRunner | null = null;

  private towerTokens: TowerType[] = [];
  private upgradeTokens = 0;
  private shapeTokens: Record<ShapeId, number> = { I1: 0, I2: 0, I3: 0, L3: 0, L4: 0, L5: 0, U4: 0, U5: 0, U7: 0 };
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
  private baseLastFireTime = 0;

  constructor() {
    super("GameScene");
  }

  create(): void {
    this.resetState();
    this.matchStartTime = this.time.now;
    this.grid = new Grid(GRID_CONFIG);
    this.applyPathCellsToGrid();

    // Two-camera setup:
    //   worldLayer (rendered by main camera, zoomed) — grid, towers, enemies
    //   uiLayer    (rendered by uiCamera, unscaled) — HUD, modals, hand
    this.worldLayer = this.add.container(0, 0);
    this.uiLayer = this.add.container(0, 0);

    this.gridGraphics = this.add.graphics();
    this.worldLayer.add(this.gridGraphics);
    this.drawSpawnAndBase();
    this.redrawGrid();

    // Main camera: zoom + bounds. Initial center on lower-middle so the
    // base + initial path are visible.
    this.cameras.main.setZoom(this.worldZoom);
    this.cameras.main.setBounds(0, 0, SCREEN.width, SCREEN.height);
    const initial = this.grid.cellToWorld(3, 9);
    this.cameras.main.centerOn(initial.x, initial.y);

    // UI camera: unscaled, full-screen overlay.
    this.uiCamera = this.cameras.add(0, 0, SCREEN.width, SCREEN.height);
    this.uiCamera.setName("UI");

    this.drawHud();
    this.drawSpeedButton();
    this.drawPauseButton();
    this.handContainer = this.add.container(0, 0);
    this.uiLayer.add(this.handContainer);
    this.drawStartButton();
    this.refreshHand();
    this.updateStartButton();

    // Camera ignore lists: each camera only renders its own layer.
    this.cameras.main.ignore(this.uiLayer);
    this.uiCamera.ignore(this.worldLayer);

    this.setupDragAndTapInput();

    // Open the starting card pick before wave 1
    this.phase = "cardPick";
    this.updateHud();
    this.updateStartButton();
    this.showCardPick();
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
        this.enemies.push(new Enemy(this, this.path, stats, this.worldLayer));
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

    // Base built-in defense: only during wave (no need to fire when no enemies)
    if (this.phase === "wave") {
      this.updateBaseDefense(t);
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
    this.pathCells = INITIAL_PATH_CELLS.map((c) => ({ col: c.col, row: c.row }));
    this.phase = "build";
    this.waveIndex = 0;
    this.baseHp = BASE.maxHp;
    this.damageMul = 1;
    this.waveRunner = null;
    this.towerTokens = [];
    this.upgradeTokens = 0;
    this.shapeTokens = { I1: 0, I2: 0, I3: 0, L3: 0, L4: 0, L5: 0, U4: 0, U5: 0, U7: 0 };
    this.selection = null;
    this.shapePlacement = null;
    this.shapeDragActive = false;
    this.tokenLongPress = null;
    this.tokenLongPressFired = false;
    this.confirmButton = null;
    this.cancelButton = null;
    this.baseLastFireTime = 0;
    this.cardModal = null;
    this.pauseModal = null;
    this.isPaused = false;
    this.gameTime = 0;
    this.speedMul = 1;
    this.tweens.timeScale = 1;
  }

  private applyPathCellsToGrid(): void {
    // Clear all cells first (in case of restart)
    for (let row = 0; row < this.grid.config.rows; row++) {
      for (let col = 0; col < this.grid.config.cols; col++) {
        this.grid.setCellType(col, row, "empty");
      }
    }
    // Mark path cells: first = spawn, last = base, middle = road
    const last = this.pathCells.length - 1;
    for (let i = 0; i < this.pathCells.length; i++) {
      const c = this.pathCells[i];
      if (!c) continue;
      const type =
        i === 0 ? "spawn" : i === last ? "base" : "road";
      this.grid.setCellType(c.col, c.row, type);
    }
  }

  private currentSpawn(): GridPosition {
    return this.pathCells[0] ?? { col: 0, row: 0 };
  }

  private currentBase(): GridPosition {
    return this.pathCells[this.pathCells.length - 1] ?? { col: 0, row: 0 };
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
            this.gridGraphics.fillStyle(0xef4444, 0.55);
            this.gridGraphics.fillRect(x, y, inner, inner);
            break;
          case "base":
            this.gridGraphics.fillStyle(0x16a34a, 0.55);
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

    // Shape placement preview — green when the cells form a valid
    // placement, red when not. Driven by `shapePlacement` (drag-to-rotate
    // UX); no longer the auto-back-only behavior.
    if (this.phase === "build" && this.shapePlacement) {
      const placement = this.shapePlacement;
      const color = placement.isValid ? 0x4ade80 : 0xef4444;
      for (let i = 0; i < placement.cells.length; i++) {
        const c = placement.cells[i];
        if (!c) continue;
        const w = this.grid.cellToWorld(c.col, c.row);
        const x = w.x - size / 2 + 1;
        const y = w.y - size / 2 + 1;
        this.gridGraphics.fillStyle(color, 0.32);
        this.gridGraphics.fillRect(x, y, inner, inner);
        const alpha = i === 0 ? 0.95 : 0.6;
        this.gridGraphics.lineStyle(3, color, alpha);
        this.gridGraphics.strokeRect(x, y, inner, inner);
      }
    }
  }

  private drawSpawnAndBase(): void {
    const s = this.grid.cellToWorld(this.currentSpawn().col, this.currentSpawn().row);
    this.spawnText = this.add
      .text(s.x, s.y, "SPAWN", {
        fontFamily: "sans-serif",
        fontSize: "12px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);
    const b = this.grid.cellToWorld(this.currentBase().col, this.currentBase().row);

    // Visualize the base's auto-defense range
    const baseRange = this.add.circle(b.x, b.y, BASE.range, BASE.color, 0.05);
    baseRange.setStrokeStyle(1, BASE.color, 0.3);

    const baseText = this.add
      .text(b.x, b.y, "BASE", {
        fontFamily: "sans-serif",
        fontSize: "12px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.worldLayer.add([this.spawnText, baseRange, baseText]);
  }

  // === Camera (main camera zoom + drag-to-pan) ===

  private setupDragAndTapInput(): void {
    // gameobjectdown fires for any interactive game object hit by the
    // pointer (cards in modal, buttons, hand tokens — all in uiLayer).
    // Setting the flag here lets pointerdown/pointerup downstream skip
    // both drag init and the tap-to-place fallthrough.
    this.input.on("gameobjectdown", () => {
      this.pointerOnUI = true;
    });

    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (this.pointerOnUI) return;
      if (this.phase === "cardPick" || this.isPaused) return;

      // If pointerdown lands on a current shape preview cell, start a
      // shape drag (rotate by drag direction) instead of a camera pan.
      if (this.shapePlacement) {
        const wp = this.cameras.main.getWorldPoint(p.x, p.y);
        const cell = this.grid.worldToCell(wp.x, wp.y);
        if (
          cell &&
          this.shapePlacement.cells.some(
            (c) => c.col === cell.col && c.row === cell.row,
          )
        ) {
          this.shapeDragActive = true;
          this.updateShapeDragPosition(wp.x, wp.y);
          return;
        }
      }

      this.dragState = {
        startX: p.x,
        startY: p.y,
        startScrollX: this.cameras.main.scrollX,
        startScrollY: this.cameras.main.scrollY,
        isDragging: false,
      };
    });

    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      // Cancel a pending long-press timer if the user starts moving the
      // finger before it fires — but immediately enter drag mode so the
      // press-and-drag-from-token gesture feels responsive.
      if (this.tokenLongPress && !this.tokenLongPressFired) {
        this.fireTokenLongPress();
      }

      if (this.shapeDragActive && p.isDown) {
        const wp = this.cameras.main.getWorldPoint(p.x, p.y);
        this.updateShapeDragPosition(wp.x, wp.y);
        return;
      }

      if (!this.dragState || !p.isDown) return;
      const dx = p.x - this.dragState.startX;
      const dy = p.y - this.dragState.startY;
      if (
        !this.dragState.isDragging &&
        Math.hypot(dx, dy) > this.dragThreshold
      ) {
        this.dragState.isDragging = true;
      }
      if (this.dragState.isDragging) {
        const z = this.cameras.main.zoom;
        this.cameras.main.scrollX = this.dragState.startScrollX - dx / z;
        this.cameras.main.scrollY = this.dragState.startScrollY - dy / z;
      }
    });

    this.input.on("pointerup", (p: Phaser.Input.Pointer) => {
      // Resolve a hand-token press: if the long-press never fired, treat
      // it as a quick tap (toggle selection); if it fired, the drag was
      // active and we just stop it here.
      const longPress = this.tokenLongPress;
      const longPressFired = this.tokenLongPressFired;
      if (longPress) {
        clearTimeout(longPress.timer);
        this.tokenLongPress = null;
        this.tokenLongPressFired = false;
        if (!longPressFired) {
          this.selectShapeToken(longPress.shapeId);
          this.dragState = null;
          return;
        }
      }

      if (this.shapeDragActive) {
        this.shapeDragActive = false;
        this.dragState = null;
        return;
      }

      const wasOnUI = this.pointerOnUI;
      this.pointerOnUI = false;
      if (wasOnUI) {
        this.dragState = null;
        return;
      }
      if (this.dragState && !this.dragState.isDragging) {
        const wp = this.cameras.main.getWorldPoint(p.x, p.y);
        this.handleTap(wp.x, wp.y);
      }
      this.dragState = null;
    });
  }

  private handleTap(worldX: number, worldY: number): void {
    if (this.phase === "cardPick" || this.isPaused) return;
    // Tower tap (manual hit-test in world space). 1.4× radius gives a
    // forgiving touch target on phones.
    for (const tower of this.towers) {
      const r = tower.baseStats.radius * 1.4;
      if (Math.hypot(worldX - tower.x, worldY - tower.y) <= r) {
        this.onTowerTap(tower);
        return;
      }
    }
    const cell = this.grid.worldToCell(worldX, worldY);
    if (cell) this.onCellTap(cell);
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
    this.uiLayer.add([this.hpText, this.waveText, this.statusText]);
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
    this.uiLayer.add(this.startButton);
  }

  private updateStartButton(): void {
    if (!this.startButton.scene) return;
    if (this.phase === "build" && this.waveIndex < WAVES.length) {
      const lbl = this.startButton.list[1] as Phaser.GameObjects.Text;
      const bg = this.startButton.list[0] as Phaser.GameObjects.Rectangle;
      lbl.setText(`START WAVE ${this.waveIndex + 1}`);
      bg.setFillStyle(0x4ade80);
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
    const newPath = buildCurvePathFromCells(this.grid, this.pathCells);
    if (!newPath) return;
    this.path = newPath;
    this.shapePlacement = null;
    this.shapeDragActive = false;
    this.refreshShapeButtons();
    this.redrawGrid();
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
    const btn = createButton(this, SCREEN.width - 60, 40, {
      label: "PAUSE",
      width: 100,
      height: 44,
      fillColor: 0x475569,
      textColor: "#ffffff",
      fontSize: 14,
      onClick: () => this.togglePause(),
    });
    this.uiLayer.add(btn);
  }

  private togglePause(): void {
    if (this.phase === "ended" || this.phase === "cardPick") return;
    // Suppress drag/tap fallthrough for the pointer event that triggered
    // this toggle (same fix as pickCard — see comment there).
    this.pointerOnUI = true;
    this.dragState = null;
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
    this.uiLayer.add(this.pauseModal);
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
        this.worldLayer.add(splash);
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
      new Projectile(this, tower.x, tower.y, target, onHit, stats.color, this.worldLayer),
    );
  }

  // === Base auto-defense ===

  private updateBaseDefense(time: number): void {
    if (time - this.baseLastFireTime < BASE.fireRate) return;
    const base = this.currentBase();
    const baseWorld = this.grid.cellToWorld(base.col, base.row);

    // Furthest-along-path enemy in range
    let target: Enemy | null = null;
    let bestProgress = -1;
    for (const e of this.enemies) {
      if (e.isDead || e.reachedEnd) continue;
      const dx = e.shape.x - baseWorld.x;
      const dy = e.shape.y - baseWorld.y;
      if (Math.sqrt(dx * dx + dy * dy) > BASE.range) continue;
      if (e.pathProgress > bestProgress) {
        target = e;
        bestProgress = e.pathProgress;
      }
    }
    if (!target) return;

    const onHit = (hitTarget: Enemy, hx: number, hy: number) => {
      hitTarget.takeDamage(BASE.damage);
      this.spawnDamagePopup(hx, hy, BASE.damage);
    };
    this.projectiles.push(
      new Projectile(this, baseWorld.x, baseWorld.y, target, onHit, BASE.color, this.worldLayer),
    );
    this.baseLastFireTime = time;
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
    this.worldLayer.add(text);
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
    this.worldLayer.add(ring);
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
    const shape = tower.shape as Phaser.GameObjects.GameObject & {
      scaleX: number;
    };
    const base = shape.scaleX;
    this.tweens.add({
      targets: tower.shape,
      scaleX: { from: base * 1.2, to: base },
      scaleY: { from: base * 1.2, to: base },
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
    this.uiLayer.add(text);

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
    this.uiLayer.add(this.speedButton);
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
    const isStarter = this.waveIndex === 0;
    const cards = isStarter ? drawStarterCards(3) : drawCards(3);

    const overlay = this.add.rectangle(
      SCREEN.width / 2,
      SCREEN.height / 2,
      SCREEN.width,
      SCREEN.height,
      0x000000,
      0.75,
    );
    overlay.setInteractive();

    const titleText = isStarter
      ? "Choose your starting card"
      : `Wave ${this.waveIndex} cleared`;
    const title = this.add
      .text(SCREEN.width / 2, 230, titleText, {
        fontFamily: "sans-serif",
        fontSize: "30px",
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
    const cardH = 320;
    const gap = 18;
    const totalW = cardW * 3 + gap * 2;
    const startX = (SCREEN.width - totalW) / 2 + cardW / 2;
    const cardY = SCREEN.height / 2;

    // Layout per card (cardH=320, half=160):
    //   colorBlock fills the top half (image area), full card width
    //   label sits just below the image
    //   description fills the remaining bottom space, wrapped
    const imageH = 200; // image area height
    const colorBlockY = -cardH / 2 + imageH / 2 + 4; // = -56
    const iconSize = 180;
    const labelY = colorBlockY + imageH / 2 + 22; // = 70
    const descY = labelY + 38; // = 108

    const cardObjects: Phaser.GameObjects.Container[] = [];
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      if (!card) continue;
      const cx = startX + i * (cardW + gap);
      const bg = this.add.rectangle(0, 0, cardW, cardH, 0x1f2937);
      bg.setStrokeStyle(4, card.color);
      const colorBlock = this.add.rectangle(
        0,
        colorBlockY,
        cardW - 12,
        imageH,
        card.color,
      );

      const iconKind = cardIconKind(card);
      const icon = iconKind
        ? drawIcon(this, iconKind, 0, colorBlockY, iconSize, 0xffffff)
        : null;

      const labelTxt = this.add
        .text(0, labelY, card.label, {
          fontFamily: "sans-serif",
          fontSize: "24px",
          fontStyle: "bold",
          color: "#ffffff",
        })
        .setOrigin(0.5);
      const descTxt = this.add
        .text(0, descY, card.description, {
          fontFamily: "sans-serif",
          fontSize: "15px",
          color: "#d1d5db",
          align: "center",
          wordWrap: { width: cardW - 24 },
        })
        .setOrigin(0.5);

      const children: Phaser.GameObjects.GameObject[] = [bg, colorBlock];
      if (icon) children.push(icon);
      children.push(labelTxt, descTxt);

      const container = this.add.container(cx, cardY, children);
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
    this.uiLayer.add(this.cardModal);
  }

  private pickCard(card: CardDef): void {
    if (this.phase !== "cardPick") return;

    // Suppress the rest of this pointer's event chain. pickCard runs in
    // the card's pointerdown listener and destroys the card; relying on
    // gameobjectdown to set this flag is fragile (the event may not fire
    // for a destroyed object), so set it explicitly. Without this, the
    // global pointerdown that follows sees phase="build" and inits a
    // dragState, then pointerup runs handleTap and auto-places the
    // tower at the card's screen position.
    this.pointerOnUI = true;
    this.dragState = null;

    // Auto-select the picked card so the player can place it directly on
    // the next tap — skips the "click hand token first" extra step.
    switch (card.effect.kind) {
      case "addTower":
        this.towerTokens.push(card.effect.towerType);
        this.selection = { kind: "tower", towerType: card.effect.towerType };
        break;
      case "upgrade":
        this.upgradeTokens++;
        this.selection = { kind: "upgrade" };
        break;
      case "addShape":
        this.shapeTokens[card.effect.shapeId] += card.effect.amount;
        this.selection = { kind: "shape", shapeId: card.effect.shapeId };
        // Show the placement preview + confirm/cancel buttons immediately
        // so the player doesn't have to retap the hand token.
        this.shapePlacement = this.computeInitialPlacement(card.effect.shapeId);
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
    this.redrawGrid();
    this.refreshShapeButtons();
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

      const icon = drawIcon(this, towerIconKind(type), xPos, yPos, tokenSize * 1.1, 0xffffff);

      this.handContainer.add(token);
      this.handContainer.add(icon);
      xPos += tokenSize * 2 + tokenGap;
    }

    const shapeOrder: ShapeId[] = ["I1", "I2", "I3", "L3", "L4", "L5", "U4", "U5", "U7"];
    for (const shapeId of shapeOrder) {
      const count = this.shapeTokens[shapeId];
      if (count <= 0) continue;
      const shape = SHAPES[shapeId];
      const isSelected =
        this.selection?.kind === "shape" && this.selection.shapeId === shapeId;

      const token = this.add.circle(xPos, yPos, tokenSize, shape.color);
      token.setStrokeStyle(
        isSelected ? 4 : 2,
        0xffffff,
        isSelected ? 1 : 0.5,
      );
      token.setInteractive({ useHandCursor: true });
      // Quick tap = select + show preview at first valid rotation.
      // Long-press (250ms hold or any movement before release) = enter
      // drag mode immediately so the player can drag the preview around.
      // The actual "tap vs long-press" disambiguation happens in the
      // global pointerup handler.
      token.on("pointerdown", () => this.startTokenLongPress(shapeId));

      const icon = drawIcon(this, shapeIconKind(shapeId), xPos, yPos - 4, tokenSize * 0.95, 0xffffff);
      const countLbl = this.add
        .text(xPos, yPos + tokenSize * 0.5, `×${count}`, {
          fontFamily: "sans-serif",
          fontSize: "12px",
          fontStyle: "bold",
          color: "#ffffff",
        })
        .setOrigin(0.5);

      this.handContainer.add(token);
      this.handContainer.add(icon);
      this.handContainer.add(countLbl);
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
      const icon = drawIcon(this, "upgrade", xPos, yPos - 4, tokenSize * 0.95, 0xffffff);
      const countLbl = this.add
        .text(xPos, yPos + tokenSize * 0.5, `×${this.upgradeTokens}`, {
          fontFamily: "sans-serif",
          fontSize: "12px",
          fontStyle: "bold",
          color: "#ffffff",
        })
        .setOrigin(0.5);
      this.handContainer.add(token);
      this.handContainer.add(icon);
      this.handContainer.add(countLbl);
      xPos += tokenSize * 2 + tokenGap;
    }

    const totalShapeTokens =
      this.shapeTokens.I1 +
      this.shapeTokens.I2 +
      this.shapeTokens.I3 +
      this.shapeTokens.L3 +
      this.shapeTokens.L4 +
      this.shapeTokens.L5 +
      this.shapeTokens.U4 +
      this.shapeTokens.U5 +
      this.shapeTokens.U7;
    if (
      this.towerTokens.length === 0 &&
      this.upgradeTokens === 0 &&
      totalShapeTokens === 0
    ) {
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
          ? "tap an empty cell to place"
          : this.selection.kind === "shape"
            ? "tap a yellow cell to extend"
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

  private selectShapeToken(shapeId: ShapeId): void {
    if (
      this.selection?.kind === "shape" &&
      this.selection.shapeId === shapeId
    ) {
      // Re-tap same token = cancel placement entirely.
      this.cancelShapePlacement();
      return;
    }
    this.selection = { kind: "shape", shapeId };
    this.shapePlacement = this.computeInitialPlacement(shapeId);
    this.refreshHand();
    this.redrawGrid();
    this.refreshShapeButtons();
  }

  // === Shape drag-to-place placement ===

  private computeInitialPlacement(shapeId: ShapeId): {
    cells: GridPosition[];
    dir: Direction;
    isValid: boolean;
  } {
    const shape = SHAPES[shapeId];
    const spawn = this.currentSpawn();
    const backDir = computeBackDirection(this.pathCells);
    // Prefer back direction (the original auto-rotated default) so the
    // common case behaves identically to before — but if it's blocked,
    // fall back to whichever rotation fits.
    const backCells = shapeCellsAt(spawn, shape, backDir);
    if (isValidPlacement(this.grid, backCells)) {
      return { cells: backCells, dir: backDir, isValid: true };
    }
    for (const dir of DIRECTIONS) {
      if (dir === backDir) continue;
      const cells = shapeCellsAt(spawn, shape, dir);
      if (isValidPlacement(this.grid, cells)) {
        return { cells, dir, isValid: true };
      }
    }
    // No rotation fits — show the back-direction preview in red so the
    // player sees the shape and can cancel.
    return { cells: backCells, dir: backDir, isValid: false };
  }

  private updateShapeDragPosition(worldX: number, worldY: number): void {
    if (!this.selection || this.selection.kind !== "shape") return;
    const shape = SHAPES[this.selection.shapeId];
    const spawn = this.currentSpawn();
    const spawnWorld = this.grid.cellToWorld(spawn.col, spawn.row);
    const dx = worldX - spawnWorld.x;
    const dy = worldY - spawnWorld.y;
    // Snap drag direction to the nearest cardinal — only 4 rotations are
    // structurally valid (first cell of shape must be adjacent to spawn).
    let dir: Direction;
    if (Math.abs(dx) > Math.abs(dy)) {
      dir = dx > 0 ? 1 : 3; // east : west
    } else {
      dir = dy > 0 ? 2 : 0; // south : north
    }
    const cells = shapeCellsAt(spawn, shape, dir);
    const isValid = isValidPlacement(this.grid, cells);
    this.shapePlacement = { cells, dir, isValid };
    this.redrawGrid();
    this.refreshShapeButtons();
  }

  private confirmShapePlacement(): void {
    if (!this.selection || this.selection.kind !== "shape") return;
    if (!this.shapePlacement || !this.shapePlacement.isValid) return;
    const shapeId = this.selection.shapeId;
    this.placeShape(shapeId, {
      dir: this.shapePlacement.dir,
      cells: this.shapePlacement.cells,
    });
    // If the player still has tokens of the same shape, queue up the
    // next preview at the new spawn so they can chain placements
    // without retapping the hand token. Otherwise clear the preview.
    if (this.shapeTokens[shapeId] > 0) {
      this.shapePlacement = this.computeInitialPlacement(shapeId);
    } else {
      this.shapePlacement = null;
    }
    this.redrawGrid();
    this.refreshShapeButtons();
  }

  private cancelShapePlacement(): void {
    this.selection = null;
    this.shapePlacement = null;
    this.shapeDragActive = false;
    this.refreshHand();
    this.redrawGrid();
    this.refreshShapeButtons();
  }

  private startTokenLongPress(shapeId: ShapeId): void {
    if (this.tokenLongPress) {
      clearTimeout(this.tokenLongPress.timer);
    }
    this.tokenLongPressFired = false;
    this.tokenLongPress = {
      shapeId,
      timer: window.setTimeout(() => {
        // Long-press fired without movement → enter drag mode at the
        // current pointer position.
        this.fireTokenLongPress();
      }, 250),
    };
  }

  private fireTokenLongPress(): void {
    if (!this.tokenLongPress || this.tokenLongPressFired) return;
    const shapeId = this.tokenLongPress.shapeId;
    this.tokenLongPressFired = true;
    // Make sure the shape is selected and the preview exists.
    if (
      !this.selection ||
      this.selection.kind !== "shape" ||
      this.selection.shapeId !== shapeId
    ) {
      this.selection = { kind: "shape", shapeId };
      this.shapePlacement = this.computeInitialPlacement(shapeId);
      this.refreshHand();
      this.refreshShapeButtons();
    }
    this.shapeDragActive = true;
    // Update the placement based on the current pointer position so the
    // preview reacts to the held finger right away.
    const p = this.input.activePointer;
    const wp = this.cameras.main.getWorldPoint(p.x, p.y);
    this.updateShapeDragPosition(wp.x, wp.y);
  }

  private refreshShapeButtons(): void {
    if (this.confirmButton) {
      this.confirmButton.destroy();
      this.confirmButton = null;
    }
    if (this.cancelButton) {
      this.cancelButton.destroy();
      this.cancelButton = null;
    }
    if (!this.shapePlacement) return;

    const yPos = SCREEN.height - 200;
    const isValid = this.shapePlacement.isValid;
    this.confirmButton = createButton(this, SCREEN.width - 220, yPos, {
      label: isValid ? "확정" : "확정 (불가)",
      width: 130,
      height: 56,
      fillColor: isValid ? 0x4ade80 : 0x6b7280,
      textColor: isValid ? "#0f172a" : "#d1d5db",
      fontSize: 18,
      onClick: () => this.confirmShapePlacement(),
    });
    this.uiLayer.add(this.confirmButton);

    this.cancelButton = createButton(this, SCREEN.width - 70, yPos, {
      label: "취소",
      width: 100,
      height: 56,
      fillColor: 0xef4444,
      textColor: "#ffffff",
      fontSize: 18,
      onClick: () => this.cancelShapePlacement(),
    });
    this.uiLayer.add(this.cancelButton);
  }

  // === Slot / tower interactions ===

  private onCellTap(pos: GridPosition): void {
    if (this.phase !== "build") return;
    const cell = this.grid.getCell(pos.col, pos.row);
    if (!cell) return;

    // Tower placement: tower token selected + empty cell
    if (this.selection?.kind === "tower") {
      if (cell.type !== "empty") return;
      const type = this.selection.towerType;
      const idx = this.towerTokens.indexOf(type);
      if (idx === -1) return;

      const w = this.grid.cellToWorld(pos.col, pos.row);
      const tower = new Tower(this, w.x, w.y, type, this.worldLayer);
      this.towers.push(tower);
      this.cellTowers.set(`${pos.col},${pos.row}`, tower);
      this.grid.setCellType(pos.col, pos.row, "tower");

      this.towerTokens.splice(idx, 1);
      this.selection = null;
      this.refreshHand();
      this.redrawGrid();
      return;
    }

    // Shape placement is no longer tap-to-place — the player drags the
    // preview to reposition (or long-presses the hand token) and then
    // taps the 확정 button. Plain cell taps do nothing here.
    if (this.selection?.kind === "shape") return;
    // Spawn taps no longer remove cells — placements are permanent within
    // a match. (Removed accidental-contract behavior per user feedback.)
  }

  private placeShape(shapeId: ShapeId, placement: Placement): void {
    if (this.shapeTokens[shapeId] <= 0) return;

    const cells = placement.cells;
    const oldSpawn = this.currentSpawn();
    const newSpawnCell = cells[cells.length - 1];
    if (!newSpawnCell) return;
    const newWorld = this.grid.cellToWorld(newSpawnCell.col, newSpawnCell.row);

    // Old spawn becomes road
    this.grid.setCellType(oldSpawn.col, oldSpawn.row, "road");
    // Intermediate cells become road
    for (let i = 0; i < cells.length - 1; i++) {
      const c = cells[i];
      if (!c) continue;
      this.grid.setCellType(c.col, c.row, "road");
    }
    // Last cell of shape is the new spawn
    this.grid.setCellType(newSpawnCell.col, newSpawnCell.row, "spawn");

    // pathCells is in enemy-traversal order (spawn -> ... -> base).
    // The new spawn is the LAST cell of the shape (cells[end]), so the
    // shape cells must be prepended in REVERSE so cells[end] sits at
    // index 0, cells[end-1] next, ... and cells[0] just before the old
    // spawn cell.
    const newFront = cells
      .map((c) => ({ col: c.col, row: c.row }))
      .reverse();
    this.pathCells = [...newFront, ...this.pathCells];

    this.shapeTokens[shapeId]--;
    if (this.shapeTokens[shapeId] === 0) this.selection = null;

    this.animateSpawnMove(newWorld.x, newWorld.y);
    this.refreshHand();
    this.redrawGrid();
  }

  private animateSpawnMove(x: number, y: number): void {
    const size = this.grid.config.cellSize;
    const flash = this.add.rectangle(x, y, size - 2, size - 2, 0xffffff, 0.7);
    this.worldLayer.add(flash);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 320,
      onComplete: () => flash.destroy(),
    });
    this.tweens.add({
      targets: this.spawnText,
      x,
      y,
      duration: 220,
      ease: "Cubic.out",
    });
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
