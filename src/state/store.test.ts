import { beforeEach, describe, expect, it, vi } from 'vitest';

// The store reads the mode from the URL when it loads.
vi.hoisted(() => {
  vi.stubGlobal('window', { location: { search: '' } });
});

const { actions, spots, useApp } = await import('./store');

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

  it('brings your saved tags to a rack nobody has checked in on', () => {
    actions.setTag('questions', true);
    actions.enterRack(4);
    expect(state().rack.tags.questions).toBe(false);
    actions.showFloor();
    actions.enterRack(3);
    expect(state().rack.tags.questions).toBe(false);
  });

  it('only runs the racks the viewer has not walked up to', () => {
    actions.enterRack(1);
    const rack1 = state().floor[1];
    actions.showFloor();
    for (let second = 0; second < 40; second += 1) actions.tickFloor();
    expect(state().floor[1]).toBe(state().rack);
    expect(state().held).toEqual([1]);
    expect(state().floor[1].session).toEqual(rack1.session);
  });
});
