"use client";

import { useQuery } from "@tanstack/react-query";
import WikiSidebar from "@/components/wiki/WikiSidebar";
import { openPalette } from "@/lib/palette/events";

interface TreeNode {
  label: string;
  slug?: string;
  category?: string;
  children?: TreeNode[];
  count?: number;
}

export default function LifeosLayout({ children }: { children: React.ReactNode }) {
  // ⌘K is handled globally by CommandPalette (opens WIKI-scoped on this route).
  const { data } = useQuery<{ tree: TreeNode[] }>({
    queryKey: ["wiki-tree"],
    queryFn: async () => {
      const res = await fetch("/api/wiki");
      if (!res.ok) throw new Error("無法讀取文件索引");
      return res.json();
    },
    staleTime: 30_000,
  });

  return (
    <div className="flex flex-col md:flex-row h-[calc(100dvh-101px)] md:h-[calc(100dvh-76px)] min-h-[480px]">
      <WikiSidebar tree={data?.tree || []} onSearchClick={() => openPalette("wiki")} />
      <div className="flex-1 min-w-0 min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
