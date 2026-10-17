import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  createStockGroup,
  deleteStockGroup,
  listStockGroups,
  toggleStockInGroup,
  updateStockGroup,
} from "@/lib/stock-groups.functions";
import { groupsByTicker, type StockGroup } from "@/lib/stock-groups";

const KEY = ["stock-groups"];

export function useStockGroups() {
  const qc = useQueryClient();
  const list = useServerFn(listStockGroups);
  const create = useServerFn(createStockGroup);
  const update = useServerFn(updateStockGroup);
  const remove = useServerFn(deleteStockGroup);
  const toggle = useServerFn(toggleStockInGroup);

  const { data: groups = [] } = useQuery({ queryKey: KEY, queryFn: () => list(), staleTime: 60_000 });
  const byTicker = useMemo(() => groupsByTicker(groups), [groups]);

  const onError = (e: unknown) => {
    toast.error(e instanceof Error ? e.message : "Erro ao salvar grupo.");
    qc.invalidateQueries({ queryKey: KEY });
  };
  const done = () => qc.invalidateQueries({ queryKey: KEY });

  const createM = useMutation({ mutationFn: (v: { name: string; color: string }) => create({ data: v }), onSuccess: done, onError });
  const updateM = useMutation({ mutationFn: (v: { id: string; name: string; color: string }) => update({ data: v }), onSuccess: done, onError });
  const deleteM = useMutation({ mutationFn: (id: string) => remove({ data: { id } }), onSuccess: done, onError });
  const toggleM = useMutation({
    mutationFn: (v: { groupId: string; ticker: string; on: boolean }) => toggle({ data: v }),
    onMutate: (v) => {
      qc.setQueryData<StockGroup[]>(KEY, (old = []) =>
        old.map((g) =>
          g.id !== v.groupId
            ? g
            : { ...g, tickers: v.on ? [...new Set([...g.tickers, v.ticker])] : g.tickers.filter((t) => t !== v.ticker) },
        ),
      );
    },
    onError,
    onSettled: done,
  });

  return {
    groups,
    byTicker,
    createGroup: createM.mutateAsync,
    updateGroup: updateM.mutate,
    deleteGroup: deleteM.mutate,
    toggleTicker: toggleM.mutate,
  };
}
