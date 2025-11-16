export enum Direction {
    LEFT = 'left',
    RIGHT = 'right',
    UP = 'up',
    DOWN = 'down',
}

export type GameState = {
    board: (TileModel | 0)[];
    score: number;
    canMove: boolean;
    canUndo: boolean;
    canRedo: boolean; // ← новое поле
};

export type TileModel = { id: number; value: number };

export type Cell = TileModel | 0;

export type Snapshot = {
    board: Cell[];
    score: number;
    nextId: number;
};
