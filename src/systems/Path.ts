import Phaser from "phaser";
import type { Grid, GridConfig, GridPosition } from "./Grid";

export const GRID_CONFIG: GridConfig = {
  cols: 8,
  rows: 12,
  cellSize: 70,
  offsetX: 80,
  offsetY: 180,
};

// Initial path: short straight segment near the bottom of the grid.
// First element is spawn, last is base. Player extends behind spawn
// (prepends to this list) to lengthen the route over time.
// Starts short (6 cells) so the player has reason to extend immediately.
export const INITIAL_PATH_CELLS: GridPosition[] = [
  { col: 3, row: 6 }, // spawn
  { col: 3, row: 7 },
  { col: 3, row: 8 },
  { col: 3, row: 9 },
  { col: 3, row: 10 },
  { col: 3, row: 11 }, // base
];

export const STARTING_SHAPE_TOKENS: { I: number; L: number; U: number } = {
  I: 4,
  L: 1,
  U: 1,
};

export function buildCurvePathFromCells(
  grid: Grid,
  cells: GridPosition[],
): Phaser.Curves.Path | null {
  if (cells.length < 2) return null;
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

export function isAdjacent(a: GridPosition, b: GridPosition): boolean {
  const dc = Math.abs(a.col - b.col);
  const dr = Math.abs(a.row - b.row);
  return (dc === 1 && dr === 0) || (dc === 0 && dr === 1);
}

export function getNeighbors(p: GridPosition): GridPosition[] {
  return [
    { col: p.col - 1, row: p.row },
    { col: p.col + 1, row: p.row },
    { col: p.col, row: p.row - 1 },
    { col: p.col, row: p.row + 1 },
  ];
}
