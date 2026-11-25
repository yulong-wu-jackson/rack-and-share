import { create } from 'zustand';
import * as ambient from '../floor/ambient';
import { type Floor, HERO_RACK, type RackId, seedFloor } from '../floor/racks';
import { reachedStep, SCENARIOS } from '../scenario/scenarios';
import type { Experience, Rack, ToggleTag, WaitKind } from './model';
import * as model from './model';

export type Mode = 'watch' | 'try';
/** The board by the door, or one rack up close. */
export type View = 'floor' | 'rack';
export type Sheet = 'guide' | 'rules' | 'wait' | 'guest' | 'guest-edit';
export type Persona = 'marcus' | 'maya';
export type PhoneScreen = 'setup' | 'ready' | 'session' | 'waiting';
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
  /** Racks running a session the viewer started. They wait for the viewer instead of running on. */
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
  /** Who the viewer plays in Try mode, once they have picked a side. */
  role: Persona | null;
  /** The rack the scenario runs on. The other person only acts while the viewer is there. */
  scenarioRack: RackId | null;
  /** Steps of the scenario done so far. */
  step: number;
  /** The side picker is open over the rack. */
  picker: boolean;
  /** Maya's waiter id at the scenario rack, whether the viewer or the other person plays her. */
  mayaWaiter: number | null;

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
    role: null,
    scenarioRack: null,
    step: 0,
    picker: false,
    mayaWaiter: null,
    sensorPulse: 0,
    nfcPulse: 0,
    sceneCut: 0,
  };
}

/** The scenario on a rack, from its first moment. Any earlier scenario rack is left free. */
function scenarioState(state: AppState, role: Persona, rackId: RackId): Partial<AppState> {
  const scenario = SCENARIOS[role];
  const rack = scenario.rack();
  const floor = { ...leaveRack(state), [rackId]: rack };
  if (state.scenarioRack !== null && state.scenarioRack !== rackId) {
    floor[state.scenarioRack] = model.initialRack;
  }
  return {
    mode: 'try',
    playing: false,
    caption: '',
    cue: null,
    view: 'rack',
    rackId,
    rack,
    floor,
    held: [],
    mine: null,
    name: scenario.name,
    tags: scenario.tags,
    tagsSaved: true,
    sheet: null,
    draftSets: null,
    present: scenario.present,
    atRack: 'marcus',
    // Maya starts by reading the rack from where she stands.
    gaze: role === 'maya',
    touches: { marcus: null, maya: null },
    role,
    scenarioRack: rackId,
    step: 0,
    picker: false,
    mayaWaiter: null,
    sceneCut: state.sceneCut + 1,
  };
}

function stateFromUrl(): AppState {
  const params = new URLSearchParams(window.location.search);
  const mode: Mode = params.get('mode') === 'try' ? 'try' : 'watch';
  const state = initialState(mode);
  const as = params.get('as');
  if (mode !== 'try' || (as !== 'marcus' && as !== 'maya')) return state;
  return { ...state, ...scenarioState(state, as, HERO_RACK) };
}

export const useApp = create<AppState>(stateFromUrl);

const set = useApp.setState;
const get = useApp.getState;

function updateRack(change: (rack: Rack) => Rack): void {
  set((state) => ({ rack: change(state.rack) }));
}

/** Puts the rack in focus back on the floor. */
function leaveRack(state: AppState): Floor {
  return { ...state.floor, [state.rackId]: state.rack };
}

/**
 * Who stands in the rack. The viewer's own session is theirs, someone working in is Maya,
 * and anyone else is drawn as Maya if they started without a phone, else as Marcus.
 */
function lifterAt(rack: Rack, own: boolean, role: Persona | null): Persona {
  if (rack.workIn.lifting) return 'maya';
  if (own && role) return role;
  return rack.session?.by === 'guest' ? 'maya' : 'marcus';
}

function hold(held: RackId[], id: RackId): RackId[] {
  return held.includes(id) ? held : [...held, id];
}

/** Changes the viewer's tags, and the session they are checked in on, wherever it is. */
function updateTags(tags: model.Tags, change: (rack: Rack) => Rack): void {
  set((state) => {
    const { mine, rackId } = state;
    if (mine === null) return { tags };
    if (mine === rackId) return { tags, rack: change(state.rack) };
    return { tags, floor: { ...state.floor, [mine]: change(state.floor[mine]) } };
  });
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

  /** Walks from the board to one rack. In Try mode a new rack first asks which side to play. */
  enterRack(id: RackId): void {
    set((state) => {
      const floor = leaveRack(state);
      const rack = floor[id];
      return {
        view: 'rack',
        rackId: id,
        rack,
        floor,
        picker: state.mode === 'try' && state.scenarioRack !== id,
        sheet: null,
        draftSets: null,
        atRack: lifterAt(rack, state.mine === id, state.role),
        touches: { marcus: null, maya: null },
        sceneCut: state.sceneCut + 1,
      };
    });
  },
  /** Plays one side of the scenario on the rack in focus, or on `rackId`. */
  startScenario(role: Persona, rackId?: RackId): void {
    set((state) => scenarioState(state, role, rackId ?? state.rackId));
  },
  /** Moves the scenario on to the furthest step the viewer has reached. */
  syncStep(): void {
    set((state) => {
      const step = reachedStep(state);
      return step === state.step ? state : { step };
    });
  },
  closePicker(): void {
    actions.showFloor();
  },
  showFloor(): void {
    set((state) => ({
      view: 'floor',
      picker: false,
      floor: leaveRack(state),
      sheet: null,
      draftSets: null,
      touches: { marcus: null, maya: null },
    }));
  },
  /** One second passes for every rack except those running the viewer's sessions. */
  tickFloor(): void {
    set((state) => {
      if (state.mode === 'watch' && !state.playing) return state;
      const { rackId, rack, held } = state;
      // Up close, a free rack waits for the viewer. Anyone else's workout carries on.
      const waits = state.view === 'rack' && !rack.session;
      const floor = { ...state.floor, [rackId]: rack };
      // The scenario rack only changes through the viewer and the person they share it with.
      const skip = [...held];
      if (waits) skip.push(rackId);
      if (state.scenarioRack !== null) skip.push(state.scenarioRack);
      const next = ambient.tick(floor, state.beats, skip);
      if (!next.changed) return { beats: next.beats };
      const focused = next.floor[rackId];
      if (focused === rack) return { floor: next.floor, beats: next.beats };
      return {
        floor: next.floor,
        beats: next.beats,
        rack: focused,
        atRack: lifterAt(focused, state.mine === rackId, state.role),
      };
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
        held: checkIn ? hold(state.held, state.rackId) : state.held,
        atRack: checkIn ? (state.role ?? 'marcus') : state.atRack,
        sheet: null,
        nfcPulse: state.nfcPulse + 1,
      };
    });
  },
  startGuest(sets: number, tags?: model.Tags): void {
    set((state) => {
      const rack = model.startGuest(state.rack, sets, tags);
      return {
        rack,
        held: rack === state.rack ? state.held : hold(state.held, state.rackId),
        atRack: 'maya',
        sheet: null,
      };
    });
  },
  updateGuestSettings(sets: number, tags: model.Tags): void {
    set((state) => ({ rack: model.updateGuestSettings(state.rack, sets, tags), sheet: null }));
  },
  endSession(): void {
    set((state) => ({
      rack: model.endSession(state.rack),
      mine: state.mine === state.rackId ? null : state.mine,
      held: state.held.filter((id) => id !== state.rackId),
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

  /** The viewer joins the line. Playing Maya, that place in line is hers. */
  joinLine(kind: WaitKind): void {
    set((state) => {
      if (state.role === 'maya') return { ...mayaJoins(state, kind), sheet: null };
      return { rack: model.joinLine(state.rack, kind), sheet: null };
    });
  },
  /** Maya, as the other person, asks the viewer's rack to work in. */
  mayaAsks(): void {
    set((state) => mayaJoins(state, 'work-in'));
  },
  leaveLine(id: number): void {
    updateRack((rack) => model.leaveLine(rack, id));
  },
  answerWorkIn(accept: boolean): void {
    updateRack((rack) => model.answerWorkIn(rack, accept));
  },
  /** The person working in takes a set during the lifter's rest. */
  startWorkIn(): void {
    set((state) => {
      const rack = model.startWorkIn(state.rack);
      if (rack === state.rack) return state;
      return { rack, atRack: 'maya', sheet: null, sensorPulse: state.sensorPulse + 1 };
    });
  },
  finishWorkIn(): void {
    set((state) => {
      const rack = model.finishWorkIn(state.rack);
      if (rack === state.rack) return state;
      const atRack = lifterAt(rack, state.mine === state.rackId, state.role);
      return { rack, atRack, sensorPulse: state.sensorPulse + 1 };
    });
  },
  /** Maya, as the other person, starts on the rack without a phone. */
  mayaTakesRack(): void {
    set((state) => {
      const rack = model.startGuest(state.rack, model.GUEST_DEFAULT_SETS, SCENARIOS.maya.tags);
      return rack === state.rack ? state : { rack, atRack: 'maya' };
    });
  },
  arrive(who: Persona): void {
    set((state) => ({ present: { ...state.present, [who]: true } }));
  },
  leave(who: Persona): void {
    set((state) => ({ present: { ...state.present, [who]: false } }));
  },
  setGaze(on: boolean): void {
    set({ gaze: on });
  },

  openSheet(sheet: Sheet): void {
    set({ sheet });
  },
  closeSheet(): void {
    set({ sheet: null });
  },
};

function mayaJoins(state: AppState, kind: WaitKind): Partial<AppState> {
  const inLine = state.rack.waiters.some((waiter) => waiter.id === state.mayaWaiter);
  if (inLine) return {};
  const rack = model.joinLine(state.rack, kind);
  if (rack === state.rack) return {};
  return { rack, mayaWaiter: state.rack.nextWaiterId };
}

export function phoneScreen(state: AppState): PhoneScreen {
  if (state.mine === state.rackId) return 'session';
  if (state.role === 'maya' && state.rackId === state.scenarioRack) {
    const inLine = state.rack.waiters.some((waiter) => waiter.id === state.mayaWaiter);
    if (inLine) return 'waiting';
  }
  return state.tagsSaved ? 'ready' : 'setup';
}

/** The rack the viewer's phone is checked in on, when that is not the rack in focus. */
export function checkedInElsewhere(state: AppState): RackId | null {
  return state.mine === state.rackId ? null : state.mine;
}

/** Whether the session at the rack in focus is one the viewer started, by phone or at the station. */
export function ownSession(state: AppState): boolean {
  return state.held.includes(state.rackId);
}

export function lifterName(state: AppState): string {
  // Anyone else in the rack is someone the viewer does not know.
  if (!ownSession(state)) return 'The lifter';
  return state.atRack === 'marcus' ? state.name.trim() || 'Marcus' : 'Maya';
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
