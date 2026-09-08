"use client";
import { useSyncExternalStore } from "react";
import { getTenders, subscribeTenders, getStorageError } from "./storage";
const serverSnapshot = () => null;
export function useTenders() {
  const tenders = useSyncExternalStore(
    subscribeTenders,
    getTenders,
    serverSnapshot,
  );
  return { tenders, error: getStorageError() };
}
