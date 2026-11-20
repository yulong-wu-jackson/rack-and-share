/** Front-view pictogram of a person. Origin is the floor under the figure, y points down. */

export interface Build {
  height: number;
  shoulders: number;
  bun: boolean;
}

export interface Pose {
  /** 0 standing, 1 at the bottom of a squat. */
  squat: number;
  /** 0 arms down, 1 hands on the bar. */
  grip: number;
  /** 0 to 1: the left arm raised to touch the screen. */
  reach: number;
  /** 0 to 1: how much of the walk cycle shows. */
  stride: number;
  /** Walk cycle angle in radians. */
  phase: number;
  /** Breathing angle in radians. */
  breath: number;
}

interface Point {
  x: number;
  y: number;
}

export interface FigureShape {
  head: Point & { r: number };
  bun: (Point & { r: number }) | null;
  torso: string;
  arms: [string, string];
  legs: [string, string];
  limb: { arm: number; leg: number; torso: number };
  /** Height of a bar resting on the shoulders. */
  barY: number;
}

const REFERENCE_HEIGHT = 120;
const HIP_Y = -56;
const TORSO = 40;
const LEG_BONE = 28.2;
const SQUAT_DROP = 26;
/** Thighs point at the viewer in a squat, so they look shorter from the front. */
const FORESHORTEN = 0.25;

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

function mix(from: Point, to: Point, t: number): Point {
  return { x: lerp(from.x, to.x, t), y: lerp(from.y, to.y, t) };
}

/** Two-bone leg: finds the knee between hip and foot, bending towards `side`. */
function kneeBetween(hip: Point, foot: Point, bone: number, side: number): Point {
  const dx = foot.x - hip.x;
  const dy = foot.y - hip.y;
  const length = Math.hypot(dx, dy);
  const reach = Math.min(length, bone * 2 - 0.01);
  const along = reach / 2;
  const out = Math.sqrt(Math.max(0, bone * bone - along * along));
  const ux = dx / length;
  const uy = dy / length;
  const flip = uy * side < 0 ? -1 : 1;
  return {
    x: hip.x + ux * along + uy * out * flip,
    y: hip.y + uy * along - ux * out * flip,
  };
}

function polyline(points: Point[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('');
}

export function standingBarY(build: Build): number {
  return ((HIP_Y - TORSO - 5) * build.height) / REFERENCE_HEIGHT;
}

export function figureShape(build: Build, pose: Pose): FigureShape {
  const k = build.height / REFERENCE_HEIGHT;
  const half = build.shoulders / 2;
  const hipHalf = 7.5 * k;

  const bob = -Math.abs(Math.sin(pose.phase)) * 2 * pose.stride;
  const breath = Math.sin(pose.breath) * 0.7 * (1 - pose.squat);
  const hipY = (HIP_Y + SQUAT_DROP * pose.squat) * k + bob;
  const shoulderY = hipY - TORSO * k - breath;

  const stance = (9 + 8 * pose.grip) * k;
  const bone = LEG_BONE * k * (1 - FORESHORTEN * pose.squat);

  const leg = (side: -1 | 1): string => {
    const swing = pose.phase + (side > 0 ? Math.PI : 0);
    const foot = {
      x: side * stance,
      y: -Math.max(0, Math.sin(swing)) * 7 * pose.stride * k,
    };
    const hip = { x: side * hipHalf, y: hipY };
    return polyline([hip, kneeBetween(hip, foot, bone, side), foot]);
  };

  const arm = (side: -1 | 1): string => {
    const shoulder = { x: side * half, y: shoulderY + 3 * k };
    const sway = Math.sin(pose.phase + (side > 0 ? 0 : Math.PI)) * 3 * pose.stride;
    const down = [
      { x: side * (half + 4 * k), y: shoulderY + 20 * k },
      { x: side * (half + 3 * k) + sway, y: shoulderY + 37 * k },
    ];
    const onBar = [
      { x: side * (half + 11 * k), y: shoulderY + 9 * k },
      { x: side * (half + 9 * k), y: shoulderY - 6 * k },
    ];
    const toScreen = [
      { x: side * (half + 13 * k), y: shoulderY + 6 * k },
      { x: side * (half + 27 * k), y: shoulderY - 4 * k },
    ];
    const reach = side < 0 ? pose.reach : 0;
    const elbow = mix(mix(down[0], onBar[0], pose.grip), toScreen[0], reach);
    const hand = mix(mix(down[1], onBar[1], pose.grip), toScreen[1], reach);
    return polyline([shoulder, elbow, hand]);
  };

  const torso = `${polyline([
    { x: -half, y: shoulderY },
    { x: half, y: shoulderY },
    { x: hipHalf, y: hipY },
    { x: -hipHalf, y: hipY },
  ])}Z`;

  return {
    head: { x: 0, y: shoulderY - 15 * k, r: 9.5 * k },
    bun: build.bun ? { x: 7 * k, y: shoulderY - 25 * k, r: 4.4 * k } : null,
    torso,
    arms: [arm(-1), arm(1)],
    legs: [leg(-1), leg(1)],
    limb: { arm: 6.5 * k, leg: 8.5 * k, torso: 7 * k },
    barY: shoulderY - 5 * k,
  };
}
