/** Pure rules for mouse drag-to-scroll; DOM wiring lives in src/components/DragScroll.tsx. */
export const DRAG_THRESHOLD_PX = 5;

export type ScrollBox = {
  overflowX: string;
  overflowY: string;
  scrollWidth: number;
  clientWidth: number;
  scrollHeight: number;
  clientHeight: number;
};

const SCROLLABLE = new Set(["auto", "scroll", "overlay"]);

/** Which axes of a box can actually be scrolled by dragging. */
export function scrollableAxes(box: ScrollBox): { x: boolean; y: boolean } {
  return {
    x: SCROLLABLE.has(box.overflowX) && box.scrollWidth > box.clientWidth + 1,
    y: SCROLLABLE.has(box.overflowY) && box.scrollHeight > box.clientHeight + 1,
  };
}

/** Decides whether a pointer movement becomes a drag, and on which axes. */
export function dragAxes(
  axes: { x: boolean; y: boolean },
  dx: number,
  dy: number,
  threshold = DRAG_THRESHOLD_PX,
): { x: boolean; y: boolean } | null {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (Math.max(ax, ay) <= threshold) return null;
  const x = axes.x && ax > threshold;
  const y = axes.y && ay > threshold;
  if (!x && !y) return null;
  return { x: axes.x, y: axes.y };
}
