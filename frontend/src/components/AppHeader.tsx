"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { tier1Nav, systemNav, metaNav } from "@/lib/palette/nav-manifest";
import { useEnabledModules } from "@/lib/use-enabled-modules";
import { pageLabel } from "@/lib/zh-TW";
import AwarenessHeader from "@/components/AwarenessHeader";

export default function AppHeader() {
  const pathname = usePathname() || "/";
  const isEnabled = useEnabledModules();
  useEffect(() => {
    const wanted = `${pageLabel(pathname)} · 認知工作台`;
    const update = () => { if (document.title !== wanted) document.title = wanted; };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.head, {childList:true, characterData:true, subtree:true});
    const timer = setTimeout(() => observer.disconnect(),3000);
    return () => {observer.disconnect(); clearTimeout(timer);};
  }, [pathname]);
  return <AwarenessHeader items={[...tier1Nav, ...metaNav, ...systemNav].filter(isEnabled)} />;
}
