import Phaser from "phaser";
import { SCREEN, WAVES } from "../data/balance";
import { recordResult } from "../data/storage";
import { createButton } from "../ui/Button";

export interface ResultData {
  won: boolean;
  waveReached: number;
  duration: number;
}

export class ResultScene extends Phaser.Scene {
  private result!: ResultData;

  constructor() {
    super("ResultScene");
  }

  init(data: ResultData): void {
    this.result = data;
  }

  create(): void {
    const { width, height } = SCREEN;
    const { won, waveReached, duration } = this.result;

    const { isNewBest } = recordResult(waveReached, won);

    this.add
      .text(width / 2, height * 0.22, won ? "VICTORY" : "DEFEAT", {
        fontFamily: "sans-serif",
        fontSize: "72px",
        fontStyle: "bold",
        color: won ? "#4ade80" : "#ef4444",
      })
      .setOrigin(0.5);

    if (isNewBest && waveReached > 0) {
      this.add
        .text(width / 2, height * 0.30, "★ NEW BEST ★", {
          fontFamily: "sans-serif",
          fontSize: "24px",
          fontStyle: "bold",
          color: "#fde047",
        })
        .setOrigin(0.5);
    }

    const statsY = height * 0.42;
    this.add
      .text(width / 2, statsY, "Waves cleared", {
        fontFamily: "sans-serif",
        fontSize: "16px",
        color: "#9ca3af",
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, statsY + 30, `${waveReached} / ${WAVES.length}`, {
        fontFamily: "sans-serif",
        fontSize: "44px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    this.add
      .text(
        width / 2,
        statsY + 100,
        `Match time: ${mins}:${secs.toString().padStart(2, "0")}`,
        {
          fontFamily: "sans-serif",
          fontSize: "18px",
          color: "#9ca3af",
        },
      )
      .setOrigin(0.5);

    createButton(this, width / 2 - 130, height * 0.72, {
      label: "RETRY",
      width: 220,
      height: 64,
      fillColor: 0x4ade80,
      onClick: () => this.scene.start("GameScene"),
    });
    createButton(this, width / 2 + 130, height * 0.72, {
      label: "TITLE",
      width: 220,
      height: 64,
      fillColor: 0x475569,
      textColor: "#ffffff",
      onClick: () => this.scene.start("TitleScene"),
    });
  }
}
