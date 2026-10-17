"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { recordNavigation } from "@/utils/backTarget";

// Remembers the last list page for the level page's back button
export default function NavigationTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(()=>{
    recordNavigation(pathname, searchParams.toString());
  }, [pathname, searchParams]);

  return null;
}
