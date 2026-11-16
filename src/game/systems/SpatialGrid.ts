import { WORLD_HEIGHT, WORLD_WIDTH } from '../config';

export interface Positioned
{
    readonly x: number;
    readonly y: number;
}

export class SpatialGrid<T extends Positioned>
{
    private readonly cells = new Map<number, T[]>();
    private readonly cols: number;
    private readonly rows: number;

    constructor (private readonly cellSize: number)
    {
        this.cols = Math.ceil(WORLD_WIDTH / cellSize);
        this.rows = Math.ceil(WORLD_HEIGHT / cellSize);
    }

    clear ()
    {
        for (const bucket of this.cells.values())
        {
            bucket.length = 0;
        }
    }

    insert (item: T)
    {
        const key = this.cellIndex(this.col(item.x), this.row(item.y));
        let bucket = this.cells.get(key);

        if (!bucket)
        {
            bucket = [];
            this.cells.set(key, bucket);
        }

        bucket.push(item);
    }

    forEachNear (x: number, y: number, fn: (item: T) => void)
    {
        const cx = this.col(x);
        const cy = this.row(y);

        for (let row = Math.max(0, cy - 1); row <= Math.min(this.rows - 1, cy + 1); row++)
        {
            for (let col = Math.max(0, cx - 1); col <= Math.min(this.cols - 1, cx + 1); col++)
            {
                const bucket = this.cells.get(this.cellIndex(col, row));

                if (bucket)
                {
                    for (let i = 0; i < bucket.length; i++)
                    {
                        fn(bucket[i]);
                    }
                }
            }
        }
    }

    forEachInRadius (x: number, y: number, r: number, fn: (item: T) => void)
    {
        const minCol = this.col(x - r);
        const maxCol = this.col(x + r);
        const minRow = this.row(y - r);
        const maxRow = this.row(y + r);

        for (let row = minRow; row <= maxRow; row++)
        {
            for (let col = minCol; col <= maxCol; col++)
            {
                const bucket = this.cells.get(this.cellIndex(col, row));

                if (bucket)
                {
                    for (let i = 0; i < bucket.length; i++)
                    {
                        fn(bucket[i]);
                    }
                }
            }
        }
    }

    private col (x: number)
    {
        return Math.min(this.cols - 1, Math.max(0, Math.floor(x / this.cellSize)));
    }

    private row (y: number)
    {
        return Math.min(this.rows - 1, Math.max(0, Math.floor(y / this.cellSize)));
    }

    private cellIndex (col: number, row: number)
    {
        return row * this.cols + col;
    }
}
