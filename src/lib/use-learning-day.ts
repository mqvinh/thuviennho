"use client";
import { useSyncExternalStore } from "react";
import { learningDate } from "./daily-learning";
function subscribe(callback: () => void) {
  const timer = setInterval(callback, 30_000);
  document.addEventListener("visibilitychange", callback);
  window.addEventListener("focus", callback);
  return () => { clearInterval(timer); document.removeEventListener("visibilitychange", callback); window.removeEventListener("focus", callback); };
}
export function useLearningDay() { return useSyncExternalStore(subscribe, learningDate, () => ""); }
