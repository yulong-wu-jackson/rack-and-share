import { toStage } from '../stage/geometry';
import { flyPhoneToStation } from '../stage/phoneTap';
import { actions, type Persona, useApp } from '../state/store';
import { Cancelled, Clock } from './clock';
import { type Cast, chapters } from './script';

const set = useApp.setState;
const get = useApp.getState;

let clock = new Clock();

function findTarget(name: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-touch="${name}"]`);
}

/** Waits a few frames for a control that the last action is still rendering. */
async function waitForTarget(name: string, story: Clock): Promise<HTMLElement | null> {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const target = findTarget(name);
    if (target) return target;
    await story.sleep(16);
  }
  return null;
}

function placeTouch(who: Persona, target: HTMLElement, pressed: boolean): void {
  const box = toStage(target.getBoundingClientRect());
  const touch = {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
    pressed,
  };
  set((state) => ({ touches: { ...state.touches, [who]: touch } }));
}

function liftTouch(who: Persona): void {
  set((state) => ({ touches: { ...state.touches, [who]: null } }));
}

function makeCast(story: Clock): Cast {
  return {
    say(caption, cue = null) {
      set({ caption, cue });
    },
    wait(ms) {
      return story.sleep(ms);
    },
    enter(who) {
      set((state) => ({ present: { ...state.present, [who]: true } }));
    },
    leave(who) {
      set((state) => ({ present: { ...state.present, [who]: false } }));
    },
    gaze(on) {
      set({ gaze: on });
    },
    async touch(who, name, act) {
      if (story.instant) {
        act();
        return;
      }
      const target = await waitForTarget(name, story);
      if (target) {
        placeTouch(who, target, false);
        await story.sleep(620);
        placeTouch(who, target, true);
        await story.sleep(180);
      }
      act();
      // Once the finger has pressed what the cue pointed at, the cue has done its job.
      if (get().cue === name) set({ cue: null });
      await story.sleep(260);
      liftTouch(who);
    },
    async tapPhone() {
      if (story.instant) {
        actions.phoneTap();
        return;
      }
      // The phone is already in the air when a story is cancelled, so the tap must check.
      await flyPhoneToStation(() => {
        if (!story.cancelled) actions.phoneTap();
      });
      story.check();
    },
  };
}

async function run(from: number): Promise<void> {
  clock.cancel();
  const story = new Clock();
  clock = story;
  actions.reset('watch');
  const cast = makeCast(story);

  try {
    story.instant = true;
    for (const chapter of chapters.slice(0, from)) await chapter.run(cast);
    story.instant = false;
    set((state) => ({ sceneCut: state.sceneCut + 1 }));

    for (let index = from; index < chapters.length; index += 1) {
      set({ chapter: index });
      await chapters[index].run(cast);
    }
    actions.reset('try');
  } catch (error) {
    if (!(error instanceof Cancelled)) throw error;
  }
}

export const director = {
  play(from = 0): void {
    void run(from);
  },
  togglePause(): void {
    clock.paused = !clock.paused;
    set({ playing: !clock.paused });
  },
  jump(offset: number): void {
    const target = get().chapter + offset;
    director.play(Math.min(chapters.length - 1, Math.max(0, target)));
  },
  /** Stops the story and leaves the rack as it is for the viewer. */
  handOver(): void {
    clock.cancel();
    actions.takeOver();
  },
};
