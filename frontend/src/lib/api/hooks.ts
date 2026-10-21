"use client";

import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";

import { api } from "./client";
import type { Me } from "./types";

export function useApi<T>(path: string | null, key?: QueryKey) {
  return useQuery({
    queryKey: key ?? [path],
    queryFn: () => api<T>(path as string),
    enabled: path !== null,
  });
}

export function useMe() {
  return useApi<Me>("auth/me/", ["me"]);
}

export function useAction<TBody, TResult = unknown>(path: string, invalidate: QueryKey[] = []) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: TBody) => api<TResult>(path, { method: "POST", body }),
    onSuccess: () => invalidate.forEach((key) => qc.invalidateQueries({ queryKey: key })),
  });
}
