import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStockSearchDebouncer } from "./stock-search";

describe("stock search delay", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("searches only at 1000 ms after the last character", () => {
    const search = vi.fn();
    const debouncer = createStockSearchDebouncer(search);
    debouncer.schedule("P");
    vi.advanceTimersByTime(700);
    debouncer.schedule("PE");
    vi.advanceTimersByTime(700);
    debouncer.schedule("PETR4");
    vi.advanceTimersByTime(999);
    expect(search).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(search.mock.calls).toEqual([["PETR4"]]);
  });

  it("also waits 1000 ms when clearing the field", () => {
    const search = vi.fn();
    const debouncer = createStockSearchDebouncer(search);
    debouncer.schedule("PETR4");
    vi.advanceTimersByTime(500);
    debouncer.schedule("");
    vi.advanceTimersByTime(999);
    expect(search).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(search.mock.calls).toEqual([[""]]);
  });

  it("cancels pending searches when unmounted", () => {
    const search = vi.fn();
    const debouncer = createStockSearchDebouncer(search);
    debouncer.schedule("VALE3");
    debouncer.cancel();
    vi.advanceTimersByTime(1000);
    expect(search).not.toHaveBeenCalled();
  });
});