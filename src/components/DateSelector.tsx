"use client";

import { Calendar } from "lucide-react";

type DateSelectorProps = {
  value: string;
  onChange: (date: string) => void;
  /** Optional minimum date string (YYYY-MM-DD) */
  min?: string;
};

export default function DateSelector({ value, onChange, min }: DateSelectorProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl shadow-sm self-center sm:self-auto">
      <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
      <input
        type="date"
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => {
          try {
            (e.target as HTMLInputElement).showPicker();
          } catch {
            // Browser does not support showPicker
          }
        }}
        className="text-xs sm:text-sm font-bold outline-none bg-transparent"
      />
    </div>
  );
}
