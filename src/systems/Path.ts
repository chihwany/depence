import Phaser from "phaser";
import type { Grid, GridConfig, GridPosition } from "./Grid";
import { findPath } from "./PathFinder";

export const GRID_CONFIG: GridConfig = {
  cols: 8,
  rows: 10,
  cellSize: 80,
  offsetX: 40,
  offsetY: 180,
};

export const SPAWN_CELL: GridPosition = { col: 3, row: 0 };
export const BASE_CELL: GridPosition = { col: 3, row: 9 };

// Pre-placed straight road from spawn to base so the player can play
// immediately. They can remove and reroute for strategic depth.
export const INITIAL_ROADS: GridPosition[] = [
  { col: 3, row: 1 },
  { col: 3, row: 2 },
  { col: 3, row: 3 },
  { col: 3, row: 4 },
  { col: 3, row: 5 },
  { col: 3, row: 6 },
  { col: 3, row: 7 },
  { col: 3, row: 8 },
];

export function buildCurvePath(grid: Grid): Phaser.Curves.Path | null {
  const cells = findPath(grid, grid.spawn, grid.base);
  if (!cells || cells.length < 2) return null;

  const first = cells[0];
  if (!first) return null;
  const startWorld = grid.cellToWorld(first.col, first.row);
  const path = new Phaser.Curves.Path(startWorld.x, startWorld.y);
  for (let i = 1; i < cells.length; i++) {
    const c = cells[i];
    if (!c) continue;
    const w = grid.cellToWorld(c.col, c.row);
    path.lineTo(w.x, w.y);
  }
  return path;
}

export function isPathValid(grid: Grid): boolean {
  const cells = findPath(grid, grid.spawn, grid.base);
  return cells !== null && cells.length >= 2;
}
