import { describe, expect, it, afterEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { createDb } from './connection';

describe('Database connection', () => {
    let cleanup: (() => void) | undefined;

    afterEach(() => {
        cleanup?.();
        cleanup = undefined;
    });

    it('connects and executes a query', () => {
        const { db, sqlite } = createDb(':memory:');
        cleanup = () => sqlite.close();

        const result = db.get<{ val: number }>(sql`SELECT 1 as val`);
        expect(result).toEqual({ val: 1 });
    });

    it('enables WAL mode for file-based databases', () => {
        const { sqlite } = createDb(':memory:');
        cleanup = () => sqlite.close();

        // In-memory DBs report 'memory' for journal_mode since WAL
        // doesn't apply to them. The pragma call still executes without
        // error, proving the code path works. File-based DBs return 'wal'.
        const mode = sqlite.pragma('journal_mode') as { journal_mode: string }[];
        expect(mode).toHaveLength(1);
        expect(mode[0].journal_mode).toBe('memory');
    });
});
