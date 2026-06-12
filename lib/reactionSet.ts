"use client";

import { useSyncExternalStore } from "react";
import { idb } from "./idb";
import type { ReactionSetId } from "@/components/Tapback";

// Which reaction set the picker offers. Persisted per device.
const KEY = "reactionSet";
let current: ReactionSetId = "classic";
let hydrated = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function setReactionSet(id: ReactionSetId): void {
  current = id;
  void idb.kvSet(KEY, id);
  notify();
}

export function useReactionSet(): ReactionSetId {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      if (!hydrated) {
        hydrated = true;
        void idb.kvGet<ReactionSetId>(KEY).then((v) => {
          if (v && v !== current) {
            current = v;
            notify();
          }
        });
      }
      return () => listeners.delete(cb);
    },
    () => current,
    () => current
  );
}
