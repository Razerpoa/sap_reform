"use client";

import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from "recharts";
import { format } from "date-fns";

export default function Charts({ data, type = "production" }: { data: any[], type?: "production" | "finance" }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center text-slate-400 text-sm italic font-medium">
        No analytical data available.
      </div>
    );
  }

  const chartData = data.map((entry) => ({
    name: entry.date ? format(new Date(entry.date), "dd MMM") : "Unknown",
    kg: Number(entry.totalKg) || 0,
    profit: Number(entry.profit) || 0,
    expenses: Number(entry.expenses) || 0,
  }));

  if (type === "finance") {
    return (
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
            tickFormatter={(val) => `Rp${(val / 1000).toLocaleString()}k`}
          />
          <Tooltip
            cursor={{ fill: '#f8fafc' }}
            contentStyle={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              border: '1px solid #f1f5f9',
              boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
              padding: '12px 16px',
            }}
            itemStyle={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase' }}
          />
          <Bar dataKey="profit" fill="#10b981" radius={[6, 6, 0, 0]} barSize={20} />
          <Bar dataKey="expenses" fill="#f43f5e" radius={[6, 6, 0, 0]} barSize={20} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="colorKg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis 
          dataKey="name" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
          dy={10}
        />
        <YAxis 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #f1f5f9',
            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
            padding: '12px 16px',
          }}
          itemStyle={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase' }}
        />
        <Area
          type="monotone"
          dataKey="kg"
          stroke="#2563eb"
          strokeWidth={4}
          fillOpacity={1}
          fill="url(#colorKg)"
          animationDuration={1500}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function Sparkline({ data, color, onHover }: { data: number[], color: string, onHover?: (val: number | null) => void }) {
  if (!data || data.length === 0) return null;
  
  const chartData = data.map((val, i) => ({ val: Number(val) || 0, i }));
  
  return (
    <ResponsiveContainer width="100%" height={50} minWidth={0}>
      <AreaChart
        data={chartData}
        margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
        onMouseMove={(e) => {
          if (onHover && (e as any).activePayload) {
            onHover((e as any).activePayload[0].value as number);
          }
        }}
        onMouseLeave={() => {
          if (onHover) onHover(null);
        }}
      >
        <defs>
          <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="val"
          stroke={color}
          strokeWidth={2}
          fill={`url(#grad-${color.replace('#', '')})`}
          isAnimationActive={true}
          animationDuration={2000}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
