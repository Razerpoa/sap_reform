"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

type InputFieldProps = {
  label: string;
  value: any;
  onChange: (value: string) => void;
  readOnly?: boolean;
  dark?: boolean;
  blue?: boolean;
  placeholder?: string;
};

export function InputField({ label, value, onChange, readOnly, dark, blue, placeholder = "0" }: InputFieldProps) {
  const displayValue = useMemo(() => {
    if (value == null || value === "") return "";
    const strVal = String(value).replace(/,/g, "");
    const num = parseFloat(strVal);
    if (isNaN(num)) return value;
    return num.toLocaleString("en-US");
  }, [value]);

  return (
    <div className={cn("space-y-1.5 flex-1", blue && "bg-blue-50 rounded-xl px-4 py-2")}>
      <label className={cn("text-[9px] uppercase font-black tracking-[0.2em] px-1", dark ? "text-blue-200/50" : blue ? "text-blue-400" : "text-slate-400")}>
        {label}
      </label>
      <input
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={(e) => {
          const cleaned = e.target.value.replace(/[^\d.]/g, "");
          onChange(cleaned);
        }}
        readOnly={readOnly}
        className={cn(
          "w-full px-4 py-3 rounded-xl text-base font-black outline-none transition-all",
          dark
            ? "bg-white/10 border-white/5 text-white placeholder-white/20 focus:bg-white/20"
            : blue
              ? "bg-blue-50 border-blue-200 text-blue-600 placeholder-blue-200"
              : "bg-slate-50 border-slate-100 text-slate-900 focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-200"
        )}
        placeholder={placeholder}
      />
    </div>
  );
}