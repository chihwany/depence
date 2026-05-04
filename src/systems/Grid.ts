export type CellType = "empty" | "road" | "tower" | "spawn" | "base";

export interface GridPosition {
  col: number;
  row: number;
}

export interface Cell {
  col: number;
  row: number;
  type: CellType;
}

export interface GridConfig {
  cols: number;
  rows: number;
  cellSize: number;
  offsetX: number;
  offsetY: number;
}

export class Grid {
  readonly config: GridConfig;
  readonly cells: Cell[][];

  constructor(config: GridConfig) {
    this.config = config;
    this.cells = [];
    for (let row = 0; row < config.rows; row++) {
      const rowArr: Cell[] = [];
      for (let col = 0; col < config.cols; col++) {
        rowArr.push({ col, row, type: "empty" });
      }
      this.cells.push(rowArr);
    }
  }

  getCell(col: number, row: number): Cell | null {
    if (col < 0 || col >= this.config.cols) return null;
    if (row < 0 || row >= this.config.rows) return null;
    const r = this.cells[row];
    if (!r) return null;
    return r[col] ?? null;
  }

  setCellType(col: number, row: number, type: CellType): boolean {
    const cell = this.getCell(col, row);
    if (!cell) return false;
    cell.type = type;
    return true;
  }

  cellToWorld(col: number, row: number): { x: number; y: number } {
    const half = this.config.cellSize / 2;
    return {
      x: this.config.offsetX + col * this.config.cellSize + half,
      y: this.config.offsetY + row * this.config.cellSize + half,
    };
  }

  worldToCell(x: number, y: number): GridPosition | null {
    const col = Math.floor((x - this.config.offsetX) / this.config.cellSize);
    const row = Math.floor((y - this.config.offsetY) / this.config.cellSize);
    if (col < 0 || col >= this.config.cols) return null;
    if (row < 0 || row >= this.config.rows) return null;
    return { col, row };
  }
}
