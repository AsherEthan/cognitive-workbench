"use client";

import { useQuery } from "@tanstack/react-query";

interface DesktopCapabilities {
  desktop: true;
  pages: string[];
}

/** An ordinary Pulse deployment has no desktop endpoint and keeps its full UI. */
export function useDesktopCapabilities() {
  const query = useQuery<DesktopCapabilities | null>({
    queryKey: ["desktop-capabilities"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/desktop/capabilities", { cache: "no-store" });
        if (!response.ok) return null;
        const data = await response.json();
        if (data?.desktop !== true || !Array.isArray(data.pages)) return null;
        return { desktop: true, pages: data.pages.filter((page: unknown): page is string => typeof page === "string") };
      } catch {
        return null;
      }
    },
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });

  return { desktop: query.data?.desktop === true, pages: query.data?.pages, pending: query.isPending };
}
