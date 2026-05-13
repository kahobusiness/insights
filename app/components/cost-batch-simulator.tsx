'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useTheme } from 'nextra-theme-docs'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

// Reuse the dark-mode-aware visual styles from the T_compute / T_memory simulator
// so the two simulators look like a matched pair.
import styles from './t-compute-memory-simulator.module.css'

const COLORS = {
  total: '#F59E0B', // total cost curve — the protagonist (bold amber)
  memory: '#F43F8E', // memory cost = param-move / B + KV
  compute: '#6366F1', // compute cost (horizontal indigo)
  kv: '#14B8A6', // KV alone (horizontal teal, dashed)
} as const

const GLOW = {
  total: 'rgba(245,158,11,0.32)',
  memory: 'rgba(244,63,142,0.22)',
  compute: 'rgba(99,102,241,0.22)',
  kv: 'rgba(20,184,166,0.22)',
} as const

const LIGHT_CHART_THEME = {
  grid: '#e2e8f0',
  tickFill: '#64748b',
  labelFill: '#475569',
  tooltipBg: '#ffffff',
  tooltipBorder: '#e2e8f0',
  tooltipShadow: '0 4px 14px rgba(15,23,42,0.12)',
  tooltipText: '#0f172a',
  refLineStroke: '#94a3b8',
  refLineLabel: '#475569',
  bStarStroke: '#10b981',
  bStarLabel: '#047857',
} as const

const DARK_CHART_THEME = {
  grid: '#334155',
  tickFill: '#94a3b8',
  labelFill: '#cbd5e1',
  tooltipBg: '#1e293b',
  tooltipBorder: '#334155',
  tooltipShadow: '0 4px 14px rgba(0,0,0,0.4)',
  tooltipText: '#f1f5f9',
  refLineStroke: '#64748b',
  refLineLabel: '#cbd5e1',
  bStarStroke: '#34d399',
  bStarLabel: '#6ee7b7',
} as const

const DEFAULTS = {
  B: 128,
  BMax: 8192,
  NActive: 37e9,
  C: 1e15,
  NTotal: 671e9,
  BW: 4.8e12,
  L: 1024,
  bytesPerToken: 71680,
} as const

type Lang = 'zh' | 'en'

interface LocaleMessages {
  desc: string
  controls: {
    currentB: { label: string; helper: string }
    maxB: { label: string; helper: string }
    nActive: { label: string; helper: string }
    compute: { label: string; helper: string }
    nTotal: { label: string; helper: string }
    bw: { label: string; helper: string }
    seqLen: { label: string; helper: string }
    bytesPerToken: { label: string; helper: string }
  }
  cards: {
    bottleneckLabel: string
    currentCostLabel: (b: number) => string
    memoryCostLabel: string
    computeCostLabel: string
    costAtB1Label: string
    costFloorLabel: string
    ratioLabel: string
    notes: {
      currentCost: string
      memoryCost: string
      computeCost: string
      costAtB1: string
      costFloor: string
      ratio: string
      bottleneckHas: (bStar: string, total: string) => string
      bottleneckNone: (total: string) => string
    }
  }
  bottleneckValue: { memory: string; compute: string }
  panels: {
    chartCheatTitle: string
    chartCheatBody: string
    paramSummaryTitle: string
    paramSummary: (p: {
      NActive: string
      C: string
      NTotal: string
      BW: string
      L: string
      bytesPerToken: string
    }) => string
    ratioNote: (ratio: string, share: string) => string
  }
  axis: { x: string; y: string }
  series: {
    total: string
    memory: string
    compute: string
    kv: string
  }
}

const MESSAGES: Record<Lang, LocaleMessages> = {
  zh: {
    desc: '同一组参数（DeepSeek V3 + H200、L=1K），但 Y 轴从「延迟」换成「每 token 成本」。看双曲线（搬参数 / B）怎么从无穷大降下来、KV 摊不掉的水平线在哪、不开 Batch（B=1）的成本是甜蜜点的多少倍——文章 §六 里推的「5400 倍」就在指标卡里。',
    controls: {
      currentB: { label: '当前 B', helper: '当前 batch size，标记图上竖线' },
      maxB: { label: 'B 最大值', helper: '横轴范围，常用 512 / 2048 / 4096' },
      nActive: { label: 'N_active', helper: '每 token 激活的参数量。MoE 通常更小' },
      compute: { label: 'C', helper: '有效计算吞吐' },
      nTotal: { label: 'N_total', helper: '需要从内存读取的总参数 / 数据规模' },
      bw: { label: 'BW', helper: '有效内存带宽' },
      seqLen: { label: 'L', helper: '序列长度均值 / KV 长度均值，最大 1M token' },
      bytesPerToken: {
        label: 'b',
        helper:
          '每 token 在 KV cache 里占的总字节数（= 2 × 层数 × KV heads × head_dim × 元素字节数），典型 4 KB ~ 数百 KB',
      },
    },
    cards: {
      bottleneckLabel: 'Bottleneck',
      currentCostLabel: (b) => `Cost / token @ B=${b}`,
      memoryCostLabel: 'Memory cost / token',
      computeCostLabel: 'Compute cost / token',
      costAtB1Label: 'Cost @ B=1（不开 Batch）',
      costFloorLabel: 'Cost floor（B → ∞）',
      ratioLabel: 'Cost(B=1) / Cost floor',
      notes: {
        currentCost: 'max(memory, compute)',
        memoryCost: '搬参数 / B + KV 常数',
        computeCost: 'N_active / C，水平不变',
        costAtB1: 'B=1 时一个用户独扛参数搬运成本',
        costFloor: 'max(算力常数, KV 常数)',
        ratio: '「不开 Batch 差几千倍」的精确数值',
        bottleneckHas: (bStar, total) =>
          `甜蜜点 B* ≈ ${bStar} · Cost / token ${total}`,
        bottleneckNone: (total) =>
          `当前范围内无交点 · Cost / token ${total}`,
      },
    },
    bottleneckValue: { memory: 'Memory-bound', compute: 'Compute-bound' },
    panels: {
      chartCheatTitle: '读图小抄',
      chartCheatBody:
        '橙色加粗线 = max(memory, compute)，是真正的「每 token 成本」曲线。B 小时它跟着双曲线一路下降，到甜蜜点后被紫色水平线（算力下界）卡住。青色虚线是 KV 摊不掉的水平渐近线——B 再大，memory 也降不到 0。',
      paramSummaryTitle: '当前参数速览',
      paramSummary: (p) =>
        `N_active=${p.NActive}，C=${p.C} ops/s，N_total=${p.NTotal}，BW=${p.BW} B/s，L=${p.L}，b=${p.bytesPerToken} B/token。`,
      ratioNote: (ratio, share) =>
        `Cost(B=1) / Cost floor = ${ratio}×，这就是文章 §六 里推的"不开 Batch 差几千倍"的精确数字。KV 项目前占 memory 的 ${share}%。`,
    },
    axis: { x: 'Batch size B', y: 'Cost / token (ms)' },
    series: {
      total: 'Total cost = max(...)',
      memory: 'Memory (搬参数 + KV)',
      compute: 'Compute',
      kv: 'KV（摊不掉）',
    },
  },
  en: {
    desc: 'Same knobs (DeepSeek V3 + H200, L=1K), but the Y-axis flips from latency to cost per token. Watch the hyperbola (param-move / B) plunge from infinity down to the compute floor, see where the un-amortizable KV horizontal sits, and read off Cost(B=1) / Cost floor — that "5400× without batching" number from §VI lives in the metric cards.',
    controls: {
      currentB: {
        label: 'Current B',
        helper: 'Current batch size — marked as a vertical line on the chart',
      },
      maxB: {
        label: 'Max B',
        helper: 'X-axis range. Common values: 512 / 2048 / 4096',
      },
      nActive: {
        label: 'N_active',
        helper: 'Parameters activated per token. MoE models are typically smaller',
      },
      compute: { label: 'C', helper: 'Effective compute throughput' },
      nTotal: {
        label: 'N_total',
        helper: 'Total params (or data) that must be read from memory',
      },
      bw: { label: 'BW', helper: 'Effective memory bandwidth' },
      seqLen: {
        label: 'L',
        helper: 'Average sequence / KV length per user in the batch, up to 1M tokens',
      },
      bytesPerToken: {
        label: 'b',
        helper:
          'Total KV bytes per token (= 2 × layers × KV heads × head_dim × bytes_per_element); typically 4 KB ~ several hundred KB',
      },
    },
    cards: {
      bottleneckLabel: 'Bottleneck',
      currentCostLabel: (b) => `Cost / token @ B=${b}`,
      memoryCostLabel: 'Memory cost / token',
      computeCostLabel: 'Compute cost / token',
      costAtB1Label: 'Cost @ B=1 (no batching)',
      costFloorLabel: 'Cost floor (B → ∞)',
      ratioLabel: 'Cost(B=1) / Cost floor',
      notes: {
        currentCost: 'max(memory, compute)',
        memoryCost: 'param-move / B + KV constant',
        computeCost: 'N_active / C, flat',
        costAtB1: 'A single user carries the full param-move cost',
        costFloor: 'max(compute constant, KV constant)',
        ratio: 'The exact "thousands× without batching" number',
        bottleneckHas: (bStar, total) =>
          `Sweet spot B* ≈ ${bStar} · Cost / token ${total}`,
        bottleneckNone: (total) =>
          `No crossover in the current range · Cost / token ${total}`,
      },
    },
    bottleneckValue: { memory: 'Memory-bound', compute: 'Compute-bound' },
    panels: {
      chartCheatTitle: 'Reading the chart',
      chartCheatBody:
        "The bold amber line is max(memory, compute) — the actual cost-per-token curve. As B drops it tracks the hyperbola downward, then the indigo horizontal (compute floor) takes over past the sweet spot. The dashed teal line is the un-amortizable KV horizontal — even infinite batch can't drive memory to zero.",
      paramSummaryTitle: 'Current parameters',
      paramSummary: (p) =>
        `N_active=${p.NActive}, C=${p.C} ops/s, N_total=${p.NTotal}, BW=${p.BW} B/s, L=${p.L}, b=${p.bytesPerToken} B/token.`,
      ratioNote: (ratio, share) =>
        `Cost(B=1) / Cost floor = ${ratio}× — the exact "thousands× without batching" number §VI derives. KV currently accounts for ${share}% of the memory term.`,
    },
    axis: { x: 'Batch size B', y: 'Cost / token (ms)' },
    series: {
      total: 'Total cost = max(...)',
      memory: 'Memory (param-move + KV)',
      compute: 'Compute',
      kv: 'KV (un-amortizable)',
    },
  },
}

const pow10 = (x: number) => Math.pow(10, x)
const log10 = (x: number) => Math.log10(Math.max(x, 1e-30))

function clamp(value: number | string, min: number, max: number): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, n))
}

function formatCompact(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return '-'

  const abs = Math.abs(value)
  const units: ReadonlyArray<readonly [number, string]> = [
    [1e15, 'P'],
    [1e12, 'T'],
    [1e9, 'G'],
    [1e6, 'M'],
    [1e3, 'K'],
  ]

  for (const [base, suffix] of units) {
    if (abs >= base) {
      return `${(value / base).toLocaleString(undefined, {
        maximumFractionDigits: digits,
      })}${suffix}`
    }
  }

  if (abs >= 1) {
    return value.toLocaleString(undefined, { maximumFractionDigits: digits })
  }

  return value.toExponential(2)
}

function formatMs(seconds: number, withUnit = true): string {
  if (!Number.isFinite(seconds)) return '-'
  const ms = seconds * 1000
  const abs = Math.abs(ms)

  let digits: number
  if (abs === 0) digits = 0
  else if (abs >= 1000) digits = 0
  else if (abs >= 100) digits = 1
  else if (abs >= 10) digits = 2
  else if (abs >= 1) digits = 3
  else if (abs >= 0.1) digits = 4
  else if (abs >= 0.01) digits = 5
  else if (abs >= 0.001) digits = 6
  else if (abs >= 0.0001) digits = 7
  else digits = 8

  const text = ms.toLocaleString(undefined, { maximumFractionDigits: digits })
  return withUnit ? `${text} ms` : text
}

function parseCompact(raw: string | number): number {
  const s = String(raw).trim().replace(/,/g, '')
  const match = s.match(/^([+-]?\d*\.?\d+)\s*([kKmMgGtTpP]?)$/)
  if (!match) return NaN

  const n = Number(match[1])
  const unit = (match[2] ?? '').toLowerCase()
  const factorMap: Record<string, number> = {
    '': 1,
    k: 1e3,
    m: 1e6,
    g: 1e9,
    t: 1e12,
    p: 1e15,
  }

  return n * (factorMap[unit] ?? 1)
}

interface MetricsInput {
  B: number
  NActive: number
  C: number
  NTotal: number
  BW: number
  L: number
  bytesPerToken: number
}

interface Metrics {
  costParamMove: number
  costKV: number
  costCompute: number
  costMemory: number
  costTotal: number
  bottleneck: 'memory' | 'compute'
  kvShare: number
}

function calcMetrics({ B, NActive, C, NTotal, BW, L, bytesPerToken }: MetricsInput): Metrics {
  const costParamMove = NTotal / (B * BW)
  const costKV = (L * bytesPerToken) / BW
  const costCompute = NActive / C
  const costMemory = costParamMove + costKV
  const costTotal = Math.max(costMemory, costCompute)
  return {
    costParamMove,
    costKV,
    costCompute,
    costMemory,
    costTotal,
    bottleneck: costMemory > costCompute ? 'memory' : 'compute',
    kvShare: costMemory === 0 ? 0 : costKV / costMemory,
  }
}

interface ControlBaseProps {
  label: string
  value: number
  setValue: (next: number) => void
  min: number
  max: number
  helper?: string
  unit?: string
  accentColor?: string
}

interface LogControlProps extends ControlBaseProps {
  digits?: number
}

function LogControl({
  label,
  value,
  setValue,
  min,
  max,
  helper,
  unit = '',
  digits = 2,
  accentColor = COLORS.compute,
}: LogControlProps) {
  const [draft, setDraft] = useState<string>(formatCompact(value, digits))

  const minLog = log10(min)
  const maxLog = log10(max)
  const sliderValue = clamp(log10(value), minLog, maxLog)

  function commit() {
    const parsed = parseCompact(draft)
    if (Number.isFinite(parsed) && parsed > 0) {
      const next = clamp(parsed, min, max)
      setValue(next)
      setDraft(formatCompact(next, digits))
    } else {
      setDraft(formatCompact(value, digits))
    }
  }

  function onSliderChange(event: React.ChangeEvent<HTMLInputElement>) {
    const next = pow10(Number(event.target.value))
    setValue(next)
    setDraft(formatCompact(next, digits))
  }

  return (
    <div className={styles.controlPanel}>
      <div className={styles.controlHeader}>
        <div className={styles.controlMeta}>
          <div className={styles.controlLabel}>{label}</div>
          {helper ? <div className={styles.controlHelper}>{helper}</div> : null}
        </div>

        <div className={styles.controlInputRow}>
          <input
            className={styles.numberInput}
            value={draft}
            inputMode="decimal"
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur()
            }}
          />
          {unit ? <span className={styles.unit}>{unit}</span> : null}
        </div>
      </div>

      <input
        className={styles.slider}
        style={{ color: accentColor, accentColor }}
        type="range"
        value={sliderValue}
        min={minLog}
        max={maxLog}
        step={0.01}
        onChange={onSliderChange}
        aria-label={label}
      />

      <div className={styles.sliderLabels}>
        <span>{formatCompact(min, digits)}</span>
        <span>{formatCompact(max, digits)}</span>
      </div>
    </div>
  )
}

interface LinearControlProps extends ControlBaseProps {
  step?: number
}

function LinearControl({
  label,
  value,
  setValue,
  min,
  max,
  step = 1,
  helper,
  unit = '',
  accentColor = COLORS.memory,
}: LinearControlProps) {
  const safeValue = clamp(value, min, max)

  function update(nextValue: number | string) {
    setValue(clamp(nextValue, min, max))
  }

  return (
    <div className={styles.controlPanel}>
      <div className={styles.controlHeader}>
        <div className={styles.controlMeta}>
          <div className={styles.controlLabel}>{label}</div>
          {helper ? <div className={styles.controlHelper}>{helper}</div> : null}
        </div>

        <div className={styles.controlInputRow}>
          <input
            className={styles.numberInput}
            type="number"
            inputMode="numeric"
            value={safeValue}
            min={min}
            max={max}
            step={step}
            onChange={(event) => update(event.target.value)}
          />
          {unit ? <span className={styles.unit}>{unit}</span> : null}
        </div>
      </div>

      <input
        className={styles.slider}
        style={{ color: accentColor, accentColor }}
        type="range"
        value={safeValue}
        min={min}
        max={max}
        step={step}
        onChange={(event) => update(event.target.value)}
        aria-label={label}
      />

      <div className={styles.sliderLabels}>
        <span>{formatCompact(min, 0)}</span>
        <span>{formatCompact(max, 0)}</span>
      </div>
    </div>
  )
}

interface StatCardProps {
  label: string
  value: React.ReactNode
  note?: React.ReactNode
  className?: string
}

function StatCard({ label, value, note, className }: StatCardProps) {
  return (
    <div className={className ? `${styles.statCard} ${className}` : styles.statCard}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>{value}</div>
      {note ? <div className={styles.statNote}>{note}</div> : null}
    </div>
  )
}

interface ChartPoint {
  B: number
  costMemory: number
  costCompute: number
  costKV: number
  costTotal: number
}

function useSimulator() {
  const [B, setB] = useState<number>(DEFAULTS.B)
  const [BMax, setBMax] = useState<number>(DEFAULTS.BMax)
  const [NActive, setNActive] = useState<number>(DEFAULTS.NActive)
  const [C, setC] = useState<number>(DEFAULTS.C)
  const [NTotal, setNTotal] = useState<number>(DEFAULTS.NTotal)
  const [BW, setBW] = useState<number>(DEFAULTS.BW)
  const [L, setL] = useState<number>(DEFAULTS.L)
  const [bytesPerToken, setBytesPerToken] = useState<number>(DEFAULTS.bytesPerToken)

  const safeB = Math.min(B, BMax)

  const data = useMemo<ChartPoint[]>(() => {
    const points: ChartPoint[] = []
    const maxB = Math.max(2, Math.round(BMax))
    const samples = 180

    for (let i = 1; i <= samples; i += 1) {
      const x = Math.max(1, Math.round((i / samples) * maxB))
      const m = calcMetrics({ B: x, NActive, C, NTotal, BW, L, bytesPerToken })
      points.push({
        B: x,
        costMemory: m.costMemory,
        costCompute: m.costCompute,
        costKV: m.costKV,
        costTotal: m.costTotal,
      })
    }

    return points.filter(
      (point, index, array) => index === 0 || point.B !== (array[index - 1]?.B ?? -1),
    )
  }, [BMax, NActive, C, NTotal, BW, L, bytesPerToken])

  const current = useMemo<Metrics>(
    () => calcMetrics({ B: safeB, NActive, C, NTotal, BW, L, bytesPerToken }),
    [safeB, NActive, C, NTotal, BW, L, bytesPerToken],
  )

  const atB1 = useMemo<Metrics>(
    () => calcMetrics({ B: 1, NActive, C, NTotal, BW, L, bytesPerToken }),
    [NActive, C, NTotal, BW, L, bytesPerToken],
  )

  // Sweet spot exists where the descending hyperbola crosses the compute floor:
  // N_total / (B × BW) + L × b / BW = N_active / C
  // => B* = N_total / (BW × (N_active / C - L × b / BW))
  // Only meaningful when (N_active / C - L × b / BW) > 0,
  // i.e. compute constant sits above the KV constant.
  const intersection = useMemo<number | null>(() => {
    const denom = NActive / C - (L * bytesPerToken) / BW
    if (denom <= 0) return null
    const bStar = NTotal / BW / denom
    if (!Number.isFinite(bStar) || bStar < 1 || bStar > BMax) return null
    return bStar
  }, [NActive, C, NTotal, BW, L, bytesPerToken, BMax])

  const costFloor = Math.max(current.costCompute, current.costKV)
  const savingRatio = costFloor > 0 ? atB1.costTotal / costFloor : Infinity

  // Y-axis stays linear so the hyperbola's actual geometry (the "shoots up to
  // infinity as B → 0" character) is preserved — this is the whole point of
  // the chart. To stop the leftmost near-asymptotic values from compressing
  // the sweet-spot region into a sliver, drop the very leftmost ~1.5% of
  // samples when picking yMax: the hyperbola still climbs dramatically off the
  // left edge of view, but it doesn't get to dictate the vertical scale.
  // yMax is purely data-driven (doesn't depend on the current B), so dragging
  // B around won't make the chart jitter.
  const yMax = useMemo<number>(() => {
    if (data.length === 0) return 1
    const skip = Math.max(2, Math.floor(data.length * 0.05))
    let dataMax = 0
    for (let i = skip; i < data.length; i += 1) {
      const d = data[i]
      if (!d) continue
      const point = Math.max(d.costMemory, d.costCompute, d.costTotal)
      if (point > dataMax) dataMax = point
    }
    if (!Number.isFinite(dataMax) || dataMax <= 0) return 1
    return dataMax * 1.15
  }, [data])

  return {
    B,
    setB,
    BMax,
    setBMax,
    NActive,
    setNActive,
    C,
    setC,
    NTotal,
    setNTotal,
    BW,
    setBW,
    L,
    setL,
    bytesPerToken,
    setBytesPerToken,
    safeB,
    data,
    current,
    atB1,
    intersection,
    costFloor,
    savingRatio,
    yMax,
  }
}

interface CostBatchSimulatorProps {
  /** UI language for labels, helpers, and notes. Defaults to `zh`. */
  lang?: Lang
}

export function CostBatchSimulator({ lang = 'zh' }: CostBatchSimulatorProps = {}) {
  const t = MESSAGES[lang]
  const sim = useSimulator()
  const [chartReady, setChartReady] = useState(false)
  useEffect(() => setChartReady(true), [])

  // next-themes is undefined during SSR; treat as light until mounted to
  // avoid hydration mismatch, then switch to whatever theme is resolved.
  const { resolvedTheme } = useTheme()
  const chartTheme =
    chartReady && resolvedTheme === 'dark' ? DARK_CHART_THEME : LIGHT_CHART_THEME

  const {
    safeB,
    BMax,
    NActive,
    C,
    NTotal,
    BW,
    L,
    bytesPerToken,
    data,
    current,
    atB1,
    intersection,
    costFloor,
    savingRatio,
    yMax,
    setB,
    setBMax,
    setNActive,
    setC,
    setNTotal,
    setBW,
    setL,
    setBytesPerToken,
  } = sim

  const bottleneckText =
    current.bottleneck === 'memory'
      ? t.bottleneckValue.memory
      : t.bottleneckValue.compute
  const totalCostText = formatMs(current.costTotal)
  const bottleneckNote = intersection
    ? t.cards.notes.bottleneckHas(formatCompact(intersection), totalCostText)
    : t.cards.notes.bottleneckNone(totalCostText)
  const sharePct = (current.kvShare * 100).toFixed(2)
  const ratioText = Number.isFinite(savingRatio)
    ? formatCompact(savingRatio, 0)
    : '∞'

  return (
    <div className={styles.root}>
      <div className={styles.stack}>
        <div className={styles.panel}>
          <div className={styles.header}>
            <h3 className={styles.title}>Cost / Token vs Batch Size Simulator</h3>
            <p className={styles.subtitle}>
              Cost / token = max(N_total / (B·BW) + L·b / BW, N_active / C)
            </p>
            <div className={styles.desc}>{t.desc}</div>
          </div>
        </div>

        <div className={styles.controls}>
          <LinearControl
            label={t.controls.currentB.label}
            value={safeB}
            setValue={setB}
            min={1}
            max={BMax}
            step={1}
            accentColor={COLORS.total}
            helper={t.controls.currentB.helper}
          />

          <LinearControl
            label={t.controls.maxB.label}
            value={BMax}
            setValue={(value) => {
              const next = clamp(value, 128, 8192)
              setBMax(next)
              setB((oldB) => Math.min(oldB, next))
            }}
            min={128}
            max={8192}
            step={128}
            accentColor={COLORS.total}
            helper={t.controls.maxB.helper}
          />

          <LogControl
            accentColor={COLORS.compute}
            label={t.controls.nActive.label}
            value={NActive}
            setValue={setNActive}
            min={1e6}
            max={500e9}
            unit="params"
            helper={t.controls.nActive.helper}
          />

          <LogControl
            accentColor={COLORS.compute}
            label={t.controls.compute.label}
            value={C}
            setValue={setC}
            min={1e10}
            max={5e15}
            unit="ops/s"
            helper={t.controls.compute.helper}
          />

          <LogControl
            accentColor={COLORS.memory}
            label={t.controls.nTotal.label}
            value={NTotal}
            setValue={setNTotal}
            min={1e6}
            max={1e12}
            unit="params"
            helper={t.controls.nTotal.helper}
          />

          <LogControl
            accentColor={COLORS.memory}
            label={t.controls.bw.label}
            value={BW}
            setValue={setBW}
            min={1e9}
            max={1e13}
            unit="B/s"
            helper={t.controls.bw.helper}
          />

          <LinearControl
            accentColor={COLORS.kv}
            label={t.controls.seqLen.label}
            value={L}
            setValue={setL}
            min={128}
            max={1048576}
            step={1024}
            unit="token"
            helper={t.controls.seqLen.helper}
          />

          <LogControl
            accentColor={COLORS.kv}
            label={t.controls.bytesPerToken.label}
            value={bytesPerToken}
            setValue={setBytesPerToken}
            min={1024}
            max={1048576}
            unit="B/token"
            helper={t.controls.bytesPerToken.helper}
          />
        </div>

        <div className={styles.statGrid}>
          <StatCard
            className={styles.statSpanFull}
            label={t.cards.bottleneckLabel}
            value={bottleneckText}
            note={bottleneckNote}
          />
          <StatCard
            label={t.cards.currentCostLabel(safeB)}
            value={formatMs(current.costTotal)}
            note={t.cards.notes.currentCost}
          />
          <StatCard
            label={t.cards.memoryCostLabel}
            value={formatMs(current.costMemory)}
            note={t.cards.notes.memoryCost}
          />
          <StatCard
            label={t.cards.computeCostLabel}
            value={formatMs(current.costCompute)}
            note={t.cards.notes.computeCost}
          />
          <StatCard
            label={t.cards.costAtB1Label}
            value={formatMs(atB1.costTotal)}
            note={t.cards.notes.costAtB1}
          />
          <StatCard
            label={t.cards.costFloorLabel}
            value={formatMs(costFloor)}
            note={t.cards.notes.costFloor}
          />
          <StatCard
            label={t.cards.ratioLabel}
            value={`${ratioText}×`}
            note={t.cards.notes.ratio}
          />
        </div>

        <div className={styles.chart}>
          {chartReady ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                <XAxis
                  dataKey="B"
                  tick={{ fontSize: 10, fill: chartTheme.tickFill }}
                  label={{
                    value: t.axis.x,
                    position: 'insideBottom',
                    offset: -8,
                    style: { fill: chartTheme.labelFill, fontSize: 11 },
                  }}
                />
                <YAxis
                  domain={[0, yMax]}
                  allowDataOverflow
                  tick={{ fontSize: 10, fill: chartTheme.tickFill }}
                  tickFormatter={(value: number) => formatMs(value, false)}
                  width={56}
                  label={{
                    value: t.axis.y,
                    angle: -90,
                    position: 'insideLeft',
                    offset: 12,
                    style: { fill: chartTheme.labelFill, fontSize: 11, textAnchor: 'middle' },
                  }}
                />
                <Tooltip
                  formatter={(value) => formatMs(Number(value))}
                  labelFormatter={(value) => `B = ${value}`}
                  contentStyle={{
                    borderRadius: 10,
                    background: chartTheme.tooltipBg,
                    border: `1px solid ${chartTheme.tooltipBorder}`,
                    boxShadow: chartTheme.tooltipShadow,
                    color: chartTheme.tooltipText,
                    fontSize: 11,
                    padding: '6px 10px',
                  }}
                  labelStyle={{ color: chartTheme.tooltipText }}
                  itemStyle={{ color: chartTheme.tooltipText }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{
                    fontSize: 11,
                    paddingBottom: 12,
                    color: chartTheme.labelFill,
                  }}
                />
                <ReferenceLine
                  x={safeB}
                  stroke={chartTheme.refLineStroke}
                  strokeDasharray="4 4"
                  label={{ value: `B=${safeB}`, fill: chartTheme.refLineLabel, fontSize: 10 }}
                />
                {intersection ? (
                  <ReferenceLine
                    x={intersection}
                    stroke={chartTheme.bStarStroke}
                    strokeDasharray="5 5"
                    label={{ value: 'B*', fill: chartTheme.bStarLabel, fontSize: 10 }}
                  />
                ) : null}
                <Line
                  type="monotone"
                  dataKey="costTotal"
                  stroke={COLORS.total}
                  dot={false}
                  strokeWidth={3}
                  style={{ filter: `drop-shadow(0 0 6px ${GLOW.total})` }}
                  name={t.series.total}
                />
                <Line
                  type="monotone"
                  dataKey="costMemory"
                  stroke={COLORS.memory}
                  dot={false}
                  strokeWidth={1.6}
                  style={{ filter: `drop-shadow(0 0 5px ${GLOW.memory})` }}
                  name={t.series.memory}
                />
                <Line
                  type="monotone"
                  dataKey="costCompute"
                  stroke={COLORS.compute}
                  dot={false}
                  strokeWidth={1.6}
                  style={{ filter: `drop-shadow(0 0 5px ${GLOW.compute})` }}
                  name={t.series.compute}
                />
                <Line
                  type="monotone"
                  dataKey="costKV"
                  stroke={COLORS.kv}
                  dot={false}
                  strokeWidth={1.3}
                  strokeDasharray="4 4"
                  style={{ filter: `drop-shadow(0 0 4px ${GLOW.kv})` }}
                  name={t.series.kv}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : null}
        </div>

        <div className={styles.notesGrid}>
          <div className={styles.note}>
            <div className={styles.noteTitle}>{t.panels.chartCheatTitle}</div>
            <p>{t.panels.chartCheatBody}</p>
          </div>

          <div className={styles.note}>
            <div className={styles.noteTitle}>{t.panels.paramSummaryTitle}</div>
            <p>
              {t.panels.paramSummary({
                NActive: formatCompact(NActive),
                C: formatCompact(C),
                NTotal: formatCompact(NTotal),
                BW: formatCompact(BW),
                L: formatCompact(L),
                bytesPerToken: formatCompact(bytesPerToken),
              })}
            </p>
            <p className={styles.noteSub}>
              {t.panels.ratioNote(ratioText, sharePct)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
