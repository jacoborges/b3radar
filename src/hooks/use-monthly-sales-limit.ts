import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyMonthlySalesLimit, setMyMonthlySalesLimit } from "@/lib/user-settings.functions";
import { DEFAULT_MONTHLY_SALES_LIMIT } from "@/lib/portfolio-sales-control";

const key = ["monthly-sales-limit"];
export function useMonthlySalesLimit() {
  const client = useQueryClient();
  const getLimit = useServerFn(getMyMonthlySalesLimit);
  const saveLimit = useServerFn(setMyMonthlySalesLimit);
  const query = useQuery({ queryKey: key, queryFn: () => getLimit(), staleTime: 60_000 });
  const mutation = useMutation({
    mutationFn: (limit: number) => saveLimit({ data: { limit } }),
    onSuccess: (data) => client.setQueryData(key, data),
  });
  return { limit: query.data?.limit ?? DEFAULT_MONTHLY_SALES_LIMIT, query, mutation };
}