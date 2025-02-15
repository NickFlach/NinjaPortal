import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { ClientInfo } from "@/types/websocket";

export interface ClientData {
  activeListeners: number;
  geotaggedListeners: number;
  anonymousListeners: number;
  listenersByCountry: Record<string, number>;
  clientInfo?: ClientInfo;
}

export function useClientData() {
  const queryClient = useQueryClient();

  const { data: clientStats, isLoading, error } = useQuery<ClientData>({
    queryKey: ["/api/clients/stats"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const updateClientMutation = useMutation({
    mutationFn: async (clientInfo: Partial<ClientInfo>) => {
      const response = await apiRequest("POST", "/api/clients/update", clientInfo);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients/stats"] });
    },
  });

  return {
    clientStats: clientStats || {
      activeListeners: 0,
      geotaggedListeners: 0,
      anonymousListeners: 0,
      listenersByCountry: {},
    },
    isLoading,
    error,
    updateClient: updateClientMutation.mutate,
    isUpdating: updateClientMutation.isPending,
  };
}
