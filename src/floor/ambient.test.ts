import { describe, expect, it } from 'vitest';
import { checkIn, endSession, initialRack, joinLine, rackStatus, setSets } from '../state/model';
import { advance, initialBeats, tick } from './ambient';
import { seedFloor } from './racks';

describe('advance', () => {
  it('runs a whole workout: check in, sets and rests, then whoever joined the line is next', () => {
    let rack = advance(initialRack, 0).rack;
    expect(rack.session?.by).toBe('phone');
    expect(rack.session?.setsLeft).toBe(3);

    const seen: string[] = [];
    for (let count = 1; rack.session; count += 1) {
      rack = advance(rack, count).rack;
      seen.push(rackStatus(rack));
    }
    expect(seen.filter((status) => status === 'mid-set')).toHaveLength(3);
    expect(seen).toContain('resting-open');
    expect(rackStatus(rack)).toBe('your-turn');
    expect(rack.waiters).toEqual([{ id: 1, status: 'queued' }]);
  });

  it('hands the rack to the next in line quickly', () => {
    const done = setSets(checkIn(initialRack), 0);
    const step = advance(joinLine(done, 'turn'), 1);
    expect(rackStatus(step.rack)).toBe('your-turn');
    expect(step.nextIn).toBeLessThan(5);

    const next = advance(endSession(step.rack), 2).rack;
    expect(next.session).not.toBeNull();
    expect(next.waiters).toHaveLength(0);
  });
});

describe('tick', () => {
  it('leaves skipped racks alone and counts the others down', () => {
    const floor = seedFloor(initialRack);
    const beats = initialBeats();
    let state = { floor, beats };
    for (let second = 0; second < 6; second += 1) {
      state = tick(state.floor, state.beats, [1, 3]);
    }
    expect(state.floor[1]).toBe(floor[1]);
    expect(state.floor[3]).toBe(floor[3]);
    // Rack 4 rests with one set left, so its first beat starts that set.
    expect(rackStatus(state.floor[4])).toBe('mid-set');
  });

  it('keeps the same floor object when nothing changes', () => {
    const floor = seedFloor(initialRack);
    expect(tick(floor, initialBeats(), []).changed).toBe(false);
  });
});
