export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const STAGE_ID = 'stage';
export const STATION_ID = 'station';
export const PHONE_ID = 'phone';

/** Converts a viewport rectangle into the stage's own unscaled coordinates. */
export function toStage(rect: DOMRect): Box {
  const stage = document.getElementById(STAGE_ID);
  if (!stage) throw new Error('The stage is not mounted');
  const frame = stage.getBoundingClientRect();
  const scale = frame.width / stage.offsetWidth;
  return {
    x: (rect.left - frame.left) / scale,
    y: (rect.top - frame.top) / scale,
    width: rect.width / scale,
    height: rect.height / scale,
  };
}

export function stageBoxOf(id: string): Box {
  const element = document.getElementById(id);
  if (!element) throw new Error(`#${id} is not mounted`);
  return toStage(element.getBoundingClientRect());
}
