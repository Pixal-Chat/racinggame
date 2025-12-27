import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { type InsertLapTime, type LapTime } from "@shared/schema";

export function useLaps() {
  return useQuery({
    queryKey: [api.laps.list.path],
    queryFn: async () => {
      const res = await fetch(api.laps.list.path);
      if (!res.ok) throw new Error("Failed to fetch lap times");
      return api.laps.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateLap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertLapTime) => {
      const res = await fetch(api.laps.create.path, {
        method: api.laps.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const error = await res.json();
          throw new Error(error.message);
        }
        throw new Error("Failed to save lap time");
      }
      
      return api.laps.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.laps.list.path] });
    },
  });
}
