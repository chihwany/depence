# Depence

Tower defense mobile game prototype built with Phaser 4 + TypeScript + Vite.
Path-extension card-pick roguelite — extend a route block by block, fend off
six waves, win or pivot.

## Stack

- **Game engine**: Phaser 4
- **Language**: TypeScript
- **Build tool**: Vite
- **Mobile packaging** (planned): Capacitor (iOS / Android)
- **Backend** (planned): Firebase

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start dev server with hot reload (Vite) |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build |
| `npm run sync-icons` | Copy tower-icon PNGs from `src/image/` → `public/assets/icons/` |

## Tower icon workflow

Towers can use either the procedural fallback (in `src/ui/Icons.ts`), an SVG
placeholder (`public/assets/icons/<name>.svg`), or a raster PNG
(`public/assets/icons/<name>.png`). `drawIcon` prefers a loaded Phaser texture
when one exists for `icon-<name>`, so swapping art is just a file drop.

To replace a tower's icon with a new PNG:

1. Save the PNG into `src/image/` using the **game's tower key** as the filename:

   `sniper.png`, `cannon.png`, `frost.png`, `tesla.png`, `laser.png`,
   `frostgun.png`, `fireworks.png`, `inferno.png`, `tornado.png`, `mechanest.png`

2. Run `npm run sync-icons`. The script copies any matching files into
   `public/assets/icons/`, skips ones that are already byte-identical, and
   reports anything missing.

3. Open `src/scenes/TitleScene.ts` and make sure the `ICON_FILES` map has
   `<name>: "<name>.png"` for that tower (it's already PNG for towers we
   currently have art for; flip from `.svg` to `.png` if you're adding new art).

4. Hard-refresh the browser (`Ctrl+Shift+R`) so Phaser drops the cached
   texture and reloads.

Recommended PNG specs: 256×256, transparent background, no embedded labels.
Compress with TinyPNG (or similar) before shipping — current PNGs are
1–2 MB each, target is < 200 KB per icon.

## Project layout

```
src/
  main.ts              entry, Phaser game config, scene registration
  data/
    balance.ts         tunable numbers (towers, enemies, waves, cards, base, shapes)
    storage.ts         localStorage save (best wave, wins, attempts)
  systems/
    Grid.ts            8×12 grid, cell types, world<->cell coords
    Path.ts            initial path cells, buildCurvePathFromCells, helpers
    Shape.ts           shape rotation + back-of-spawn placement
    WaveRunner.ts      multi-stream enemy spawning per wave
    CardPool.ts        random card draw (full pool + starter-filtered pool)
  entities/
    Enemy.ts           path-following enemy with HP bar and slow effect
    Tower.ts           tower with type, level, targeting, firing
    Projectile.ts      homing projectile with onHit callback
  scenes/
    TitleScene.ts      title screen + icon preload
    GameScene.ts       gameplay orchestrator (build / wave / cardPick / ended)
    ResultScene.ts     post-match result with retry / title
  ui/
    Button.ts          reusable button factory
    Icons.ts           drawIcon (texture-first, procedural fallback) + 16 icon kinds
  image/               source PNGs the player drops in (sync-icons copies these)

public/
  assets/icons/        raster + vector tower icons served by Vite
                         <name>.png  — user-provided art (preferred when present)
                         <name>.svg  — original procedural placeholder

scripts/
  sync-icons.mjs       npm run sync-icons (file copier with md5 short-circuit)

docs/
  01-system-analysis.md     genre layer breakdown
  02-mvp-scope.md           MVP scope, current progress
  03-gdd.md                 one-page GDD (current state, v0.3)
  04-post-mvp-roadmap.md    Phase 1~7 plan
  05-current-status-and-todo.md   live status + remaining work
```

## Roadmap

- [x] Week 1 — environment setup + Hello Phaser
- [x] Week 2 — core loop: path, towers, enemies, waves
- [x] Week 3 — card pick, 3 tower types, 3 enemy types + boss, 6 waves
- [x] Week 4 — title / result scenes, pause, localStorage best record
- [x] Week 5 — balancing pass + UI polish (animations, speed toggle, icons)
- [x] Week 5+ — terrain build (spawn extension), 10 towers, base auto-defense, art pipeline
- [ ] Week 6 — Capacitor mobile build + on-device test

See [docs/05-current-status-and-todo.md](docs/05-current-status-and-todo.md)
for the live status and the next-actions list.
