"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { tier1Nav, systemNav, metaNav, desktopNav } from "@/lib/palette/nav-manifest";
import { useEnabledModules } from "@/lib/use-enabled-modules";
import { useDesktopCapabilities } from "@/lib/use-desktop-capabilities";
import { pageLabel } from "@/lib/zh-TW";
import AwarenessHeader from "@/components/AwarenessHeader";

export default function AppHeader() {
  const pathname = usePathname() || "/";
  const isEnabled = useEnabledModules();
  const { desktop, pages } = useDesktopCapabilities();
  useEffect(() => {
    const wanted = `${pathname === "/agent" || pathname.startsWith("/agent/") ? "Agent" : pageLabel(pathname)} · 認知工作台`;
    const update = () => { if (document.title !== wanted) document.title = wanted; };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.head, {childList:true, characterData:true, subtree:true});
    const timer = setTimeout(() => observer.disconnect(),3000);
    return () => {observer.disconnect(); clearTimeout(timer);};
  }, [pathname]);
  const items = desktop ? desktopNav.filter(item => pages?.includes(item.href)) : [...tier1Nav, ...metaNav, ...systemNav].filter(isEnabled);
  return <AwarenessHeader items={items} desktop={desktop} />;
}
