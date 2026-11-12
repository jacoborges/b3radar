import { describe, expect, it } from "vitest";
import { dragAxes, scrollableAxes } from "./drag-scroll";

const box = { overflowX: "auto", overflowY: "visible", scrollWidth: 900, clientWidth: 400, scrollHeight: 300, clientHeight: 300 };

describe("drag-scroll", () => {
  it("only scrolls axes that overflow and allow scrolling", () => {
    expect(scrollableAxes(box)).toEqual({ x: true, y: false });
    expect(scrollableAxes({ ...box, overflowX: "hidden" })).toEqual({ x: false, y: false });
    expect(scrollableAxes({ ...box, scrollWidth: 400 })).toEqual({ x: false, y: false });
  });
  it("ignores small movements so clicks keep working", () => {
    expect(dragAxes({ x: true, y: false }, 4, 0)).toBeNull();
    expect(dragAxes({ x: true, y: false }, 12, 0)).toEqual({ x: true, y: false });
  });
  it("does not start a horizontal-only drag on a vertical gesture", () => {
    expect(dragAxes({ x: true, y: false }, 2, 30)).toBeNull();
  });
});
