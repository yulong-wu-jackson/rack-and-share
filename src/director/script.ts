import { GUEST_DEFAULT_SETS } from '../state/model';
import { actions, type Persona } from '../state/store';

/** What a chapter can ask of the stage. Touch targets are `data-touch` names. */
export interface Cast {
  say(caption: string): void;
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

export const chapters: Chapter[] = [
  {
    title: 'Check in',
    async run(cast) {
      cast.say('Marcus gets to rack 3. It is free.');
      cast.enter('marcus');
      await cast.wait(2800);
      cast.say('He taps his phone on the rack.');
      await cast.tapPhone();
      await cast.wait(1900);
    },
  },
  {
    title: 'Plan',
    async run(cast) {
      cast.say('He plans three sets.');
      await cast.touch('marcus', 'sets-minus', () => actions.adjustSets(-1));
      await cast.wait(250);
      await cast.touch('marcus', 'sets-minus', () => actions.adjustSets(-1));
      await cast.wait(2600);
    },
  },
  {
    title: 'Mid-set',
    async run(cast) {
      cast.say('He lifts the bar. The rack says wait.');
      actions.liftBar();
      await cast.wait(4600);
    },
  },
  {
    title: 'Maya arrives',
    async run(cast) {
      cast.say('Maya wants the same rack.');
      cast.enter('maya');
      await cast.wait(2800);
      cast.say('She reads it from where she stands.');
      cast.gaze(true);
      await cast.wait(3400);
      cast.gaze(false);
    },
  },
  {
    title: 'Join the line',
    async run(cast) {
      cast.say('She taps "I\'m waiting".');
      await cast.touch('maya', 'wait-open', () => actions.openSheet('wait'));
      await cast.wait(1700);
      await cast.touch('maya', 'wait-work-in', () => actions.joinLine('work-in'));
      cast.say('Her request waits for his next rest.');
      await cast.wait(3600);
    },
  },
  {
    title: 'Rest',
    async run(cast) {
      actions.rackBar();
      cast.say('Set done. Now it is fine to ask.');
      await cast.wait(3000);
      cast.say('His phone shows her request.');
      await cast.wait(2200);
      await cast.touch('marcus', 'request-accept', () => actions.answerWorkIn(true));
      cast.say('Marcus shares the rack.');
      await cast.wait(3000);
    },
  },
  {
    title: 'Finish',
    async run(cast) {
      cast.say('Two more sets, and Marcus is done.');
      await doSet(cast, 2700);
      await doSet(cast, 2700);
      await cast.touch('marcus', 'end-session', actions.endSession);
      cast.leave('marcus');
      cast.say('The rack tells Maya it is her turn.');
      await cast.wait(3200);
    },
  },
  {
    title: 'Guide',
    async run(cast) {
      cast.say('New to this rack? The guide is on it.');
      await cast.touch('maya', 'open-guide', () => actions.openSheet('guide'));
      await cast.wait(4400);
      await cast.touch('maya', 'sheet-close', actions.closeSheet);
      await cast.wait(700);
    },
  },
  {
    title: 'No phone',
    async run(cast) {
      cast.say('Maya has no app. She starts on the screen.');
      await cast.touch('maya', 'guest-open', () => actions.openSheet('guest'));
      await cast.wait(1800);
      await cast.touch('maya', 'guest-start', () => actions.startGuest(GUEST_DEFAULT_SETS, true));
      await cast.wait(2600);
      actions.liftBar();
      cast.say('The rack answers before anyone has to ask.');
      await cast.wait(5200);
      cast.say('Now try it yourself.');
      await cast.wait(2400);
    },
  },
];
