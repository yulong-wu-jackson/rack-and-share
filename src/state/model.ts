/** Domain model for one rack: who is on it, what they plan, and who is waiting. */

export type Experience = 'beginner' | 'experienced';

export interface Tags {
  experience: Experience | null;
  workIn: boolean;
  spot: boolean;
  questions: boolean;
}

export type ToggleTag = 'workIn' | 'spot' | 'questions';

export type WaitKind = 'work-in' | 'turn';

/** asked: wants to work in, not answered yet. sharing: the lifter said yes. queued: waiting for the rack. */
export type WaitStatus = 'asked' | 'sharing' | 'queued';

export interface Waiter {
  id: number;
  status: WaitStatus;
}

export type Session = {
  /** Sets left after the one in progress. */
  setsLeft: number;
  lifting: boolean;
} & ({ by: 'phone' } | { by: 'guest'; tags: Tags });

export interface Rack {
  tags: Tags;
  session: Session | null;
  waiters: Waiter[];
  nextWaiterId: number;
}

export type RackStatus = 'free' | 'your-turn' | 'mid-set' | 'resting-open' | 'resting-closed';

export const DEFAULT_SETS = 5;
export const GUEST_DEFAULT_SETS = 3;
export const GUEST_DEFAULT_TAGS: Tags = {
  experience: null,
  workIn: true,
  spot: false,
  questions: false,
};
export const MAX_SETS = 9;
export const MAX_WAITERS = 3;
const MINUTES_PER_SET = 5;

export const initialRack: Rack = {
  tags: { experience: null, workIn: true, spot: false, questions: false },
  session: null,
  waiters: [],
  nextWaiterId: 1,
};

export function activeTags(rack: Rack): Tags | null {
  const { session } = rack;
  if (!session) return null;
  return session.by === 'guest' ? session.tags : rack.tags;
}

export function opensToWorkIn(rack: Rack): boolean {
  return activeTags(rack)?.workIn ?? false;
}

export function rackStatus(rack: Rack): RackStatus {
  if (!rack.session) return rack.waiters.length > 0 ? 'your-turn' : 'free';
  if (rack.session.lifting) return 'mid-set';
  return opensToWorkIn(rack) ? 'resting-open' : 'resting-closed';
}

export function minutesLeft(session: Session): number {
  return MINUTES_PER_SET * (session.setsLeft + (session.lifting ? 1 : 0));
}

export function timeLine(session: Session): string {
  const minutes = minutesLeft(session);
  return minutes === 0 ? 'Free in a moment' : `Free in about ${minutes} min`;
}

export function setsLine(session: Session): string {
  const { setsLeft, lifting } = session;
  if (setsLeft === 0) return lifting ? 'Last set' : 'All sets done';
  const sets = setsLeft === 1 ? '1 set' : `${setsLeft} sets`;
  return lifting ? `${sets} after this one` : `${sets} left`;
}

/** The request the lifter still has to answer. It only surfaces while they rest. */
export function pendingRequest(rack: Rack): Waiter | null {
  if (!rack.session || rack.session.lifting) return null;
  return rack.waiters.find((waiter) => waiter.status === 'asked') ?? null;
}

function startSession(rack: Rack, session: Session): Rack {
  if (rack.session) return rack;
  // Whoever starts on a rack with a line is taken to be first in it.
  return { ...rack, session, waiters: rack.waiters.slice(1) };
}

export function checkIn(rack: Rack): Rack {
  return startSession(rack, {
    by: 'phone',
    setsLeft: DEFAULT_SETS,
    lifting: false,
  });
}

export function startGuest(rack: Rack, sets: number, tags: Tags = GUEST_DEFAULT_TAGS): Rack {
  return startSession(rack, {
    by: 'guest',
    setsLeft: sets,
    lifting: false,
    tags: { ...tags },
  });
}

export function updateGuestSettings(rack: Rack, sets: number, tags: Tags): Rack {
  if (rack.session?.by !== 'guest') return rack;
  const next = setSets({ ...rack, session: { ...rack.session, tags: { ...tags } } }, sets);
  return rack.session.tags.workIn && !tags.workIn ? answerWorkIn(next, false) : next;
}

/** The sensor sees the bar leave the hooks: a set starts and the count drops. */
export function liftBar(rack: Rack): Rack {
  if (!rack.session || rack.session.lifting) return rack;
  const setsLeft = Math.max(0, rack.session.setsLeft - 1);
  return { ...rack, session: { ...rack.session, lifting: true, setsLeft } };
}

export function rackBar(rack: Rack): Rack {
  if (!rack.session?.lifting) return rack;
  return { ...rack, session: { ...rack.session, lifting: false } };
}

export function setSets(rack: Rack, sets: number): Rack {
  if (!rack.session) return rack;
  const setsLeft = Math.min(MAX_SETS, Math.max(0, sets));
  return { ...rack, session: { ...rack.session, setsLeft } };
}

export function endSession(rack: Rack): Rack {
  if (!rack.session) return rack;
  const waiters = rack.waiters.map((waiter) => ({
    ...waiter,
    status: 'queued' as const,
  }));
  return { ...rack, session: null, waiters };
}

export function joinLine(rack: Rack, kind: WaitKind): Rack {
  if (!rack.session || rack.waiters.length >= MAX_WAITERS) return rack;
  const status: WaitStatus = kind === 'work-in' && opensToWorkIn(rack) ? 'asked' : 'queued';
  return {
    ...rack,
    waiters: [...rack.waiters, { id: rack.nextWaiterId, status }],
    nextWaiterId: rack.nextWaiterId + 1,
  };
}

export function leaveLine(rack: Rack, id: number): Rack {
  return {
    ...rack,
    waiters: rack.waiters.filter((waiter) => waiter.id !== id),
  };
}

export function answerWorkIn(rack: Rack, accept: boolean): Rack {
  const answered: WaitStatus = accept ? 'sharing' : 'queued';
  const waiters = rack.waiters.map((waiter) =>
    waiter.status === 'asked' ? { ...waiter, status: answered } : waiter,
  );
  return { ...rack, waiters };
}

export function setTag(rack: Rack, tag: ToggleTag, on: boolean): Rack {
  const next: Rack = { ...rack, tags: { ...rack.tags, [tag]: on } };
  // Switching sharing off turns open requests into a place in line.
  return tag === 'workIn' && !on && rack.session?.by === 'phone' ? answerWorkIn(next, false) : next;
}

export function setExperience(rack: Rack, experience: Experience): Rack {
  return { ...rack, tags: { ...rack.tags, experience } };
}
