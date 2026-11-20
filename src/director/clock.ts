export class Cancelled extends Error {}

/** Story time: it stops while paused, skips ahead while instant, and ends when cancelled. */
export class Clock {
  paused = false;
  instant = false;
  cancelled = false;

  cancel(): void {
    this.cancelled = true;
  }

  /** Throws once the story has been cancelled. Call it after awaiting anything else. */
  check(): void {
    if (this.cancelled) throw new Cancelled();
  }

  sleep(ms: number): Promise<void> {
    this.check();
    if (this.instant) return Promise.resolve();
    return new Promise((resolve, reject) => {
      let remaining = ms;
      let last = performance.now();
      const tick = (now: number): void => {
        if (this.cancelled) {
          reject(new Cancelled());
          return;
        }
        if (!this.paused) remaining -= now - last;
        last = now;
        if (remaining <= 0) resolve();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }
}
