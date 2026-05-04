import Phaser from "phaser";

export class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  create(): void {
    this.add
      .text(360, 200, "Hello Phaser", {
        fontFamily: "sans-serif",
        fontSize: "48px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.add
      .text(360, 280, "Depence — Tower Defense Prototype", {
        fontFamily: "sans-serif",
        fontSize: "20px",
        color: "#9ca3af",
      })
      .setOrigin(0.5);

    const box = this.add.rectangle(360, 640, 80, 80, 0x4ade80);
    this.tweens.add({
      targets: box,
      x: { from: 120, to: 600 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });

    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      this.add.circle(p.x, p.y, 12, 0xfacc15);
    });
  }
}
