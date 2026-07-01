"use client";

import { useEffect, useState } from "react";

interface TimeAgoProps {
  date: Date | string | number;
  className?: string;
}

export default function TimeAgo({ date, className }: TimeAgoProps) {
  const [timeStr, setTimeStr] = useState<string>("");

  useEffect(() => {
    const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
    
    const calculate = () => {
      const s = Math.floor((Date.now() - d.getTime()) / 1000);
      if (s < 0) return "ahora";
      if (s < 60) return `${s}s`;
      if (s < 3600) return `${Math.floor(s / 60)}m`;
      if (s < 86400) return `${Math.floor(s / 3600)}h`;
      return `${Math.floor(s / 86400)}d`;
    };

    // Defer state update to avoid synchronous set-state-in-effect warning
    const timeout = setTimeout(() => {
      setTimeStr(calculate());
    }, 0);

    // Update relative time every 30 seconds
    const interval = setInterval(() => {
      setTimeStr(calculate());
    }, 30000);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [date]);

  return <span className={className}>{timeStr || "..."}</span>;
}
