"use client";

import { useSyncExternalStore } from "react";

// The last list page the user was on (with its query, so the level browser keeps its filters),
// which the level page links back to
const KEY = "backTarget";

// Pages a level page can link back to
const targetPaths = [/^\/$/, /^\/levels$/, /^\/dashboard\/levels$/, /^\/dashboard\/admin$/, /^\/users\/[^/]+$/];
// Pages reached from a level page, which keep the back target of that level page
const levelPaths = [/^\/levels\/[^/]+$/, /^\/dashboard\/levels\/new$/, /^\/dashboard\/levels\/[^/]+\/edit$/];

let memoryTarget: string | null = null;
const listeners = new Set<() => void>();

function read() {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return memoryTarget;
  }
}

function write(url: string | null) {
  memoryTarget = url;
  try {
    if (url === null) sessionStorage.removeItem(KEY);
    else sessionStorage.setItem(KEY, url);
  } catch {}
  listeners.forEach(l => l());
}

// Called on every navigation with the new path and query
export function recordNavigation(pathname: string, search: string) {
  if (targetPaths.some(r => r.test(pathname))) write(pathname + (search ? "?" + search : ""));
  else if (!levelPaths.some(r => r.test(pathname))) write(null);
}

export function useBackTarget() {
  return useSyncExternalStore(
    l => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => null,
  );
}
