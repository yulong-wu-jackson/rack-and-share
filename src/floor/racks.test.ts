import { describe, expect, it } from 'vitest';
import { checkIn, initialRack, liftBar, rackStatus, setSets } from '../state/model';
import { bestBet, HERO_RACK, RACK_IDS, seedFloor, statusCounts, tipLine } from './racks';

const floor = seedFloor(initialRack);

describe('seed floor', () => {
  it('shows every state but "next up", with only the hero rack free', () => {
    expect(rackStatus(floor[HERO_RACK])).toBe('free');
    expect(statusCounts(floor)).toEqual({
      free: 1,
      'your-turn': 0,
      'mid-set': 2,
      'resting-open': 2,
      'resting-closed': 1,
    });
  });
});

describe('best bet', () => {
  it('sends a newcomer to a free rack first', () => {
    const tip = bestBet(floor);
    expect(tip).toEqual({ kind: 'free', id: HERO_RACK });
    expect(tip && tipLine(tip)).toBe('Rack 3 is free. Walk right over.');
  });

  it('falls back to a rack open to work in', () => {
    const taken = { ...floor, [HERO_RACK]: liftBar(checkIn(initialRack)) };
    expect(bestBet(taken)).toEqual({ kind: 'work-in', id: 2 });
  });

  it('then to the rack that frees up first', () => {
    const busy = (sets: number) => liftBar(setSets(checkIn(initialRack), sets));
    const allBusy = { ...floor };
    for (const id of RACK_IDS) allBusy[id] = busy(id === 4 ? 1 : 3);
    const tip = bestBet(allBusy);
    expect(tip).toEqual({ kind: 'soonest', id: 4, minutes: 5 });
    expect(tip && tipLine(tip)).toBe('All taken. Rack 4 frees up first, in about 5 min.');
  });

  it('skips a rack open to work in once its line is full', () => {
    const taken = { ...floor, [HERO_RACK]: liftBar(checkIn(initialRack)) };
    const waiters = [1, 2, 3].map((id) => ({ id, status: 'queued' as const }));
    expect(bestBet({ ...taken, 2: { ...taken[2], waiters } })).toEqual({ kind: 'work-in', id: 6 });
  });

  it('prefers a rack with no line when all are taken', () => {
    const allBusy = { ...floor };
    for (const id of RACK_IDS) allBusy[id] = liftBar(setSets(checkIn(initialRack), 3));
    allBusy[4] = {
      ...liftBar(setSets(checkIn(initialRack), 1)),
      waiters: [{ id: 1, status: 'queued' }],
    };
    expect(bestBet(allBusy)).toEqual({ kind: 'soonest', id: 1, minutes: 15 });
  });

  it('says "in a moment" when the last set is done', () => {
    const closed = { ...initialRack, tags: { ...initialRack.tags, workIn: false } };
    const allBusy = { ...floor };
    for (const id of RACK_IDS) allBusy[id] = liftBar(setSets(checkIn(initialRack), 3));
    allBusy[4] = setSets(checkIn(closed), 0);
    const tip = bestBet(allBusy);
    expect(tip && tipLine(tip)).toBe('All taken. Rack 4 frees up in a moment.');
  });
});
