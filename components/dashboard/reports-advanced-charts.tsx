"use client";

import {
  Bar,
  BarChart,
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
};

function formatTooltipValue(value: number | string | ReadonlyArray<number | string> | undefined) {
  const normalized = Array.isArray(value) ? Number(value[0] ?? 0) : Number(value ?? 0);
  return formatCurrency(Number.isFinite(normalized) ? normalized : 0);
}

export function ReportsAdvancedCharts({ trend, breakdown }: ReportsAdvancedChartsProps) {
  if (trend.length === 0 && breakdown.length === 0) {
    return (
      <div className="empty-panel">
        <p>لا توجد بيانات كافية لعرض الرسوم البيانية ضمن الفلاتر الحالية.</p>
      </div>
    );
  }

  return (
    <div className="analytics-grid">
      <article className="workspace-panel chart-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">الاتجاه</p>
            <h3>تفاصيل الاتجاه</h3>
          </div>
        </div>

        <div className="chart-shell">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--aya-chart-grid)" />
              <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={formatTooltipValue} />
              <Legend />
              <Line
                type="monotone"
                dataKey="sales_total"
                name="إجمالي المبيعات"
                stroke="var(--aya-chart-primary)"
                strokeWidth={3}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="net_profit"
                name="صافي الربح"
                stroke="var(--aya-chart-secondary)"
                strokeWidth={3}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="workspace-panel chart-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">التفكيك</p>
            <h3>تفكيك البعد الحالي</h3>
          </div>
        </div>

        <div className="chart-shell">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={breakdown.slice(0, 8)} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--aya-chart-grid)" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} interval={0} angle={-14} textAnchor="end" height={70} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={formatTooltipValue} />
              <Legend />
              <Bar
                dataKey="amount"
                name="القيمة الأساسية"
                fill="var(--aya-chart-primary)"
                radius={[8, 8, 0, 0]}
              />
              <Bar
                dataKey="secondary_amount"
                name="القيمة الثانوية"
                fill="var(--aya-chart-tertiary)"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>
    </div>
  );
}
