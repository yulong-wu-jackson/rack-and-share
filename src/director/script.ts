import { HERO_RACK } from '../floor/racks';
import { GUEST_DEFAULT_SETS } from '../state/model';
import { actions, type Persona } from '../state/store';

/** What a chapter can ask of the stage. Touch and cue targets are `data-touch` or `data-cue` names. */
export interface Cast {
  /** Shows a caption, with a cue on the element it talks about. */
  say(caption: string, cue?: string | null): void;
  wait(ms: number): Promise<void>;
  enter(who: Persona): void;
  leave(who: Persona): void;
  gaze(on: boolean): void;
  touch(who: Persona, target: string, act: () => void): Promise<void>;
  tapPhone(): Promise<void>;
}

export interface Chapter {
  title: string;
  run(cast: Cast): Promise<void>;
}

async function doSet(cast: Cast, ms: number): Promise<void> {
  actions.liftBar();
  await cast.wait(ms);
  actions.rackBar();
  await cast.wait(1300);
}

const HERO_TILE = `floor-rack-${HERO_RACK}`;

export const chapters: Chapter[] = [
  {
    title: 'The floor',
    async run(cast) {
      cast.say('Every rack has a screen. The board by the door shows them all.', 'floor-board');
      await cast.wait(3800);
      cast.say('Each colour says whether to wait, ask, or walk over.', 'floor-legend');
      await cast.wait(3600);
      cast.say(`Rack ${HERO_RACK} is free, so Marcus heads there.`, HERO_TILE);
      await cast.wait(1600);
      await cast.touch('marcus', HERO_TILE, () => actions.enterRack(HERO_RACK));
      await cast.wait(900);
    },
  },
  {
    title: 'Check in',
    async run(cast) {
      cast.say(`Up close, rack ${HERO_RACK} says the same: free.`, 'station-status');
      cast.enter('marcus');
      await cast.wait(2800);
      cast.say('He taps his phone on the rack.', 'phone-beacon');
      await cast.tapPhone();
      await cast.wait(1900);
    },
  },
  {
    title: 'Plan',
    async run(cast) {
      cast.say('He plans three sets.', 'phone-counter');
      await cast.touch('marcus', 'sets-minus', () => actions.adjustSets(-1));
      await cast.wait(250);
      await cast.touch('marcus', 'sets-minus', () => actions.adjustSets(-1));
      await cast.touch('marcus', 'sets-confirm', actions.confirmSets);
      cast.say('The rack shows when it frees up.', 'station-facts');
      await cast.wait(2200);
    },
  },
  {
    title: 'Mid-set',
    async run(cast) {
      cast.say('He lifts the bar. The rack says wait.', 'station-status');
      actions.liftBar();
      await cast.wait(4600);
    },
  },
  {
    title: 'Maya arrives',
    async run(cast) {
      cast.say('Maya wants the same rack.', 'figure-maya');
      cast.enter('maya');
      await cast.wait(2800);
      cast.say('She reads it from where she stands.', 'station-status');
      cast.gaze(true);
      await cast.wait(3400);
      cast.gaze(false);
    },
  },
  {
    title: 'Join the line',
    async run(cast) {
      actions.rackBar();
      cast.say('Set done. Now it is fine to ask.', 'station-status');
      await cast.wait(3000);
      cast.say('She taps "I\'m waiting".', 'wait-open');
      await cast.touch('maya', 'wait-open', () => actions.openSheet('wait'));
      await cast.wait(1700);
      await cast.touch('maya', 'wait-work-in', () => actions.joinLine('work-in'));
      cast.say('She asks to work in.', 'station-line');
      await cast.wait(3600);
    },
  },
  {
    title: 'Work in',
    async run(cast) {
      cast.say('His phone shows her request.', 'phone-request');
      await cast.wait(2200);
      await cast.touch('marcus', 'request-accept', () => actions.answerWorkIn(true));
      cast.say('Marcus shares the rack.', 'station-line');
      await cast.wait(3000);
    },
  },
  {
    title: 'Finish',
    async run(cast) {
      cast.say('Two more sets, and Marcus is done.', 'station-facts');
      await doSet(cast, 2700);
      await doSet(cast, 2700);
      cast.say('He ends his session.', 'end-session');
      await cast.touch('marcus', 'end-session', actions.endSession);
      cast.leave('marcus');
      cast.say('The rack tells Maya it is her turn.', 'station-status');
      await cast.wait(3200);
    },
  },
  {
    title: 'Guide',
    async run(cast) {
      cast.say('New to this rack? The guide is on it.', 'open-guide');
      await cast.touch('maya', 'open-guide', () => actions.openSheet('guide'));
      await cast.wait(4400);
      await cast.touch('maya', 'sheet-close', actions.closeSheet);
      await cast.wait(700);
    },
  },
  {
    title: 'No phone',
    async run(cast) {
      cast.say('Maya has no app. She starts on the screen.', 'guest-open');
      await cast.touch('maya', 'guest-open', () => actions.openSheet('guest'));
      await cast.wait(1800);
      await cast.touch('maya', 'guest-start', () => actions.startGuest(GUEST_DEFAULT_SETS));
      await cast.wait(2600);
      actions.liftBar();
      cast.say('The rack answers before anyone has to ask.', 'station-status');
      await cast.wait(4600);
    },
  },
  {
    title: 'Back to the board',
    async run(cast) {
      actions.showFloor();
      cast.say(`The board now shows rack ${HERO_RACK} taken.`, HERO_TILE);
      await cast.wait(4400);
      cast.say('Now try it yourself.', 'mode-try');
      await cast.wait(2600);
    },
  },
];

/** The chapter in which Marcus first walks up to a rack. */
export const ARRIVAL_CHAPTER = chapters.findIndex((chapter) => chapter.title === 'Check in');
