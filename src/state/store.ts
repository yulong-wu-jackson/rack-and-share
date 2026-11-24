import { create } from 'zustand';
import * as ambient from '../floor/ambient';
import { type Floor, HERO_RACK, type RackId, seedFloor } from '../floor/racks';
import type { Experience, Rack, ToggleTag, WaitKind } from './model';
import * as model from './model';

export type Mode = 'watch' | 'try';
/** The board by the door, or one rack up close. */
export type View = 'floor' | 'rack';
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
  view: View;
  /** The rack in focus. `rack` is its live state; `floor` holds the others. */
  rackId: RackId;
  rack: Rack;
  floor: Floor;
  beats: ambient.Beats;
  /** Racks the viewer has changed. They wait for the viewer instead of running on their own. */
  held: RackId[];
  /** The rack the viewer's phone is checked in on. */
  mine: RackId | null;
  name: string;
  /** The viewer's own tags. A rack takes them when the viewer's phone checks in there. */
  tags: model.Tags;
  tagsSaved: boolean;
  sheet: Sheet | null;
  draftSets: number | null;

  mode: Mode;
  playing: boolean;
  chapter: number;
  caption: string;
  /** The `data-cue` (or `data-touch`) name of the element the caption talks about. */
  cue: string | null;

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
  const floor = seedFloor(model.initialRack);
  return {
    view: 'floor',
    rackId: HERO_RACK,
    rack: floor[HERO_RACK],
    floor,
    beats: ambient.initialBeats(),
    held: [],
    mine: null,
    name: 'Marcus',
    tags: watching ? WATCH_TAGS : model.initialRack.tags,
    tagsSaved: watching,
    sheet: null,
    draftSets: null,
    mode,
    playing: watching,
    chapter: 0,
    caption: '',
    cue: null,
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

/** Puts the rack in focus back on the floor, and holds it there if the viewer changed it. */
function leaveRack(state: AppState): Pick<AppState, 'floor' | 'held'> {
  const { rackId, rack } = state;
  if (rack === state.floor[rackId]) return { floor: state.floor, held: state.held };
  return {
    floor: { ...state.floor, [rackId]: rack },
    held: state.held.includes(rackId) ? state.held : [...state.held, rackId],
  };
}

/** Changes the viewer's tags, and their live session's too when they are at it. */
function updateTags(tags: model.Tags, change: (rack: Rack) => Rack): void {
  set((state) => ({
    tags,
    rack: state.mine === state.rackId ? change(state.rack) : state.rack,
  }));
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
      cue: null,
      gaze: false,
      touches: { marcus: null, maya: null },
      present: { marcus: true, maya: true },
    });
  },

  /** Walks from the board to one rack. */
  enterRack(id: RackId): void {
    set((state) => {
      const { floor, held } = leaveRack(state);
      const rack = floor[id];
      return {
        view: 'rack',
        rackId: id,
        rack,
        floor,
        held,
        sheet: null,
        draftSets: null,
        atRack: rack.session?.by === 'guest' ? 'maya' : 'marcus',
        touches: { marcus: null, maya: null },
        sceneCut: state.sceneCut + 1,
      };
    });
  },
  showFloor(): void {
    set((state) => ({
      view: 'floor',
      ...leaveRack(state),
      sheet: null,
      draftSets: null,
      touches: { marcus: null, maya: null },
    }));
  },
  /** One second passes for every rack the viewer is not standing at and has not changed. */
  tickFloor(): void {
    set((state) => {
      if (state.mode === 'watch' && !state.playing) return state;
      const upClose = state.view === 'rack';
      const skip = upClose ? [state.rackId, ...state.held] : state.held;
      const next = ambient.tick(state.floor, state.beats, skip);
      if (!next.changed) return { beats: next.beats };
      // On the board, the rack last in focus runs like the others.
      const rack = upClose ? state.rack : next.floor[state.rackId];
      return { floor: next.floor, beats: next.beats, rack };
    });
  },

  setName(name: string): void {
    set({ name });
  },
  setExperience(experience: Experience): void {
    updateTags({ ...get().tags, experience }, (rack) => model.setExperience(rack, experience));
  },
  setTag(tag: ToggleTag, on: boolean): void {
    updateTags({ ...get().tags, [tag]: on }, (rack) => model.setTag(rack, tag, on));
  },
  saveTags(): void {
    set({ tagsSaved: true });
  },
  editTags(): void {
    set({ tagsSaved: false });
  },

  /** Checks the viewer in with their tags, if the rack is free and the phone is not in use elsewhere. */
  phoneTap(): void {
    set((state) => {
      const checkIn = !state.rack.session && state.mine === null;
      return {
        rack: checkIn ? model.checkIn({ ...state.rack, tags: state.tags }) : state.rack,
        mine: checkIn ? state.rackId : state.mine,
        atRack: checkIn ? 'marcus' : state.atRack,
        sheet: null,
        nfcPulse: state.nfcPulse + 1,
      };
    });
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
      mine: state.mine === state.rackId ? null : state.mine,
      draftSets: null,
      sheet: state.sheet === 'guest-edit' ? null : state.sheet,
    }));
  },

  liftBar(): void {
    set((state) => {
      const rack = model.liftBar(state.rack);
      // A new set uses up one of the previewed sets too.
      const draft =
        state.draftSets === null || rack === state.rack
          ? state.draftSets
          : Math.max(0, state.draftSets - 1);
      return {
        rack,
        draftSets: draft === rack.session?.setsLeft ? null : draft,
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
  if (state.mine === state.rackId) return 'session';
  return state.tagsSaved ? 'ready' : 'setup';
}

/** The rack the viewer's phone is checked in on, when that is not the rack in focus. */
export function checkedInElsewhere(state: AppState): RackId | null {
  return state.mine === state.rackId ? null : state.mine;
}

export function lifterName(state: AppState): string {
  if (state.atRack === 'maya') return 'Maya';
  // Another lifter's phone session belongs to someone the viewer does not know.
  return state.mine === state.rackId ? state.name.trim() || 'Marcus' : 'The lifter';
}

/** Where each person stands, worked out from the rack and the open sheet. */
export function spots(state: AppState): Record<Persona, Spot> {
  const first = state.atRack;
  const other: Persona = first === 'marcus' ? 'maya' : 'marcus';
  const result: Record<Persona, Spot> = { marcus: 'away', maya: 'away' };
  const session = state.rack.session;
  // Mid-set the screen hides any open sheet, so nobody is using it.
  const usingScreen = state.sheet !== null && !session?.lifting;
  // A guest edits their own settings; any other sheet is for whoever is not lifting.
  const lifterAtScreen = usingScreen && state.sheet === 'guest-edit';
  const otherHere = state.present[other];
  const sharing = state.rack.waiters.some((waiter) => waiter.status === 'sharing');

  if (otherHere) {
    result[other] = usingScreen && !lifterAtScreen ? 'station' : sharing ? 'near' : 'side';
  }
  if (state.present[first]) {
    if (session) {
      // Otherwise the lifter only steps out to the screen when nobody else is there to use it.
      result[first] = lifterAtScreen || (usingScreen && !otherHere) ? 'station' : 'rack';
    } else if (usingScreen) {
      result[first] = otherHere ? 'near' : 'station';
    } else {
      // Not checked in yet: they stand at the screen, and the rack stays visibly free.
      result[first] = 'front';
    }
  }
  return result;
}
