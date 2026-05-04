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
  main.ts            entry point, Phaser game config
  scenes/            Phaser scenes
    GameScene.ts     the active gameplay scene
```

## Roadmap

- [x] Week 1 — environment setup + Hello Phaser
- [ ] Week 2 — core loop: 1 map, 1 tower, 1 enemy type, waves
- [ ] Week 3 — card pick system, multiple tower / enemy types
- [ ] Week 4 — meta systems: save, currency, progression
- [ ] Week 5 — balancing pass + UI polish
- [ ] Week 6 — Capacitor mobile build + on-device test
