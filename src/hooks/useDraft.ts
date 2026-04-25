"use client";

import { useEffect, useCallback, useRef } from "react";

const STORAGE_PREFIX = "draft-";
const DEBOUNCE_MS = 500;

export function useDraft({
  tab,
  date,
  onLoad,
}: {
  tab: string;
  date: string;
  onLoad: (data: any) => void;
}) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastKeyRef = useRef<string | null>(null);

  const getKey = useCallback(() => {
    return `${STORAGE_PREFIX}${tab}-${date}`;
  }, [tab, date]);

  // Load draft when key changes (tab or date changes)
  useEffect(() => {
    const key = getKey();
    
    // Skip if same key as before
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;
    
    const stored = localStorage.getItem(key);
    
    if (stored) {
      try {
        const data = JSON.parse(stored);
        // Only load if data is not empty
        if (data && Object.keys(data).length > 0) {
          onLoad(data);
        }
      } catch (err) {
        console.error("[useDraft] Failed to parse draft:", err);
      }
    }
  }, [getKey, onLoad]);

  // Save draft (debounced)
  const saveDraft = useCallback((data: any) => {
    if (!data || Object.keys(data).length === 0) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce save
    timeoutRef.current = setTimeout(() => {
      const key = getKey();
      localStorage.setItem(key, JSON.stringify(data));
    }, DEBOUNCE_MS);
  }, [getKey]);

  // Clear draft (after save)
  const clearDraft = useCallback(() => {
    // Clear timeout if pending
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const key = getKey();
    localStorage.removeItem(key);
  }, [getKey]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    saveDraft,
    clearDraft,
  };
}