import Phaser from "phaser";
import { SCREEN } from "../data/balance";
import { loadSave } from "../data/storage";
import { createButton } from "../ui/Button";

const ICON_KEYS = [
  "sniper",
  "cannon",
  "frost",
  "tesla",
  "laser",
  "frostgun",
  "fireworks",
  "inferno",
  "tornado",
  "mechanest",
] as const;

export class TitleScene extends Phaser.Scene {
  constructor() {
    super("TitleScene");
  }

  preload(): void {
    for (const key of ICON_KEYS) {
      this.load.image(`icon-${key}`, `assets/icons/${key}.svg`);
    }
  }

  create(): void {
    const { width, height } = SCREEN;

    this.add
      .text(width / 2, height * 0.22, "DEPENCE", {
        fontFamily: "sans-serif",
        fontSize: "84px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.30, "Tower defense + card pick", {
        fontFamily: "sans-serif",
        fontSize: "20px",
        color: "#9ca3af",
      })
      .setOrigin(0.5);

    const save = loadSave();
    const statsY = height * 0.42;
    this.add
      .text(width / 2, statsY, "STATS", {
        fontFamily: "sans-serif",
        fontSize: "13px",
        fontStyle: "bold",
        color: "#6b7280",
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, statsY + 30, `Best wave: ${save.bestWave} / 6`, {
        fontFamily: "sans-serif",
        fontSize: "20px",
        color: "#e5e7eb",
      })
      .setOrigin(0.5);
    this.add
      .text(
        width / 2,
        statsY + 60,
        `Wins: ${save.victories} / ${save.attempts}`,
        {
          fontFamily: "sans-serif",
          fontSize: "20px",
          color: "#e5e7eb",
        },
      )
      .setOrigin(0.5);

    createButton(this, width / 2, height * 0.62, {
      label: "PLAY",
      width: 280,
      height: 80,
      fillColor: 0x4ade80,
      fontSize: 28,
      onClick: () => this.scene.start("GameScene"),
    });

    this.add
      .text(
        width / 2,
        height * 0.85,
        "Tap a token, then tap a slot to place a tower.\nClear all 6 waves to win.",
        {
          fontFamily: "sans-serif",
          fontSize: "14px",
          color: "#6b7280",
          align: "center",
        },
      )
      .setOrigin(0.5);
  }
}
