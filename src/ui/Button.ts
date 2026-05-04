import Phaser from "phaser";

export interface ButtonOptions {
  label: string;
  width?: number;
  height?: number;
  fillColor?: number;
  textColor?: string;
  fontSize?: number;
  onClick: () => void;
}

export function createButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  opts: ButtonOptions,
): Phaser.GameObjects.Container {
  const width = opts.width ?? 220;
  const height = opts.height ?? 64;
  const fill = opts.fillColor ?? 0x4ade80;
  const textColor = opts.textColor ?? "#0f172a";
  const fontSize = opts.fontSize ?? 22;

  const bg = scene.add.rectangle(0, 0, width, height, fill);
  bg.setStrokeStyle(2, 0xffffff);

  const label = scene.add
    .text(0, 0, opts.label, {
      fontFamily: "sans-serif",
      fontSize: `${fontSize}px`,
      fontStyle: "bold",
      color: textColor,
    })
    .setOrigin(0.5);

  const container = scene.add.container(x, y, [bg, label]);
  container.setSize(width, height);
  container.setInteractive({ useHandCursor: true });
  container.on("pointerdown", opts.onClick);
  container.on("pointerover", () => bg.setFillStyle(brighten(fill)));
  container.on("pointerout", () => bg.setFillStyle(fill));
  return container;
}

function brighten(color: number): number {
  const r = Math.min(255, ((color >> 16) & 0xff) + 30);
  const g = Math.min(255, ((color >> 8) & 0xff) + 30);
  const b = Math.min(255, (color & 0xff) + 30);
  return (r << 16) | (g << 8) | b;
}
