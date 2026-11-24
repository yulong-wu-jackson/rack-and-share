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
