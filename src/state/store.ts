import { create } from 'zustand';
import type { Experience, Rack, ToggleTag, WaitKind } from './model';
import * as model from './model';

export type Mode = 'watch' | 'try';
export type Sheet = 'guide' | 'rules' | 'wait' | 'guest' | 'guest-edit';
export type Persona = 'marcus' | 'maya';
export type PhoneScreen = 'setup' | 'ready' | 'session';
export type Spot = 'rack' | 'front' | 'station' | 'near' | 'side' | 'away';

export interface Touch {
  x: number;
  y: number;
  pressed: boolean;
}

export interface AppState {
  rack: Rack;
  name: string;
  tagsSaved: boolean;
  sheet: Sheet | null;
  draftSets: number | null;

  mode: Mode;
  playing: boolean;
  chapter: number;
  caption: string;

  /** Who is on the gym floor, and who stands in the rack. */
  present: Record<Persona, boolean>;
  atRack: Persona;
  gaze: boolean;
  touches: Record<Persona, Touch | null>;
  /** Counters that restart one-shot effects each time they change. */
  sensorPulse: number;
  nfcPulse: number;
  sceneCut: number;
}

const WATCH_TAGS: model.Tags = {
  experience: 'experienced',
  workIn: true,
  spot: true,
  questions: false,
};

function initialState(mode: Mode): AppState {
  const watching = mode === 'watch';
  return {
    rack: watching ? { ...model.initialRack, tags: WATCH_TAGS } : model.initialRack,
    name: 'Marcus',
    tagsSaved: watching,
    sheet: null,
    draftSets: null,
    mode,
    playing: watching,
    chapter: 0,
    caption: '',
    present: { marcus: !watching, maya: !watching },
    atRack: 'marcus',
    gaze: false,
    touches: { marcus: null, maya: null },
    sensorPulse: 0,
    nfcPulse: 0,
    sceneCut: 0,
  };
}

function modeFromUrl(): Mode {
  return new URLSearchParams(window.location.search).get('mode') === 'try' ? 'try' : 'watch';
}

export const useApp = create<AppState>(() => initialState(modeFromUrl()));

const set = useApp.setState;
const get = useApp.getState;

function updateRack(change: (rack: Rack) => Rack): void {
  set((state) => ({ rack: change(state.rack) }));
}

export const actions = {
  reset(mode: Mode): void {
    set({ ...initialState(mode), sceneCut: get().sceneCut + 1 });
  },

  /** Hands a running story over to the viewer without changing the rack. */
  takeOver(): void {
    set({
      mode: 'try',
      playing: false,
      caption: '',
      gaze: false,
      touches: { marcus: null, maya: null },
      present: { marcus: true, maya: true },
    });
  },

  setName(name: string): void {
    set({ name });
  },
  setExperience(experience: Experience): void {
    updateRack((rack) => model.setExperience(rack, experience));
  },
  setTag(tag: ToggleTag, on: boolean): void {
    updateRack((rack) => model.setTag(rack, tag, on));
  },
  saveTags(): void {
    set({ tagsSaved: true });
  },
  editTags(): void {
    set({ tagsSaved: false });
  },

  phoneTap(): void {
    set((state) => ({
      rack: model.checkIn(state.rack),
      atRack: state.rack.session ? state.atRack : 'marcus',
      sheet: null,
      nfcPulse: state.nfcPulse + 1,
    }));
  },
  startGuest(sets: number, tags?: model.Tags): void {
    set((state) => ({
      rack: model.startGuest(state.rack, sets, tags),
      atRack: 'maya',
      sheet: null,
    }));
  },
  updateGuestSettings(sets: number, tags: model.Tags): void {
    set((state) => ({ rack: model.updateGuestSettings(state.rack, sets, tags), sheet: null }));
  },
  endSession(): void {
    set((state) => ({
      rack: model.endSession(state.rack),
      draftSets: null,
      sheet: state.sheet === 'guest-edit' ? null : state.sheet,
    }));
  },

  liftBar(): void {
    set((state) => {
      const rack = model.liftBar(state.rack);
      // A new set makes the unconfirmed count stale.
      return {
        rack,
        draftSets: rack === state.rack ? state.draftSets : null,
        sensorPulse: state.sensorPulse + 1,
      };
    });
  },
  rackBar(): void {
    set((state) => ({
      rack: model.rackBar(state.rack),
      sensorPulse: state.sensorPulse + 1,
    }));
  },

  adjustSets(delta: number): void {
    set((state) => {
      const session = state.rack.session;
      if (session?.by !== 'phone') return state;
      const sets = Math.min(
        model.MAX_SETS,
        Math.max(0, (state.draftSets ?? session.setsLeft) + delta),
      );
      return { draftSets: sets === session.setsLeft ? null : sets };
    });
  },
  confirmSets(): void {
    set((state) =>
      state.draftSets === null
        ? state
        : { rack: model.setSets(state.rack, state.draftSets), draftSets: null },
    );
  },
  undoSets(): void {
    set({ draftSets: null });
  },

  joinLine(kind: WaitKind): void {
    set((state) => ({ rack: model.joinLine(state.rack, kind), sheet: null }));
  },
  leaveLine(id: number): void {
    updateRack((rack) => model.leaveLine(rack, id));
  },
  answerWorkIn(accept: boolean): void {
    updateRack((rack) => model.answerWorkIn(rack, accept));
  },

  openSheet(sheet: Sheet): void {
    set({ sheet });
  },
  closeSheet(): void {
    set({ sheet: null });
  },
};

export function phoneScreen(state: AppState): PhoneScreen {
  if (state.rack.session?.by === 'phone') return 'session';
  return state.tagsSaved ? 'ready' : 'setup';
}

export function lifterName(state: AppState): string {
  return state.atRack === 'marcus' ? state.name.trim() || 'Marcus' : 'Maya';
}

/** Where each person stands, worked out from the rack and the open sheet. */
export function spots(state: AppState): Record<Persona, Spot> {
  const first = state.atRack;
  const other: Persona = first === 'marcus' ? 'maya' : 'marcus';
  const result: Record<Persona, Spot> = { marcus: 'away', maya: 'away' };
  const session = state.rack.session;
  const usingScreen = state.sheet !== null;
  const otherHere = state.present[other];
  const sharing = state.rack.waiters.some((waiter) => waiter.status === 'sharing');

  if (otherHere) {
    result[other] = usingScreen ? 'station' : sharing ? 'near' : 'side';
  }
  if (state.present[first]) {
    if (session) {
      // The lifter only steps out to the screen when nobody else is there to use it.
      result[first] = usingScreen && !otherHere && !session.lifting ? 'station' : 'rack';
    } else if (usingScreen) {
      result[first] = otherHere ? 'near' : 'station';
    } else {
      // Not checked in yet: they stand at the screen, and the rack stays visibly free.
      result[first] = 'front';
    }
  }
  return result;
}
