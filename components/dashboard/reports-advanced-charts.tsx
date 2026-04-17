"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { AdvancedBreakdownEntry, AdvancedTrendPoint } from "@/lib/api/reports";
import { formatCurrency } from "@/lib/utils/formatters";

type ReportsAdvancedChartsProps = {
  trend: AdvancedTrendPoint[];
  breakdown: AdvancedBreakdownEntry[];
  view?: "trend" | "breakdown";
};

function formatTooltipValue(value: number | string | ReadonlyArray<number | string> | undefined) {
  const normalized = Array.isArray(value) ? Number(value[0] ?? 0) : Number(value ?? 0);
  return formatCurrency(Number.isFinite(normalized) ? normalized : 0);
}

export function ReportsAdvancedCharts({
  trend,
  breakdown,
  view = "trend"
}: ReportsAdvancedChartsProps) {
  if (trend.length === 0 && breakdown.length === 0) {
    return (
      <div className="empty-panel">
        <p>لا توجد بيانات كافية لعرض الرسوم البيانية ضمن الفلاتر الحالية.</p>
      </div>
    );
  }

  const topBreakdown = breakdown.slice(0, 5);

  if (view === "breakdown") {
    return (
      <section className="chart-card chart-card--secondary reports-chart-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">التفكيك</p>
            <h3>تفكيك البعد الحالي</h3>
          </div>
        </div>

        {topBreakdown.length > 0 ? (
          <div className="reports-breakdown-list">
            {topBreakdown.map((entry) => (
              <article key={entry.label} className="reports-breakdown-item">
                <div className="reports-breakdown-item__header">
                  <strong>{entry.label}</strong>
                  <span>{formatCurrency(entry.amount)}</span>
                </div>
                <p>المقارنة: {formatCurrency(entry.secondary_amount)}</p>
                <p>العناصر: {entry.item_count.toLocaleString("en-US")}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-panel">
            <p>لا توجد بيانات تفكيك ضمن الفترة الحالية.</p>
          </div>
        )}
      </section>
    );
  }

  return (
    <article className="chart-card chart-card--primary reports-chart-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">الاتجاه</p>
          <h3>المبيعات وصافي الربح</h3>
        </div>
      </div>

      {trend.length > 0 ? (
        <div className="chart-shell">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(24, 23, 21, 0.06)" />
              <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={formatTooltipValue} />
              <Legend />
              <Line
                type="monotone"
                dataKey="sales_total"
                name="إجمالي المبيعات"
                stroke="var(--color-accent)"
                strokeWidth={3}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="net_profit"
                name="صافي الربح"
                stroke="var(--color-text-secondary)"
                strokeWidth={3}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="empty-panel">
          <p>لا توجد بيانات اتجاه ضمن الفترة الحالية.</p>
        </div>
      )}
    </article>
  );
}
