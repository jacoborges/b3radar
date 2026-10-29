import { useEffect, useRef, type CSSProperties, type ReactNode, type PointerEvent, type UIEvent } from "react";

/** Synchronizes horizontal scrolling without enclosing page content in a vertical scroller. */
export function StockListViewport({ children, metricCount }: { children: ReactNode; metricCount: number }) {
  const root = useRef<HTMLDivElement>(null);
  const offset = useRef(0);
  const drag = useRef<{ element: HTMLElement; x: number; left: number; moved: boolean } | null>(null);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new MutationObserver(() => {
      element.querySelectorAll<HTMLElement>("[data-stock-scroll]").forEach(scroller => {
        scroller.scrollLeft = offset.current;
      });
    });
    observer.observe(element, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  const sync = (event: UIEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.matches("[data-stock-scroll]")) return;
    if (target.scrollLeft === offset.current) return;
    offset.current = target.scrollLeft;
    root.current?.querySelectorAll<HTMLElement>("[data-stock-scroll]").forEach(element => {
      if (element !== target) element.scrollLeft = offset.current;
    });
  };
  const start = (event: PointerEvent<HTMLDivElement>) => {
    drag.current = null;
    root.current?.removeAttribute("data-dragging");
    if (event.pointerType !== "mouse" || event.button !== 0 || !(event.target instanceof HTMLElement)) return;
    if (event.target.closest("button, a, input, [role=button]")) return;
    const element = event.target.closest<HTMLElement>("[data-stock-scroll]");
    if (element) drag.current = { element, x: event.clientX, left: element.scrollLeft, moved: false };
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || event.buttons !== 1) return;
    if (Math.abs(event.clientX - current.x) > 5) {
      current.moved = true;
      root.current?.setAttribute("data-dragging", "");
      current.element.setPointerCapture(event.pointerId);
      current.element.scrollLeft = current.left + current.x - event.clientX;
      event.preventDefault();
    }
  };
  return <div ref={root} className="stock-list-viewport" style={{ "--stock-metric-count": metricCount } as CSSProperties}
    onScrollCapture={sync} onPointerDown={start} onPointerMove={move}
    onPointerUp={() => { root.current?.removeAttribute("data-dragging"); if (drag.current && !drag.current.moved) drag.current = null; }}
    onPointerCancel={() => { root.current?.removeAttribute("data-dragging"); drag.current = null; }}
    onClickCapture={event => { if (drag.current?.moved) { event.preventDefault(); event.stopPropagation(); } drag.current = null; }}>
    {children}
  </div>;
}