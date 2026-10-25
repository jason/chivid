import Dexie from 'dexie';
import type { RecognitionResult } from '@project/common/mandarin/line-recognition';

export const ledgerSchemaVersion = 1;

/**
 * One line of the learning ledger. The ledger is append-only: a later event supersedes
 * an earlier one for the same line, but nothing is ever rewritten or deleted except by reset.
 */
export type LedgerEvent =
    | {
          readonly v: typeof ledgerSchemaVersion;
          readonly ts: string;
          readonly kind: 'audio';
          readonly result: RecognitionResult;
          readonly sentence: string;
          readonly track: number;
          readonly start: number;
          readonly end: number;
          readonly sourceUrl: string;
          readonly title: string;
          /** Name of the active recipe when the mark was made, or null for none. */
          readonly recipe: string | null;
      }
    | {
          readonly v: typeof ledgerSchemaVersion;
          readonly ts: string;
          readonly kind: 'reset';
      };

export type NewLedgerEvent = Omit<Extract<LedgerEvent, { kind: 'audio' }>, 'v' | 'ts'>;

interface LedgerRow {
    readonly id?: number;
    readonly ts: string;
    readonly kind: LedgerEvent['kind'];
    readonly event: LedgerEvent;
}

class MandarinDatabase extends Dexie {
    events!: Dexie.Table<LedgerRow, number>;

    constructor() {
        super('MandarinEditionDatabase');
        this.version(1).stores({
            events: '++id,ts,kind',
        });
    }
}

export const ledgerEventToJsonl = (events: readonly LedgerEvent[]): string =>
    events.map((event) => JSON.stringify(event)).join('\n') + (events.length ? '\n' : '');

export class LedgerRepository {
    private readonly db = new MandarinDatabase();

    async append(event: NewLedgerEvent, now: Date = new Date()): Promise<LedgerEvent> {
        const full: LedgerEvent = { v: ledgerSchemaVersion, ts: now.toISOString(), ...event };
        await this.db.events.add({ ts: full.ts, kind: full.kind, event: full });
        return full;
    }

    async all(): Promise<LedgerEvent[]> {
        const rows = await this.db.events.orderBy('id').toArray();
        return rows.map((row) => row.event);
    }

    async since(isoTimestamp: string): Promise<LedgerEvent[]> {
        const rows = await this.db.events.where('ts').aboveOrEqual(isoTimestamp).sortBy('id');
        return rows.map((row) => row.event);
    }

    async exportJsonl(): Promise<string> {
        return ledgerEventToJsonl(await this.all());
    }

    /** Clears the ledger and leaves a single reset marker, so a reset is visible in any later export. */
    async reset(now: Date = new Date()): Promise<void> {
        await this.db.transaction('rw', this.db.events, async () => {
            await this.db.events.clear();
            const marker: LedgerEvent = { v: ledgerSchemaVersion, ts: now.toISOString(), kind: 'reset' };
            await this.db.events.add({ ts: marker.ts, kind: marker.kind, event: marker });
        });
    }
}
