import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  sortStatusItems,
  scheduleSyncToBackend,
  generateToastId,
  getLastUserCommandAt,
} from '../helpers';

describe('sortStatusItems', () => {
  it('should sort priority items (zero, exchange, goup) first', () => {
    const items = [
      { id: '5', item: { name: 'five', image: '' } as any },
      { id: 'zero', item: { name: 'zero', image: '' } as any },
      { id: '3', item: { name: 'three', image: '' } as any },
      { id: 'exchange', item: { name: 'exchange', image: '' } as any },
      { id: 'goup', item: { name: 'goup', image: '' } as any },
      { id: '1', item: { name: 'one', image: '' } as any },
    ];

    const result = sortStatusItems(items);
    const ids = result.map((r) => r.id);

    expect(ids[0]).toBe('zero');
    expect(ids[1]).toBe('exchange');
    expect(ids[2]).toBe('goup');
  });

  it('should sort numeric ids in ascending order after priority items', () => {
    const items = [
      { id: '10', item: {} as any },
      { id: '2', item: {} as any },
      { id: '1', item: {} as any },
    ];

    const result = sortStatusItems(items);
    const ids = result.map((r) => r.id);

    expect(ids).toEqual(['1', '2', '10']);
  });

  it('should sort non-numeric ids after numeric ids using localeCompare', () => {
    const items = [
      { id: 'abc', item: {} as any },
      { id: '1', item: {} as any },
      { id: 'def', item: {} as any },
    ];

    const result = sortStatusItems(items);
    const ids = result.map((r) => r.id);

    expect(ids[0]).toBe('1');
  });

  it('should not mutate the original array', () => {
    const items = [
      { id: '2', item: {} as any },
      { id: '1', item: {} as any },
    ];

    const originalOrder = items.map((i) => i.id);
    sortStatusItems(items);

    expect(items.map((i) => i.id)).toEqual(originalOrder);
  });
});

describe('generateToastId', () => {
  it('should generate unique ids', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateToastId());
    }

    expect(ids.size).toBe(100);
  });

  it('should generate string ids', () => {
    const id = generateToastId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });
});

describe('scheduleSyncToBackend', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should debounce multiple calls', () => {
    const syncFn = vi.fn().mockResolvedValue(undefined);

    scheduleSyncToBackend(syncFn, 100);
    scheduleSyncToBackend(syncFn, 100);
    scheduleSyncToBackend(syncFn, 100);

    expect(syncFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);

    expect(syncFn).toHaveBeenCalledTimes(1);
  });

  it('should update lastUserCommandAt after sync executes', () => {
    const syncFn = vi.fn().mockResolvedValue(undefined);

    scheduleSyncToBackend(syncFn, 50);
    vi.advanceTimersByTime(50);

    const afterTime = getLastUserCommandAt();
    expect(afterTime).toBeGreaterThan(0);
  });

  it('should cancel previous scheduled sync when called again', () => {
    const syncFn = vi.fn().mockResolvedValue(undefined);

    scheduleSyncToBackend(syncFn, 100);
    vi.advanceTimersByTime(50);

    scheduleSyncToBackend(syncFn, 100);
    vi.advanceTimersByTime(50);

    expect(syncFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);

    expect(syncFn).toHaveBeenCalledTimes(1);
  });
});
