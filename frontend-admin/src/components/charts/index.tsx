"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompact, formatNumber } from "@/lib/utils";

export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
];

const axisProps = {
  stroke: "var(--color-muted-foreground)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

const tooltipStyle = {
  contentStyle: {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    fontSize: "12px",
    color: "var(--popover-foreground)",
    boxShadow: "var(--shadow-raised)",
  },
  labelStyle: { color: "var(--color-muted-foreground)", fontSize: "11px" },
} as const;

interface SeriesConfig {
  key: string;
  name: string;
  color?: string;
}

interface TrendChartProps<T extends object = object> {
  data: T[];
  series: SeriesConfig[];
  xKey: string;
  height?: number;
  valueFormatter?: (value: number) => string;
  stacked?: boolean;
  showGrid?: boolean;
}

export function AreaTrendChart<T extends object>({
  data,
  series,
  xKey,
  height = 240,
  valueFormatter = (value) => formatCompact(value),
  stacked = false,
  showGrid = true,
}: TrendChartProps<T>) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          {series.map((item, index) => (
            <linearGradient key={item.key} id={`gradient-${item.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={item.color ?? CHART_COLORS[index % CHART_COLORS.length]} stopOpacity={0.35} />
              <stop offset="95%" stopColor={item.color ?? CHART_COLORS[index % CHART_COLORS.length]} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        {showGrid ? <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} /> : null}
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} tickFormatter={(value: number) => valueFormatter(value)} width={52} />
        <Tooltip
          {...tooltipStyle}
          formatter={(value: number, name: string) => [valueFormatter(Number(value)), name]}
        />
        {series.map((item, index) => (
          <Area
            key={item.key}
            type="monotone"
            dataKey={item.key}
            name={item.name}
            stackId={stacked ? "1" : undefined}
            stroke={item.color ?? CHART_COLORS[index % CHART_COLORS.length]}
            fill={`url(#gradient-${item.key})`}
            strokeWidth={1.8}
            dot={false}
            activeDot={{ r: 3 }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function MultiLineChart<T extends object>({
  data,
  series,
  xKey,
  height = 240,
  valueFormatter = formatCompact,
}: TrendChartProps<T>) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} tickFormatter={(value: number) => valueFormatter(value)} width={52} />
        <Tooltip
          {...tooltipStyle}
          formatter={(value: number, name: string) => [valueFormatter(Number(value)), name]}
        />
        {series.map((item, index) => (
          <Line
            key={item.key}
            type="monotone"
            dataKey={item.key}
            name={item.name}
            stroke={item.color ?? CHART_COLORS[index % CHART_COLORS.length]}
            strokeWidth={1.8}
            dot={false}
            activeDot={{ r: 3 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

interface BarChartProps<T extends object = object> {
  data: T[];
  series: SeriesConfig[];
  xKey: string;
  height?: number;
  layout?: "horizontal" | "vertical";
  valueFormatter?: (value: number) => string;
  stacked?: boolean;
}

export function BarDistributionChart<T extends object>({
  data,
  series,
  xKey,
  height = 240,
  layout = "horizontal",
  valueFormatter = (value) => formatCompact(value),
  stacked = false,
}: BarChartProps<T>) {
  const vertical = layout === "vertical";
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout={layout}
        margin={{ top: 4, right: 12, left: vertical ? 12 : 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={vertical} horizontal={!vertical} />
        {vertical ? (
          <>
            <XAxis type="number" {...axisProps} tickFormatter={(value: number) => valueFormatter(value)} />
            <YAxis type="category" dataKey={xKey} {...axisProps} width={110} />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} {...axisProps} />
            <YAxis {...axisProps} tickFormatter={(value: number) => valueFormatter(value)} width={52} />
          </>
        )}
        <Tooltip
          {...tooltipStyle}
          formatter={(value: number, name: string) => [valueFormatter(Number(value)), name]}
        />
        {series.map((item, index) => (
          <Bar
            key={item.key}
            dataKey={item.key}
            name={item.name}
            stackId={stacked ? "1" : undefined}
            fill={item.color ?? CHART_COLORS[index % CHART_COLORS.length]}
            radius={vertical ? [0, 4, 4, 0] : [4, 4, 0, 0]}
            maxBarSize={28}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

interface DonutChartProps {
  data: { name: string; value: number }[];
  height?: number;
  showLegend?: boolean;
  innerRadius?: number;
  valueFormatter?: (value: number) => string;
}

export function DonutChart({
  data,
  height = 240,
  showLegend = true,
  innerRadius = 56,
  valueFormatter = formatNumber,
}: DonutChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={innerRadius + 34}
          paddingAngle={2}
          strokeWidth={1}
          stroke="var(--card)"
        >
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip {...tooltipStyle} formatter={(value: number, name: string) => [valueFormatter(Number(value)), name]} />
        {showLegend ? (
          <Legend
            verticalAlign="bottom"
            height={28}
            formatter={(value: string) => <span style={{ fontSize: 11, color: "var(--color-muted-foreground)" }}>{value}</span>}
          />
        ) : null}
      </PieChart>
    </ResponsiveContainer>
  );
}

export function SparkLine<T extends object>({
  data,
  dataKey,
  height = 40,
  color = CHART_COLORS[0],
}: {
  data: T[];
  dataKey: string;
  height?: number;
  color?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
