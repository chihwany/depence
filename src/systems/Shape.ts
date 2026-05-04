import type { Grid, GridPosition } from "./Grid";

// 0=N (default), 1=E (CW 90), 2=S (180), 3=W (CCW 90)
export type Direction = 0 | 1 | 2 | 3;
export const DIRECTIONS: Direction[] = [0, 1, 2, 3];

export interface ShapeOffset {
  dCol: number;
  dRow: number;
}

export interface ShapeDef {
  id: string;
  label: string;
  color: number;
  // Offsets relative to spawn in default (north) orientation.
  // Sequential cells of the path. Last cell becomes the new spawn.
  offsets: ShapeOffset[];
}

function rotateOffset(o: ShapeOffset, dir: Direction): ShapeOffset {
  switch (dir) {
    case 0:
      return o;
    case 1:
      return { dCol: -o.dRow, dRow: o.dCol };
    case 2:
      return { dCol: -o.dCol, dRow: -o.dRow };
    case 3:
      return { dCol: o.dRow, dRow: -o.dCol };
  }
}

export function shapeCellsAt(
  spawn: GridPosition,
  shape: ShapeDef,
  dir: Direction,
): GridPosition[] {
  return shape.offsets.map((o) => {
    const r = rotateOffset(o, dir);
    return { col: spawn.col + r.dCol, row: spawn.row + r.dRow };
  });
}

export function isValidPlacement(grid: Grid, cells: GridPosition[]): boolean {
  if (cells.length === 0) return false;
  // No duplicates within the shape itself
  const keys = new Set<string>();
  for (const c of cells) {
    const cell = grid.getCell(c.col, c.row);
    if (!cell) return false; // out of bounds
    if (cell.type !== "empty") return false; // collides with existing path/tower
    const k = `${c.col},${c.row}`;
    if (keys.has(k)) return false;
    keys.add(k);
  }
  return true;
}

export interface Placement {
  dir: Direction;
  cells: GridPosition[];
}

export function getValidPlacements(
  grid: Grid,
  spawn: GridPosition,
  shape: ShapeDef,
): Placement[] {
  const out: Placement[] = [];
  for (const dir of DIRECTIONS) {
    const cells = shapeCellsAt(spawn, shape, dir);
    if (isValidPlacement(grid, cells)) {
      out.push({ dir, cells });
    }
  }
  return out;
}

// "Back" of the spawn = opposite of the direction the path goes from spawn
// to its next cell. A new block always attaches there, automatically
// rotated so its first cell sits behind the spawn.
export function computeBackDirection(pathCells: GridPosition[]): Direction {
  if (pathCells.length < 2) return 0;
  const spawn = pathCells[0]!;
  const next = pathCells[1]!;
  const dCol = next.col - spawn.col;
  const dRow = next.row - spawn.row;
  // Forward is where the path goes; back is the opposite.
  if (dRow > 0) return 0; // forward south  -> back north  (default offsets)
  if (dRow < 0) return 2; // forward north  -> back south
  if (dCol > 0) return 3; // forward east   -> back west
  if (dCol < 0) return 1; // forward west   -> back east
  return 0;
}

export function getBackPlacement(
  grid: Grid,
  pathCells: GridPosition[],
  shape: ShapeDef,
): Placement | null {
  if (pathCells.length === 0) return null;
  const spawn = pathCells[0]!;
  const dir = computeBackDirection(pathCells);
  const cells = shapeCellsAt(spawn, shape, dir);
  if (!isValidPlacement(grid, cells)) return null;
  return { dir, cells };
}
