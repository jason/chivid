import 'core-js/stable/structured-clone';
import 'fake-indexeddb/auto';
import { beforeEach, expect, it } from '@jest/globals';
import { LedgerRepository, ledgerEventToJsonl } from '@project/common/mandarin/ledger';
import type { NewLedgerEvent } from '@project/common/mandarin/ledger';

const heard = (sentence: string, result: 'got' | 'missed'): NewLedgerEvent => ({
    kind: 'audio',
    result,
    sentence,
    track: 0,
    start: 1000,
    end: 2400,
    sourceUrl: 'https://www.youtube.com/watch?v=example',
    title: 'Example',
    mode: 'ears',
});

beforeEach(async () => {
    await new LedgerRepository().reset(new Date('2026-01-01T00:00:00Z'));
});

it('appends events in order with schema version and timestamp', async () => {
    const repo = new LedgerRepository();
    await repo.append(heard('银行九点就开门了。', 'missed'), new Date('2026-10-24T20:00:00Z'));
    await repo.append(heard('因为离家近啊。', 'got'), new Date('2026-10-24T20:01:00Z'));

    const events = await repo.all();
    expect(events.map((e) => e.kind)).toEqual(['reset', 'audio', 'audio']);
    expect(events[1]).toMatchObject({
        v: 1,
        ts: '2026-10-24T20:00:00.000Z',
        result: 'missed',
        sentence: '银行九点就开门了。',
    });
});

it('exports one JSON object per line, readable without the extension', async () => {
    const repo = new LedgerRepository();
    await repo.append(heard('你今天怎么这么早？', 'missed'), new Date('2026-10-24T20:00:00Z'));

    const jsonl = await repo.exportJsonl();
    const lines = jsonl
        .trimEnd()
        .split('\n')
        .map((line) => JSON.parse(line));
    expect(lines).toHaveLength(2);
    expect(lines[1].sentence).toBe('你今天怎么这么早？');
    expect(jsonl.endsWith('\n')).toBe(true);
});

it('returns only events at or after a timestamp', async () => {
    const repo = new LedgerRepository();
    await repo.append(heard('a', 'got'), new Date('2026-10-23T12:00:00Z'));
    await repo.append(heard('b', 'missed'), new Date('2026-10-24T12:00:00Z'));

    const recent = await repo.since('2026-10-24T00:00:00.000Z');
    expect(recent.map((e) => (e.kind === 'audio' ? e.sentence : e.kind))).toEqual(['b']);
});

it('leaves a reset marker when cleared', async () => {
    const repo = new LedgerRepository();
    await repo.append(heard('a', 'got'));
    await repo.reset(new Date('2026-10-25T00:00:00Z'));
    expect(await repo.all()).toEqual([{ v: 1, ts: '2026-10-25T00:00:00.000Z', kind: 'reset' }]);
});

it('serialises an empty ledger as an empty string', () => {
    expect(ledgerEventToJsonl([])).toBe('');
});
