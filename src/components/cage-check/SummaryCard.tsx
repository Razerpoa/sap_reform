"use client";

type SummaryCardProps = {
  producingCount: number;
  totChickens: number;
  selectedDate: string;
};

/** Dark summary card showing producing count, percentage, and progress bar. */
export default function SummaryCard({
  producingCount,
  totChickens,
  selectedDate,
}: SummaryCardProps) {
  return (
    <div className="bg-slate-900 text-white rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">
            Produksi ({selectedDate})
          </p>
          <p className="text-2xl md:text-3xl font-black mt-1">
            {producingCount}
            <span className="text-sm text-slate-400 font-medium">
              {" "}
              / {totChickens}
            </span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">
            Persentase
          </p>
          <p className="text-2xl md:text-3xl font-black mt-1">
            {totChickens > 0
              ? Math.round((producingCount / totChickens) * 100)
              : 0}
            %
          </p>
        </div>
      </div>
      <div className="mt-4 h-2.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${
              totChickens > 0 ? (producingCount / totChickens) * 100 : 0
            }%`,
          }}
        />
      </div>
    </div>
  );
}
