export const STOCK_SEARCH_DELAY_MS = 1000;

export function createStockSearchDebouncer(onSearch: (value: string) => void) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => {
    clearTimeout(timer);
    timer = undefined;
  };
  return {
    schedule(value: string) {
      cancel();
      timer = setTimeout(() => {
        timer = undefined;
        onSearch(value);
      }, STOCK_SEARCH_DELAY_MS);
    },
    cancel,
  };
}