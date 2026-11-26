/** The two guided scenarios in Try mode: the same moment at one rack, seen from either side. */

import {
  DEFAULT_SETS,
  initialRack,
  NO_WORK_IN,
  pendingRequest,
  type Rack,
  type Tags,
  type Waiter,
} from '../state/model';
import type { AppState, Persona } from '../state/store';

/** Something done in the gym, not on a screen, offered as the white button in the left panel. */
export type WorldAction = 'tap-phone' | 'lift' | 'rack' | 'work-in' | 'finish-work-in';

export interface Prompt {
  headline: string;
  action: WorldAction | null;
  /** The `data-cue` or `data-touch` name of the control the headline is about. */
  cue: string | null;
}

export interface Step {
  label: string;
  /** True once the viewer has got this far. Steps only ever move forward. */
  reached(state: AppState): boolean;
}

export interface Scenario {
  name: string;
  /** Where they stand in the scenario, in a few words. */
  side: string;
  bio: string;
  situation(rackId: number): string;
  tags: Tags;
  /** The rack as the scenario begins. */
  rack(): Rack;
  /** Who is on the gym floor at the start. */
  present: Record<Persona, boolean>;
  steps: Step[];
  prompt(state: AppState): Prompt;
  /** What the finished scenario showed. */
  outcome: string;
}

const MARCUS_TAGS: Tags = { experience: 'experienced', workIn: true, spot: true, questions: false };
export const MAYA_TAGS: Tags = {
  experience: 'beginner',
  workIn: true,
  spot: false,
  questions: true,
};

/** Maya's place in line at the scenario rack, if she has one. */
export function mayaInLine(state: AppState): Waiter | null {
  if (state.rackId !== state.scenarioRack || state.mayaWaiter === null) return null;
  return state.rack.waiters.find((waiter) => waiter.id === state.mayaWaiter) ?? null;
}

function prompt(
  headline: string,
  action: WorldAction | null = null,
  cue: string | null = null,
): Prompt {
  return { headline, action, cue };
}

const marcus: Scenario = {
  name: 'Marcus',
  side: 'Lifting on the rack',
  bio: 'Lifts five days a week. Glad to share between sets, but hates being stopped mid-set.',
  situation: (rackId) =>
    `Rack ${rackId} is free. Check in, plan your sets and lift. Someone will want this rack.`,
  tags: MARCUS_TAGS,
  rack: () => ({ ...initialRack, tags: MARCUS_TAGS }),
  present: { marcus: true, maya: false },
  steps: [
    { label: 'Check in with your phone', reached: (s) => s.mine === s.rackId },
    {
      label: 'Plan your sets',
      reached: (s) => s.rack.session?.by === 'phone' && s.rack.session.setsLeft !== DEFAULT_SETS,
    },
    { label: 'Lift a set', reached: (s) => s.rack.session?.lifting === true },
    {
      label: 'Answer Maya at your rest',
      reached: (s) => {
        const maya = mayaInLine(s);
        return maya !== null && maya.status !== 'asked';
      },
    },
    { label: 'Finish and end your session', reached: (s) => s.step >= 1 && !s.rack.session },
  ],
  prompt(s) {
    const { session, workIn } = s.rack;
    const rack = `Rack ${s.rackId}`;
    switch (s.step) {
      case 0:
        return prompt(`${rack} is free. Tap your phone on it to check in.`, 'tap-phone');
      case 1:
        return prompt('You’re in. Plan 3 sets on your phone, then confirm.', null, 'phone-counter');
      case 2:
        return prompt('Start your first set.', 'lift');
    }
    if (!session) return prompt('Session over.');
    if (workIn.lifting) return prompt('Maya is working in. Rest while she does her set.');
    if (session.lifting) {
      return s.present.maya
        ? prompt(
            'Someone wants the rack. It tells her to wait for your rest.',
            'rack',
            'figure-maya',
          )
        : prompt('Mid-set. The rack tells everyone to wait.', 'rack');
    }
    if (pendingRequest(s.rack)) {
      return prompt('Maya asked to work in. Answer on your phone.', null, 'phone-request');
    }
    if (mayaInLine(s)?.status === 'sharing' && workIn.sets === 0) {
      return prompt('You said yes. Maya takes a set while you rest.');
    }
    if (session.setsLeft === 0) {
      return prompt('All sets done. End your session on your phone.', null, 'end-session');
    }
    if (s.step === 3) {
      // He rests until Maya has had her chance to ask.
      const next = s.mayaWaiter === null ? null : 'lift';
      return s.tags.workIn
        ? prompt('Resting. The rack says you’re open to work in.', next)
        : prompt('Resting. The rack says you’re not sharing today.', next);
    }
    return prompt('Your rest. Start the next set when you’re ready.', 'lift');
  },
  outcome: 'Maya got the rack, and nobody stopped you mid-set.',
};

const maya: Scenario = {
  name: 'Maya',
  side: 'Waiting for the rack',
  bio: 'Three months into lifting. Wants to squat, but won’t interrupt a stranger to ask.',
  situation: (rackId) =>
    `Marcus is mid-set on Rack ${rackId}. Find out how long he’ll be and get your turn, without a cold ask.`,
  tags: MAYA_TAGS,
  rack: () => ({
    tags: MARCUS_TAGS,
    session: { by: 'phone', setsLeft: 1, lifting: true },
    waiters: [],
    nextWaiterId: 1,
    workIn: NO_WORK_IN,
  }),
  present: { marcus: true, maya: true },
  steps: [
    {
      label: 'Read the rack from where you stand',
      reached: (s) => s.rack.session !== null && !s.rack.session.lifting,
    },
    { label: 'Ask to work in, without a word', reached: (s) => s.mayaWaiter !== null },
    {
      label: 'Work in between his sets',
      reached: (s) =>
        s.rack.workIn.sets > 0 || mayaInLine(s)?.status === 'queued' || !s.rack.session,
    },
    { label: 'Take the rack when it’s your turn', reached: (s) => s.mine === s.rackId },
  ],
  prompt(s) {
    const { session, workIn } = s.rack;
    const me = mayaInLine(s);
    if (s.step === 0) {
      return prompt(
        'Marcus is mid-set. Read the rack: can you ask him now?',
        null,
        'station-status',
      );
    }
    if (s.step === 1) {
      return s.sheet === 'wait'
        ? prompt('He’s open to work in. Pick how you want to wait.', null, 'wait-work-in')
        : prompt('He’s resting. Tap “I’m waiting” on the rack.', null, 'wait-open');
    }
    if (!session) {
      return prompt(`It’s your turn. Tap your phone on Rack ${s.rackId}.`, 'tap-phone');
    }
    if (workIn.lifting)
      return prompt('Your set. The rack tells everyone you’re mid-set.', 'finish-work-in');
    if (me?.status === 'asked') {
      return prompt('Request sent. His phone shows it now, while he rests.', null, 'phone-waiting');
    }
    if (me?.status === 'sharing' && workIn.sets === 0) {
      return prompt('He said yes. Take a set while he rests.', 'work-in', 'phone-waiting');
    }
    return session.lifting
      ? prompt('Marcus takes his last set. You’re next.', null, 'station-facts')
      : prompt('Marcus is wrapping up. You’re next in line.', null, 'station-line');
  },
  outcome: 'You got the rack without a cold ask, and never interrupted a set.',
};

export const SCENARIOS: Record<Persona, Scenario> = { marcus, maya };

/** The furthest step the viewer has reached, never less than before. */
export function reachedStep(state: AppState): number {
  if (!state.role) return 0;
  const { steps } = SCENARIOS[state.role];
  let step = state.step;
  steps.forEach((candidate, index) => {
    if (index >= step && candidate.reached(state)) step = index + 1;
  });
  return step;
}

export function scenarioDone(state: AppState): boolean {
  return state.role !== null && state.step >= SCENARIOS[state.role].steps.length;
}
