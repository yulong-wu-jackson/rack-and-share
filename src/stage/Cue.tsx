import { type ReactElement, useEffect, useRef, useState } from 'react';
import { useApp } from '../state/store';
import { type Box, toStage } from './geometry';

interface Point {
  x: number;
  y: number;
}

interface Shape {
  ring: Box;
  radius: number;
  caption: Box;
}

/** Space between the ring and what it outlines. */
const PAD = 10;
/** How far the drawn ring closes on its target each frame. */
const EASE = 0.22;

function findTarget(name: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-cue="${name}"], [data-touch="${name}"]`);
}

/** The caption's text itself, not the column it sits in. */
function captionBox(): Box | null {
  const caption = document.querySelector('.caption');
  if (!caption?.textContent) return null;
  const range = document.createRange();
  range.selectNodeContents(caption);
  return toStage(range.getBoundingClientRect());
}

function measure(name: string): Shape | null {
  const target = findTarget(name);
  const caption = captionBox();
  if (!target || !caption) return null;
  if (!target.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return null;
  const box = toStage(target.getBoundingClientRect());
  if (box.width === 0 || box.height === 0) return null;
  const radius = Number.parseFloat(getComputedStyle(target).borderTopLeftRadius) || 0;
  return {
    ring: {
      x: box.x - PAD,
      y: box.y - PAD,
      width: box.width + PAD * 2,
      height: box.height + PAD * 2,
    },
    radius: Math.min(radius + PAD, 40),
    caption,
  };
}

function approach(from: Box, to: Box): Box {
  const step = (a: number, b: number): number => (Math.abs(b - a) < 0.5 ? b : a + (b - a) * EASE);
  return {
    x: step(from.x, to.x),
    y: step(from.y, to.y),
    width: step(from.width, to.width),
    height: step(from.height, to.height),
  };
}

function sameBox(a: Box, b: Box): boolean {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

function sameShape(a: Shape | null, b: Shape | null): boolean {
  if (!a || !b) return a === b;
  return a.radius === b.radius && sameBox(a.ring, b.ring) && sameBox(a.caption, b.caption);
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

/** A curve that leaves the caption sideways or downward and meets the ring square on. */
function leader(caption: Box, ring: Box, radius: number): string {
  const right = caption.x + caption.width;
  const bottom = caption.y + caption.height;
  const sideways = ring.x > right + 24;
  // Sideways lines leave from the caption's edge nearest the target, which keeps them low and short.
  const sideY = clamp(ring.y + ring.height / 2, caption.y + 12, bottom - 12);
  const start: Point = sideways
    ? { x: right + 14, y: sideY }
    : { x: caption.x + Math.min(caption.width / 2, 80), y: bottom + 14 };
  const inset = radius + 6;
  const xOnRing = clamp(start.x + 60, ring.x + inset, ring.x + ring.width - inset);

  let end: Point;
  let approachFrom: Point;
  if (sideways && start.y >= ring.y && start.y <= ring.y + ring.height) {
    end = { x: ring.x, y: clamp(start.y, ring.y + inset, ring.y + ring.height - inset) };
    approachFrom = { x: -1, y: 0 };
  } else if (start.y < ring.y) {
    end = { x: xOnRing, y: ring.y };
    approachFrom = { x: 0, y: -1 };
  } else {
    end = { x: xOnRing, y: ring.y + ring.height };
    approachFrom = { x: 0, y: 1 };
  }

  // Each handle stays within the distance it covers, so the curve never loops past its ends.
  const dx = Math.abs(end.x - start.x);
  const dy = Math.abs(end.y - start.y);
  const leave = Math.max(24, (sideways ? dx : dy) * 0.5);
  const arrive = Math.max(24, (approachFrom.x !== 0 ? dx : dy) * 0.6);
  const c1 = sideways ? { x: start.x + leave, y: start.y } : { x: start.x, y: start.y + leave };
  const c2 = { x: end.x + approachFrom.x * arrive, y: end.y + approachFrom.y * arrive };
  return `M${start.x} ${start.y}C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${end.x} ${end.y}`;
}

/** Points from the caption to the part of a screen it talks about, and follows it as it moves. */
export function Cue(): ReactElement {
  const cue = useApp((state) => state.cue);
  const caption = useApp((state) => state.caption);
  const [shape, setShape] = useState<Shape | null>(null);
  const drawn = useRef<Box | null>(null);

  useEffect(() => {
    if (!cue) {
      setShape(null);
      return;
    }
    let frame = 0;
    let shown: Shape | null = null;
    // Re-renders only when the ring or caption has moved.
    const show = (next: Shape | null): void => {
      if (sameShape(shown, next)) return;
      shown = next;
      setShape(next);
    };
    const step = (): void => {
      const next = measure(cue);
      if (next) {
        drawn.current = drawn.current ? approach(drawn.current, next.ring) : next.ring;
        show({ ...next, ring: drawn.current });
      } else {
        drawn.current = null;
        show(null);
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [cue]);

  if (!shape) return <svg className="cue" aria-hidden="true" />;
  const { ring, radius } = shape;
  const path = leader(shape.caption, ring, radius);
  const rect = { x: ring.x, y: ring.y, width: ring.width, height: ring.height, rx: radius };
  return (
    <svg className="cue" data-on="" aria-hidden="true">
      {/* Keyed so each new caption draws its line in again. */}
      <g key={`${cue}|${caption}`} className="cue-mark">
        <path className="cue-halo cue-trace" d={path} pathLength={1} />
        <path className="cue-line cue-trace" d={path} pathLength={1} />
        <rect className="cue-pulse" {...rect} />
        <rect className="cue-halo" {...rect} />
        <rect className="cue-ring" {...rect} />
      </g>
    </svg>
  );
}
