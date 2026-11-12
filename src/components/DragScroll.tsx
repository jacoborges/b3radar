import { useEffect } from "react";
import { DRAG_THRESHOLD_PX, dragAxes, scrollableAxes } from "@/lib/drag-scroll";

/** Controls that need their own mouse drag; buttons and links still allow dragging (the click is suppressed after a drag). */
const NO_DRAG =
  "input, textarea, select, option, iframe, video, [role=slider], [contenteditable=''], [contenteditable=true], [draggable=true], .touch-none, [data-no-drag-scroll]";

/** Candidate scroll containers from the pointer target upward (the page itself scrolls with the wheel). */
function scrollChain(start: Element | null): HTMLElement[] {
  const chain: HTMLElement[] = [];
  for (let el = start; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
    if (!(el instanceof HTMLElement)) continue;
    const style = getComputedStyle(el);
    const axes = scrollableAxes({
      overflowX: style.overflowX, overflowY: style.overflowY,
      scrollWidth: el.scrollWidth, clientWidth: el.clientWidth,
      scrollHeight: el.scrollHeight, clientHeight: el.clientHeight,
    });
    if (axes.x || axes.y) chain.push(el);
  }
  return chain;
}

/** Global mouse drag-to-scroll for every inner scroller, since scrollbars are hidden app-wide. */
export function DragScroll() {
  useEffect(() => {
    let state: { chain: HTMLElement[]; x: number; y: number; active: HTMLElement | null; left: number; top: number; axes: { x: boolean; y: boolean } } | null = null;
    let suppressClick = false;

    const stop = () => {
      if (state?.active) document.documentElement.removeAttribute("data-drag-scrolling");
      state = null;
    };
    const onDown = (event: PointerEvent) => {
      stop();
      suppressClick = false;
      if (event.pointerType !== "mouse" || event.button !== 0 || event.defaultPrevented) return;
      const target = event.target;
      if (!(target instanceof Element) || target.closest(NO_DRAG)) return;
      // The asset list has its own synchronized drag handling.
      if (target.closest(".stock-list-viewport [data-stock-scroll]")) return;
      const chain = scrollChain(target);
      if (chain.length) state = { chain, x: event.clientX, y: event.clientY, active: null, left: 0, top: 0, axes: { x: false, y: false } };
    };
    const onMove = (event: PointerEvent) => {
      if (!state) return;
      if (event.buttons !== 1) return stop();
      const dx = event.clientX - state.x;
      const dy = event.clientY - state.y;
      if (!state.active) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) <= DRAG_THRESHOLD_PX) return;
        for (const el of state.chain) {
          const axes = dragAxes(scrollableAxes({
            overflowX: getComputedStyle(el).overflowX, overflowY: getComputedStyle(el).overflowY,
            scrollWidth: el.scrollWidth, clientWidth: el.clientWidth,
            scrollHeight: el.scrollHeight, clientHeight: el.clientHeight,
          }), dx, dy);
          if (axes) { state.active = el; state.axes = axes; state.left = el.scrollLeft; state.top = el.scrollTop; break; }
        }
        if (!state.active) { state = null; return; }
        document.documentElement.setAttribute("data-drag-scrolling", "");
        window.getSelection()?.removeAllRanges();
        suppressClick = true;
      }
      if (state.axes.x) state.active.scrollLeft = state.left - dx;
      if (state.axes.y) state.active.scrollTop = state.top - dy;
      event.preventDefault();
    };
    const onClick = (event: MouseEvent) => {
      if (!suppressClick) return;
      suppressClick = false;
      event.preventDefault();
      event.stopPropagation();
    };
    const onSelectStart = (event: Event) => { if (state?.active) event.preventDefault(); };

    document.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    window.addEventListener("blur", stop);
    window.addEventListener("click", onClick, true);
    document.addEventListener("selectstart", onSelectStart);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      window.removeEventListener("blur", stop);
      window.removeEventListener("click", onClick, true);
      document.removeEventListener("selectstart", onSelectStart);
    };
  }, []);
  return null;
}
