import Phaser from "phaser";
import { SCREEN } from "../data/balance";
import { loadSave } from "../data/storage";
import { createButton } from "../ui/Button";

// Filename per tower icon. PNG (raster art) where we have it, SVG
// (procedural-style placeholder) for the rest. drawIcon picks up the
// loaded texture by key, so swapping a tower over to PNG just means
// flipping the value here.
const ICON_FILES: Record<string, string> = {
  sniper:    "sniper.png",
  cannon:    "cannon.png",
  frost:     "frost.png",
  mechanest: "mechanest.png",
  laser:     "laser.png",
  inferno:   "inferno.png",
  tesla:     "tesla.svg",
  frostgun:  "frostgun.svg",
  fireworks: "fireworks.svg",
  tornado:   "tornado.svg",
};

export class TitleScene extends Phaser.Scene {
  constructor() {
    super("TitleScene");
  }

  preload(): void {
    for (const [key, file] of Object.entries(ICON_FILES)) {
      this.load.image(`icon-${key}`, `assets/icons/${file}`);
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
