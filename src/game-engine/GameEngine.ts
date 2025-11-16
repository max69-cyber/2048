import {Cell, Direction, GameState, Snapshot, TileModel} from "../types";
import {
    BOARD_SIZE,
    DEFAULT_TILE_SCORE,
    HIGH_SCORE_TILE,
    HIGH_SCORE_TILE_PROBABILITY,
    START_TILES_COUNT
} from "../consts";

class GameEngine {
    private readonly size = BOARD_SIZE;
    private board: Cell[];
    private score = 0;
    private nextId = 1;

    private history: Snapshot[] = [];
    private future: Snapshot[] = [];

    constructor() {
        this.board = Array(this.size * this.size).fill(0);
        for (let i = 0; i < START_TILES_COUNT; i++) this.spawnRandom();
    }

    // Получить текущее состояние игры
    public getGameState = (): GameState & { board: Cell[] } => ({
        board: this.cloneBoard(this.board),
        score: this.score,
        canMove: this.hasMoves(),
        canUndo: this.history.length > 0,
        canRedo: this.future.length > 0,
    });

    // Полный сброс состояния игры
    public reset = () => {
        this.board = Array(this.size * this.size).fill(0);
        this.score = 0;
        this.nextId = 1;
        this.history = [];
        this.future = [];
        for (let i = 0; i < START_TILES_COUNT; i++) this.spawnRandom();
    };

    // Шаг назад
    public undo = (): boolean => {
        if (!this.history.length) return false;
        this.future.push({
            board: this.cloneBoard(this.board),
            score: this.score,
            nextId: this.nextId,
        });
        const snap = this.history.pop()!;
        this.board = this.cloneBoard(snap.board);
        this.score = snap.score;
        this.nextId = snap.nextId;
        return true;
    };

    // Шаг вперед
    public redo = (): boolean => {
        if (!this.future.length) return false;
        this.history.push({
            board: this.cloneBoard(this.board),
            score: this.score,
            nextId: this.nextId,
        });
        const snap = this.future.pop()!;
        this.board = this.cloneBoard(snap.board);
        this.score = snap.score;
        this.nextId = snap.nextId;
        return true;
    };

    // Ход
    public move = (direction: Direction): boolean => {
        const beforeBoard = this.board.slice();
        const { nextBoard, gained } = this.applyMove(this.board, direction);

        if (!this.equals(beforeBoard, nextBoard)) {
            // сохраняем снимок для UNDO
            this.history.push({
                board: this.cloneBoard(this.board),
                score: this.score,
                nextId: this.nextId,
            });
            this.future = []; // новый ход стирает redo

            this.board = nextBoard;
            this.score += gained;
            this.spawnRandom(); // появление новой плитки
            return true;
        }
        return false;
    };

    // Появление новой плитки
    private spawnRandom = () => {
        const free: number[] = [];
        for (let i = 0; i < this.board.length; i++) if (this.board[i] === 0) free.push(i);
        if (!free.length) return;
        const at = free[Math.floor(Math.random() * free.length)];

        // Вероятность: 90% — 2, 10% — 4
        const value =
            Math.random() < (HIGH_SCORE_TILE_PROBABILITY ?? 0.1)
                ? HIGH_SCORE_TILE
                : DEFAULT_TILE_SCORE;

        this.board[at] = { id: this.nextId++, value };
    };

    // Проверка на возможные ходы
    private hasMoves = (): boolean => {
        const N = this.size;
        if (this.board.some(v => v === 0)) return true;

        for (let r = 0; r < N; r++)
            for (let c = 0; c < N - 1; c++) {
                const a = this.board[r * N + c] as TileModel;
                const b = this.board[r * N + c + 1] as TileModel;
                if (a.value === b.value) return true;
            }

        for (let c = 0; c < N; c++)
            for (let r = 0; r < N - 1; r++) {
                const a = this.board[r * N + c] as TileModel;
                const b = this.board[(r + 1) * N + c] as TileModel;
                if (a.value === b.value) return true;
            }

        return false;
    };

    // Совершение хода
    private applyMove = (board: Cell[], direction: Direction) => {
        const next = board.slice();
        let gained = 0;
        const N = this.size;

        if (direction === Direction.LEFT || direction === Direction.RIGHT) {
            for (let r = 0; r < N; r++) {
                let row = next.slice(r * N, r * N + N);
                if (direction === Direction.RIGHT) row = row.reverse();
                const { line, add } = this.mergeLeft(row);
                gained += add;
                const out = direction === Direction.RIGHT ? line.reverse() : line;
                for (let c = 0; c < N; c++) next[r * N + c] = out[c];
            }
        } else {
            for (let c = 0; c < N; c++) {
                let col: Cell[] = [next[c], next[c + N], next[c + 2 * N], next[c + 3 * N]];
                if (direction === Direction.DOWN) col = col.reverse();
                const { line, add } = this.mergeLeft(col);
                gained += add;
                const out = direction === Direction.DOWN ? line.reverse() : line;
                for (let r = 0; r < N; r++) next[r * N + c] = out[r];
            }
        }

        return { nextBoard: next, gained };
    };

    // Соединение плиток в левую сторону
    private mergeLeft = (arr: Cell[]) => {
        const a = arr.filter(v => v !== 0) as TileModel[];
        const out: Cell[] = [];
        let add = 0;

        for (let i = 0; i < a.length; i++) {
            if (i < a.length - 1 && a[i].value === a[i + 1].value) {
                const mergedValue = a[i].value * 2;
                out.push({ id: a[i].id, value: mergedValue });
                add += mergedValue;
                i++; // пропускаем вторую
            } else {
                out.push(a[i]);
            }
        }

        while (out.length < 4) out.push(0);
        return { line: out, add };
    };

    // Сравнение двух состояний доски
    private equals = (a: Cell[], b: Cell[]): boolean => {
        for (let i = 0; i < a.length; i++) {
            const A = a[i],
                B = b[i];
            if (A === 0 && B === 0) continue;
            if (A === 0 || B === 0) return false;
            if (
                (A as TileModel).id !== (B as TileModel).id ||
                (A as TileModel).value !== (B as TileModel).value
            )
                return false;
        }
        return true;
    };

    private cloneBoard(src: Cell[]): Cell[] {
        return src.map(cell => (cell === 0 ? 0 : { ...cell }));
    }
}

export default GameEngine;
