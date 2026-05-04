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
