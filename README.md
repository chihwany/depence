# Depence

Tower defense mobile game prototype built with Phaser 3 + TypeScript + Vite.

## Stack

- **Game engine**: Phaser 3
- **Language**: TypeScript
- **Build tool**: Vite
- **Mobile packaging** (later): Capacitor (iOS / Android)
- **Backend** (later): Firebase

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Scripts

- `npm run dev` — start dev server with hot reload
- `npm run build` — type-check and build for production
- `npm run preview` — preview the production build

## Project layout

```
src/
  main.ts              entry, Phaser game config, scene registration
  data/
    balance.ts         all tunable numbers (towers, enemies, waves, cards)
    storage.ts         localStorage save (best wave, wins, attempts)
  systems/
    Path.ts            path geometry + tower slot positions
    WaveRunner.ts      multi-stream enemy spawning per wave
    CardPool.ts        random card draw helper
  entities/
    Enemy.ts           path-following enemy with HP bar and slow effect
    Tower.ts           tower with type, level, targeting, firing
    Projectile.ts      homing projectile with onHit callback
  scenes/
    TitleScene.ts      title screen with stats and PLAY button
    GameScene.ts       gameplay orchestrator (build / wave / cardPick / ended)
    ResultScene.ts     post-match result with retry / title
  ui/
    Button.ts          reusable button factory
```

## Roadmap

- [x] Week 1 — environment setup + Hello Phaser
- [x] Week 2 — core loop: path, towers, enemies, waves
- [x] Week 3 — card pick, 3 tower types, 3 enemy types + boss, 6 waves
- [x] Week 4 — title / result scenes, pause, localStorage best record
- [ ] Week 5 — balancing pass + UI polish
- [ ] Week 6 — Capacitor mobile build + on-device test
