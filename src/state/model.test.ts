import { describe, expect, it } from 'vitest';
import {
  answerWorkIn,
  checkIn,
  endSession,
  initialRack,
  joinLine,
  liftBar,
  pendingRequest,
  rackBar,
  rackStatus,
  setSets,
  setsLine,
  setTag,
  startGuest,
  timeLine,
} from './model';

const threeSets = setSets(checkIn(initialRack), 3);

describe('set count and time', () => {
  it('drops the count when a set starts, and the time when it ends', () => {
    expect(timeLine(threeSets.session!)).toBe('Free in about 15 min');

    const lifting = liftBar(threeSets);
    expect(setsLine(lifting.session!)).toBe('2 sets after this one');
    expect(timeLine(lifting.session!)).toBe('Free in about 15 min');

    const resting = rackBar(lifting);
    expect(setsLine(resting.session!)).toBe('2 sets left');
    expect(timeLine(resting.session!)).toBe('Free in about 10 min');
  });

  it('names the last set and the end of the plan', () => {
    const lastSet = liftBar(setSets(threeSets, 1));
    expect(setsLine(lastSet.session!)).toBe('Last set');
    expect(setsLine(rackBar(lastSet).session!)).toBe('All sets done');
    expect(timeLine(rackBar(lastSet).session!)).toBe('Free in a moment');
  });
});

describe('status', () => {
  it('follows the bar and the work-in tag', () => {
    expect(rackStatus(initialRack)).toBe('free');
    expect(rackStatus(threeSets)).toBe('resting-open');
    expect(rackStatus(liftBar(threeSets))).toBe('mid-set');
    expect(rackStatus(setTag(threeSets, 'workIn', false))).toBe('resting-closed');
    expect(rackStatus(startGuest(initialRack, 3, false))).toBe('resting-closed');
  });
});

describe('waiting line', () => {
  it('holds a work-in request until the lifter rests', () => {
    const asked = joinLine(liftBar(threeSets), 'work-in');
    expect(pendingRequest(asked)).toBeNull();
    expect(pendingRequest(rackBar(asked))?.status).toBe('asked');
    expect(answerWorkIn(rackBar(asked), true).waiters[0].status).toBe('sharing');
  });

  it('queues a work-in request when the lifter is not sharing', () => {
    const closed = setTag(threeSets, 'workIn', false);
    expect(joinLine(closed, 'work-in').waiters[0].status).toBe('queued');
    expect(setTag(joinLine(threeSets, 'work-in'), 'workIn', false).waiters[0].status).toBe(
      'queued',
    );
  });

  it('hands the rack to the first in line', () => {
    const ended = endSession(joinLine(joinLine(threeSets, 'work-in'), 'turn'));
    expect(rackStatus(ended)).toBe('your-turn');

    const next = startGuest(ended, 3, true);
    expect(next.waiters).toHaveLength(1);
    expect(next.session?.by).toBe('guest');
  });
});
