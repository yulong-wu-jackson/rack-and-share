import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HERO_RACK } from '../floor/racks';
import { rackStatus } from '../state/model';

// The store reads the mode from the URL when it loads.
vi.hoisted(() => {
  vi.stubGlobal('window', { location: { search: '' } });
});

const { actions, phoneScreen, useApp } = await import('../state/store');
const { scenarioDone } = await import('./scenarios');

const state = useApp.getState;

/** Runs an action, then catches the step up as the scenario runner does. */
function act(run: () => void): void {
  run();
  actions.syncStep();
}

describe('picking a side', () => {
  beforeEach(() => actions.reset('try'));

  it('asks which side to play on entering a rack in Try mode', () => {
    actions.enterRack(5);
    expect(state().picker).toBe(true);

    actions.startScenario('maya');
    expect(state()).toMatchObject({ picker: false, role: 'maya', scenarioRack: 5, step: 0 });
  });

  it('stages the same moment whatever the board showed', () => {
    actions.enterRack(1);
    actions.startScenario('marcus');
    expect(rackStatus(state().rack)).toBe('free');

    actions.startScenario('maya');
    expect(rackStatus(state().rack)).toBe('mid-set');
    expect(state().name).toBe('Maya');
  });

  it('resumes the scenario on returning to its rack', () => {
    actions.enterRack(HERO_RACK);
    actions.startScenario('maya');
    actions.showFloor();
    actions.enterRack(HERO_RACK);
    expect(state().picker).toBe(false);
  });
});

describe('playing Maya', () => {
  beforeEach(() => {
    actions.reset('try');
    actions.enterRack(HERO_RACK);
    actions.startScenario('maya');
  });

  it('runs from reading the rack to taking it', () => {
    act(actions.rackBar);
    expect(state().step).toBe(1);

    act(() => actions.joinLine('work-in'));
    expect(state().step).toBe(2);
    expect(phoneScreen(state())).toBe('waiting');

    act(() => actions.answerWorkIn(true));
    act(actions.startWorkIn);
    expect(rackStatus(state().rack)).toBe('mid-set');
    expect(state().atRack).toBe('maya');

    act(actions.finishWorkIn);
    expect(state().step).toBe(3);
    expect(state().atRack).toBe('marcus');

    act(actions.endSession);
    expect(rackStatus(state().rack)).toBe('your-turn');
    act(actions.phoneTap);
    expect(state().atRack).toBe('maya');
    expect(scenarioDone(state())).toBe(true);
  });

  it('keeps one place in line', () => {
    actions.rackBar();
    actions.joinLine('work-in');
    actions.joinLine('turn');
    expect(state().rack.waiters).toHaveLength(1);
  });
});

describe('playing Marcus', () => {
  beforeEach(() => {
    actions.reset('try');
    actions.enterRack(HERO_RACK);
    actions.startScenario('marcus');
  });

  it('runs from checking in to handing the rack over', () => {
    act(actions.phoneTap);
    expect(state().step).toBe(1);

    actions.adjustSets(-2);
    act(actions.confirmSets);
    expect(state().step).toBe(2);

    act(actions.liftBar);
    expect(state().step).toBe(3);

    // Maya asks mid-set, and the request waits for the rest.
    act(actions.mayaAsks);
    act(actions.rackBar);
    act(() => actions.answerWorkIn(true));
    expect(state().step).toBe(4);

    act(actions.endSession);
    expect(scenarioDone(state())).toBe(true);
  });

  it('keeps him on the hooks while Maya works in', () => {
    actions.phoneTap();
    actions.mayaAsks();
    actions.answerWorkIn(true);
    actions.startWorkIn();
    actions.liftBar();
    expect(state().rack.session?.lifting).toBe(false);
  });
});
