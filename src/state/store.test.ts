import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HERO_RACK } from '../floor/racks';
import { initialRack } from './model';

// The store reads the mode from the URL when it loads.
vi.hoisted(() => {
  vi.stubGlobal('window', { location: { search: '' } });
});

const { actions, lifterName, phoneScreen, spots, useApp } = await import('./store');

const state = useApp.getState;

function phoneSession(): void {
  actions.reset('try');
  actions.phoneTap();
}

describe('set count preview', () => {
  beforeEach(phoneSession);

  it('changes the rack only after confirming', () => {
    actions.adjustSets(-1);
    actions.adjustSets(-1);
    expect(state().draftSets).toBe(3);
    expect(state().rack.session?.setsLeft).toBe(5);

    actions.confirmSets();
    expect(state().draftSets).toBeNull();
    expect(state().rack.session?.setsLeft).toBe(3);
  });

  it('drops the preview on undo or when it matches the saved count', () => {
    actions.adjustSets(1);
    actions.undoSets();
    expect(state().draftSets).toBeNull();

    actions.adjustSets(1);
    actions.adjustSets(-1);
    expect(state().draftSets).toBeNull();
    expect(state().rack.session?.setsLeft).toBe(5);
  });

  it('counts a set started before confirming against the preview', () => {
    actions.adjustSets(-2);
    actions.liftBar();
    expect(state().rack.session?.setsLeft).toBe(4);
    expect(state().draftSets).toBe(2);
  });

  it('counts a set started from zero against a raised preview', () => {
    actions.adjustSets(-5);
    actions.confirmSets();
    actions.adjustSets(2);
    actions.liftBar();
    expect(state().rack.session?.setsLeft).toBe(0);
    expect(state().draftSets).toBe(1);
  });

  it('drops a zero preview once the last set starts', () => {
    actions.adjustSets(-4);
    actions.confirmSets();
    actions.adjustSets(-1);
    actions.liftBar();
    expect(state().rack.session?.setsLeft).toBe(0);
    expect(state().draftSets).toBeNull();
  });

  it('ignores the phone stepper during a guest session', () => {
    actions.endSession();
    actions.startGuest(3);
    actions.adjustSets(-1);
    expect(state().draftSets).toBeNull();
  });
});

describe('spots', () => {
  beforeEach(() => {
    actions.reset('try');
    actions.startGuest(3);
  });

  it('sends the guest, not the other person, to edit their settings', () => {
    actions.openSheet('guest-edit');
    expect(spots(state())).toEqual({ maya: 'station', marcus: 'side' });
  });

  it('keeps everyone away from the screen while it shows mid-set', () => {
    actions.openSheet('rules');
    expect(spots(state()).marcus).toBe('station');

    actions.liftBar();
    expect(spots(state())).toEqual({ maya: 'rack', marcus: 'side' });
  });
});

describe('floor and racks', () => {
  beforeEach(() => actions.reset('try'));

  it('starts on the board and walks into a rack with its own state', () => {
    expect(state().view).toBe('floor');
    actions.enterRack(2);
    expect(state().view).toBe('rack');
    expect(state().rackId).toBe(2);
    expect(state().rack).toBe(state().floor[2]);
  });

  it('keeps a rack as it was left when walking back to the board', () => {
    actions.enterRack(3);
    actions.phoneTap();
    actions.showFloor();
    expect(state().floor[3].session?.by).toBe('phone');

    actions.enterRack(1);
    expect(state().rack.session?.lifting).toBe(true);
    actions.enterRack(3);
    expect(state().rack.session?.by).toBe('phone');
  });

  it('keeps your tags when you walk past another lifter', () => {
    actions.setTag('questions', true);
    actions.enterRack(4);
    expect(state().rack.tags.questions).toBe(false);
    actions.showFloor();
    actions.enterRack(3);
    actions.phoneTap();
    expect(state().rack.tags.questions).toBe(true);
  });

  it("keeps another lifter's phone session off your phone", () => {
    actions.saveTags();
    actions.enterRack(2);
    expect(phoneScreen(state())).toBe('ready');
    expect(lifterName(state())).toBe('The lifter');
  });

  it('checks your phone in on one rack at a time', () => {
    actions.enterRack(3);
    actions.phoneTap();
    useApp.setState((current) => ({ floor: { ...current.floor, 4: initialRack } }));
    actions.enterRack(4);
    actions.phoneTap();
    expect(state().rack.session).toBeNull();
    expect(state().mine).toBe(3);
  });

  it('holds the rack running your session and runs the rest', () => {
    actions.enterRack(3);
    actions.phoneTap();
    const mine = state().rack;
    actions.enterRack(2);
    actions.joinLine('work-in');
    actions.showFloor();
    const before = state().floor;
    for (let second = 0; second < 40; second += 1) actions.tickFloor();
    expect(state().held).toEqual([HERO_RACK]);
    expect(state().floor[HERO_RACK]).toBe(mine);
    expect(state().floor[2]).not.toBe(before[2]);
  });

  it('applies tag changes to your session while you are away from it', () => {
    actions.enterRack(3);
    actions.phoneTap();
    actions.enterRack(2);
    actions.setTag('workIn', false);
    expect(state().floor[HERO_RACK].tags.workIn).toBe(false);
    expect(state().rack.tags.workIn).toBe(true);
  });

  it('runs the rack in focus while the viewer is on the board', () => {
    for (let second = 0; second < 40; second += 1) actions.tickFloor();
    expect(state().floor[HERO_RACK].session).not.toBeNull();
    expect(state().rack).toBe(state().floor[HERO_RACK]);
  });
});
