"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "pdf_usage";
const DAILY_LIMIT = 5;

interface UsageData {
  count: number;
  date: string;
}

function today() {
  return new Date().toISOString().split("T")[0];
}

export function useUsageLimit() {
  const [count, setCount] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data: UsageData = JSON.parse(raw);
      if (data.date === today()) {
        setCount(data.count);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ count: 0, date: today() }));
      }
    }
    setReady(true);
  }, []);

  const increment = () => {
    const next = count + 1;
    setCount(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ count: next, date: today() }));
  };

  return { count, isLimitReached: count >= DAILY_LIMIT, limit: DAILY_LIMIT, increment, ready };
}
