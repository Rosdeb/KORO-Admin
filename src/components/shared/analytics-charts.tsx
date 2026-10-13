import { useState, type ReactNode } from "react";
import { ANALYTICS_COLORS } from "@/lib/analytics-colors";

type Datum = { name: string; value: number };
type Series = { name: string; color: string; values: number[] };
const muted = "var(--color-muted-foreground)";
const border = "var(--color-border)";

function scaleTop(values: number[]) {
  const max = Math.max(1, ...values);
  const step = Math.max(1, 10 ** Math.floor(Math.log10(max)) / 2);
  return Math.ceil(max / (step * 4)) * step * 4;
}

function ChartFrame({ label, children, tooltip }: { label: string; children: ReactNode; tooltip: string | null }) {
  return <div className="relative w-full">
    <svg viewBox="0 0 560 260" className="block w-full" role="group" aria-label={label}>{children}</svg>
    {tooltip && <div role="status" className="pointer-events-none absolute right-2 top-0 max-w-[85%] rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-sm">{tooltip}</div>}
  </div>;
}

export function VerticalBarChart({ labels, series, label, stacked = false, multicolor = false, rounded = false }: { labels: string[]; series: Series[]; label: string; stacked?: boolean; multicolor?: boolean; rounded?: boolean }) {
  const [tooltip, setTooltip] = useState<string | null>(null);
  const totals = labels.map((_, i) => series.reduce((sum, s) => sum + (s.values[i] ?? 0), 0));
  const top = scaleTop(stacked ? totals : series.flatMap((s) => s.values));
  const left = 38, right = 538, baseline = 224, height = 194;
  const spacing = (right - left) / Math.max(1, labels.length);
  const x = (index: number) => left + spacing * (index + 0.5);
  const y = (value: number) => baseline - value / top * height;
  const labelEvery = Math.max(1, Math.ceil(labels.length / 7));
  const groupWidth = Math.min(40, spacing * 0.58);
  const barWidth = stacked ? groupWidth : groupWidth / Math.max(1, series.length);
  return <ChartFrame label={label} tooltip={tooltip}>
    {Array.from({ length: 5 }, (_, i) => <g key={i}>
      <line x1={left} x2={right} y1={y(top * i / 4)} y2={y(top * i / 4)} stroke={border} strokeDasharray="2 3" />
      <text x={left - 10} y={y(top * i / 4) + 4} textAnchor="end" fontSize="10" fill={muted}>{top * i / 4}</text>
    </g>)}
    {labels.map((text, i) => <g key={i}>
      <rect x={x(i) - groupWidth / 2} y={y(top)} width={groupWidth} height={height} fill={series[0]?.color ?? ANALYTICS_COLORS[0]} opacity="0.055" />
      {(i % labelEvery === 0 || i === labels.length - 1) && <text x={x(i)} y={246} textAnchor="middle" fontSize="10" fill={muted}>{text.length > 12 ? `${text.slice(0, 11)}…` : text}</text>}
    </g>)}
    {series.map((s, seriesIndex) => <g key={s.name}>
      {s.values.map((value, i) => {
        const previous = stacked ? series.slice(0, seriesIndex).reduce((sum, item) => sum + (item.values[i] ?? 0), 0) : 0;
        const color = multicolor ? ANALYTICS_COLORS[i % ANALYTICS_COLORS.length] : s.color;
        const barX = x(i) - groupWidth / 2 + (stacked ? 0 : seriesIndex * barWidth);
        const barY = y(value + previous);
        const barHeight = value / top * height;
        const detail = `${labels[i]} · ${s.name}: ${value}`;
        return <g key={i} tabIndex={0} role="img" aria-label={detail} className="group outline-none" onMouseEnter={() => setTooltip(detail)} onMouseLeave={() => setTooltip(null)} onFocus={() => setTooltip(detail)} onBlur={() => setTooltip(null)}>
          <title>{detail}</title>
          <rect x={barX} y={barY} width={Math.max(0.5, barWidth - (stacked ? 0 : 2))} height={barHeight} rx={rounded ? Math.min(12, barWidth / 2) : 0} fill={color} className="transition-opacity group-hover:opacity-80 group-focus:opacity-80" />
          {labels.length <= 14 && <text x={barX + barWidth / 2} y={stacked && barHeight > 20 ? barY + barHeight / 2 + 3 : barY - 7} textAnchor="middle" fontSize="10" fill={stacked && barHeight > 20 ? "white" : muted}>{value}</text>}
          <rect x={barX} y={barY - 12} width={barWidth} height={Math.max(14, barHeight + 12)} fill="transparent" />
        </g>;
      })}
    </g>)}
  </ChartFrame>;
}

export function DistributionChart({ data, label, color = ANALYTICS_COLORS[0], multicolor = false, outlined = false }: { data: Datum[]; label: string; color?: string; multicolor?: boolean; outlined?: boolean }) {
  const [tooltip, setTooltip] = useState<string | null>(null);
  const top = scaleTop(data.map((d) => d.value));
  const left = 142, width = 370, height = 200;
  const rowHeight = height / Math.max(1, data.length);
  return <ChartFrame label={label} tooltip={tooltip}>
    {Array.from({ length: 5 }, (_, i) => <g key={i}>
      <line x1={left + width * i / 4} x2={left + width * i / 4} y1={18} y2={224} stroke={border} strokeDasharray="2 3" />
      <text x={left + width * i / 4} y={246} textAnchor="middle" fontSize="10" fill={muted}>{top * i / 4}</text>
    </g>)}
    {data.map((d, i) => {
      const y = 20 + i * rowHeight;
      const detail = `${d.name}: ${d.value}`;
      const fill = multicolor ? ANALYTICS_COLORS[i % ANALYTICS_COLORS.length] : color;
      const barHeight = Math.min(22, rowHeight * 0.5);
      const barY = y + (rowHeight - barHeight) / 2;
      return <g key={d.name} tabIndex={0} role="img" aria-label={detail} className="group outline-none" onMouseEnter={() => setTooltip(detail)} onMouseLeave={() => setTooltip(null)} onFocus={() => setTooltip(detail)} onBlur={() => setTooltip(null)}>
        <title>{detail}</title>
        <text x={left - 12} y={y + rowHeight / 2 + 4} textAnchor="end" fontSize="11" fill={muted}>{d.name.length > 20 ? `${d.name.slice(0, 19)}…` : d.name}</text>
        <rect x={left} y={barY} width={width} height={barHeight} fill={fill} opacity="0.055" />
        <rect x={left} y={barY} width={d.value / top * width} height={barHeight} fill={fill} className="transition-opacity group-hover:opacity-80 group-focus:opacity-80" />
        {outlined && d.value > 0 && <rect x={left + 2} y={barY + 2} width={Math.max(0, d.value / top * width - 4)} height={Math.max(0, barHeight - 4)} fill="none" stroke="var(--color-card)" strokeWidth="1" />}
        <text x={left + d.value / top * width + 7} y={y + rowHeight / 2 + 4} fontSize="11" fill={muted}>{d.value}</text>
        <rect x={left} y={y} width={width + 30} height={rowHeight} fill="transparent" />
      </g>;
    })}
  </ChartFrame>;
}

export function LanguageDonutChart({ data }: { data: Datum[] }) {
  const [tooltip, setTooltip] = useState<string | null>(null);
  const segments = ["Active", "Inactive"].map((name) => ({
    name,
    value: data.find((item) => item.name === name)?.value ?? 0,
    color: name === "Active" ? "#10b981" : "#94a3b8",
  }));
  const total = segments.reduce((sum, item) => sum + item.value, 0);
  const radius = 79;
  const circumference = 2 * Math.PI * radius;
  const nonzero = segments.filter((item) => item.value > 0).length;

  return <ChartFrame label="Active and inactive languages" tooltip={tooltip}>
    <circle cx="145" cy="130" r="98" fill="#10b981" opacity="0.035" />
    <circle cx="145" cy="130" r={radius} fill="none" stroke={border} strokeWidth="23" />
    {segments.map((item, index) => {
      const share = total ? item.value / total : 0;
      const offset = total ? segments.slice(0, index).reduce((sum, segment) => sum + segment.value, 0) / total * circumference : 0;
      const detail = `${item.name}: ${item.value} (${(share * 100).toFixed(1)}%)`;
      const legendY = 90 + index * 76;
      return <g key={item.name} tabIndex={0} role="img" aria-label={detail} className="group outline-none" onMouseEnter={() => setTooltip(detail)} onMouseLeave={() => setTooltip(null)} onFocus={() => setTooltip(detail)} onBlur={() => setTooltip(null)}>
        <title>{detail}</title>
        {item.value > 0 && <circle cx="145" cy="130" r={radius} fill="none" stroke={item.color} strokeWidth="23" strokeDasharray={`${Math.max(0, share * circumference - (nonzero > 1 ? Math.min(5, share * circumference * 0.15) : 0))} ${circumference}`} strokeDashoffset={-offset} transform="rotate(-90 145 130)" className="transition-opacity group-hover:opacity-80 group-focus:opacity-80" />}
        <circle cx="288" cy={legendY - 4} r="4.5" fill={item.color} />
        <text x="302" y={legendY} fontSize="13" fill={muted}>{item.name}</text>
        <text x="302" y={legendY + 27} fontSize="23" fontWeight="600" fill="var(--color-foreground)">{item.value}</text>
        <text x="520" y={legendY + 25} textAnchor="end" fontSize="12" fill={muted}>{(share * 100).toFixed(1)}%</text>
        <line x1="302" x2="520" y1={legendY + 39} y2={legendY + 39} stroke={border} />
      </g>;
    })}
    <text x="145" y="128" textAnchor="middle" fontSize="32" fontWeight="600" fill="var(--color-foreground)">{total}</text>
    <text x="145" y="151" textAnchor="middle" fontSize="11" fill={muted}>Total languages</text>
  </ChartFrame>;
}
