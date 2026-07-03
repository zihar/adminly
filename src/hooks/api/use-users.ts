import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { apiClient } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

export type User = components["schemas"]["User"];
export type NewUser = components["schemas"]["NewUser"];

export const usersKey = ["users"] as const;

// Dibagikan antara prefetch server (page RSC) dan useUsers() di client.
export function usersQueryOptions() {
  return queryOptions({
    queryKey: usersKey,
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/users");
      if (error || !data) {
        throw new Error("Failed to load users");
      }
      return data;
    },
  });
}

export function useUsers() {
  return useQuery(usersQueryOptions());
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: NewUser) => {
      const { data, error } = await apiClient.POST("/users", { body: input });
      if (error || !data) {
        throw new Error("Failed to create user");
      }
      return data;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: usersKey });
      const previous = queryClient.getQueryData<User[]>(usersKey);

      const optimistic: User = {
        id: `temp-${input.email}`,
        name: input.name,
        email: input.email,
        role: input.role,
        status: "invited",
        createdAt: new Date().toISOString().slice(0, 10),
      };
      queryClient.setQueryData<User[]>(usersKey, (old = []) => [
        optimistic,
        ...old,
      ]);

      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(usersKey, context.previous);
      }
      toast.error("Could not add user");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: usersKey });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.DELETE("/users/{id}", {
        params: { path: { id } },
      });
      if (error) {
        throw new Error("Failed to delete user");
      }
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: usersKey });
      const previous = queryClient.getQueryData<User[]>(usersKey);

      queryClient.setQueryData<User[]>(usersKey, (old = []) =>
        old.filter((u) => u.id !== id),
      );

      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(usersKey, context.previous);
      }
      toast.error("Could not delete user");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: usersKey });
    },
  });
}
