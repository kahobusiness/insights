'use client'

import React, { useEffect, useMemo, useState } from 'react'
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

import styles from './t-compute-memory-simulator.module.css'

const COLORS = {
  compute: '#6366F1',
  memory: '#F43F8E',
  kv: '#14B8A6',
} as const

const GLOW = {
  compute: 'rgba(99,102,241,0.28)',
  memory: 'rgba(244,63,142,0.28)',
  kv: 'rgba(20,184,166,0.28)',
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
    tComputeLabel: (b: number) => string
    tMemoryLabel: (b: number) => string
    estimatedLatencyLabel: string
    memoryWeightLabel: string
    memoryKVLabel: string
    memorySlopeLabel: string
    notes: {
      tCompute: string
      tMemory: string
      latency: string
      memoryWeight: string
      memoryKV: (share: string) => string
      memorySlope: string
      crossoverHas: (bStar: string, total: string) => string
      crossoverNone: (total: string) => string
    }
  }
  bottleneckValue: { compute: string; memory: string }
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
}

const MESSAGES: Record<Lang, LocaleMessages> = {
  zh: {
    desc: '默认参数：DeepSeek V3（671B 总参数 / 37B 激活，MLA 把每 token KV 压到 ~70 KB）跑在 H200 上（4.8 TB/s HBM3e、FP8 等效算力 ~1 PFLOPS），上下文长度 1K（单轮 query 量级）。这套配置下甜蜜点 B* ≈ 6400 清晰可见。把 L 拖到 8K 看长上下文场景——你会看到甜蜜点从右边滑出 BMax 之外，进入 KV 主导工况；换硬件或多卡并发都救不回来，因为 C/BW 这个硬件常数（≈ 300）跨代变化非常慢。',
    controls: {
      currentB: { label: '当前 B', helper: '当前 batch size，标记图上竖线' },
      maxB: { label: 'B 最大值', helper: '横轴范围，常用 512 / 2048 / 4096' },
      nActive: { label: 'N_active', helper: '每 token 激活的参数量。MoE 通常更小' },
      compute: { label: 'C', helper: '有效计算吞吐' },
      nTotal: { label: 'N_total', helper: '需要从内存读取的总参数 / 数据规模' },
      bw: { label: 'BW', helper: '有效内存带宽' },
      seqLen: { label: 'L', helper: '序列长度均值 / KV 长度均值，最大 1M token' },
      bytesPerToken: { label: 'b', helper: '每 token 在 KV cache 里占的总字节数（= 2 × 层数 × KV heads × head_dim × 元素字节数），典型 4 KB ~ 数百 KB' },
    },
    cards: {
      bottleneckLabel: 'Bottleneck',
      tComputeLabel: (b) => `T_compute @ B=${b}`,
      tMemoryLabel: (b) => `T_memory @ B=${b}`,
      estimatedLatencyLabel: 'Estimated Latency',
      memoryWeightLabel: 'Memory weight term',
      memoryKVLabel: 'Memory KV term',
      memorySlopeLabel: 'Memory slope',
      notes: {
        tCompute: 'B × N_active / C',
        tMemory: 'weight + KV',
        latency: 'max(T_compute, T_memory)',
        memoryWeight: 'N_total / BW，决定截距',
        memoryKV: (share) => `B×L×b/BW，占 ${share}%`,
        memorySlope: '每加 1 个 B 的 T_memory 增量',
        crossoverHas: (bStar, total) =>
          `交点 B* ≈ ${bStar} · Estimated Latency ${total}`,
        crossoverNone: (total) => `当前范围内没有交点 · Estimated Latency ${total}`,
      },
    },
    bottleneckValue: { compute: 'Compute-bound', memory: 'Memory-bound' },
    panels: {
      chartCheatTitle: '读图小抄',
      chartCheatBody:
        'T_compute 的斜率是 N_active / C；T_memory 的斜率是 L × b / BW，截距是 N_total / BW。b 是每 token 在 KV cache 里占的总字节数（已经把层数、KV 头数、head_dim 都乘进去了，落在几 KB ~ 几百 KB 量级），所以调 L 或调 b 都会立刻让 T_memory 斜率明显变化。',
      paramSummaryTitle: '当前参数速览',
      paramSummary: (p) =>
        `N_active=${p.NActive}，C=${p.C} ops/s，N_total=${p.NTotal}，BW=${p.BW} B/s，L=${p.L}，b=${p.bytesPerToken} B/token。`,
      ratioNote: (ratio, share) =>
        `Compute / Memory 比值：${ratio}。KV 项占比：${share}%。继续提高 L、提高 b、降低 BW，都能明显拉高 T_memory 的斜率。`,
    },
    axis: { x: 'Batch size B', y: 'Time (ms)' },
  },
  en: {
    desc: 'Defaults: DeepSeek V3 (671B total / 37B active, MLA brings KV down to ~70 KB / token) on H200 (4.8 TB/s HBM3e, ~1 PFLOPS effective FP8), with a 1K context (single-turn-query scale). The sweet spot sits at B* ≈ 6400, clearly visible. Drag L up to 8K to enter the long-context regime — you\'ll see the sweet spot slide off the right edge into KV-dominated land. Bigger GPUs or multi-GPU parallelism don\'t save you, because the C/BW ratio (~300) barely changes across hardware generations.',
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
        helper: 'Total KV bytes per token (= 2 × layers × KV heads × head_dim × bytes_per_element); typically 4 KB ~ several hundred KB',
      },
    },
    cards: {
      bottleneckLabel: 'Bottleneck',
      tComputeLabel: (b) => `T_compute @ B=${b}`,
      tMemoryLabel: (b) => `T_memory @ B=${b}`,
      estimatedLatencyLabel: 'Estimated Latency',
      memoryWeightLabel: 'Memory weight term',
      memoryKVLabel: 'Memory KV term',
      memorySlopeLabel: 'Memory slope',
      notes: {
        tCompute: 'B × N_active / C',
        tMemory: 'weight + KV',
        latency: 'max(T_compute, T_memory)',
        memoryWeight: 'N_total / BW — sets the intercept',
        memoryKV: (share) => `B×L×b/BW, ${share}% of total`,
        memorySlope: 'T_memory increase per +1 B',
        crossoverHas: (bStar, total) =>
          `Crossover B* ≈ ${bStar} · Estimated Latency ${total}`,
        crossoverNone: (total) =>
          `No crossover in the current range · Estimated Latency ${total}`,
      },
    },
    bottleneckValue: { compute: 'Compute-bound', memory: 'Memory-bound' },
    panels: {
      chartCheatTitle: 'Reading the chart',
      chartCheatBody:
        'T_compute slope is N_active / C; T_memory slope is L × b / BW, intercept N_total / BW. b is the total KV bytes per token — it already bakes in layers, KV heads, and head_dim, landing in the few-KB to few-hundred-KB range — so raising L or raising b will immediately steepen T_memory visibly.',
      paramSummaryTitle: 'Current parameters',
      paramSummary: (p) =>
        `N_active=${p.NActive}, C=${p.C} ops/s, N_total=${p.NTotal}, BW=${p.BW} B/s, L=${p.L}, b=${p.bytesPerToken} B/token.`,
      ratioNote: (ratio, share) =>
        `Compute / Memory ratio: ${ratio}. KV share: ${share}%. Increasing L, increasing b, or lowering BW will all visibly steepen T_memory.`,
    },
    axis: { x: 'Batch size B', y: 'Time (ms)' },
  },
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
  T_compute: number
  memoryWeight: number
  memoryKV: number
  T_memory: number
  total: number
  kvShare: number
  memorySlope: number
  bottleneck: 'compute' | 'memory'
  ratio: number
}

interface ChartPoint {
  B: number
  T_compute: number
  T_memory: number
  memoryWeight: number
  memoryKV: number
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

/** Format a time value (in seconds) as milliseconds, keeping ~3 significant
 *  digits without falling back to scientific notation. */
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

function calcMetrics({ B, NActive, C, NTotal, BW, L, bytesPerToken }: MetricsInput): Metrics {
  const T_compute = (B * NActive) / C
  const memoryWeight = NTotal / BW
  const memoryKV = (B * L * bytesPerToken) / BW
  const T_memory = memoryWeight + memoryKV
  const total = Math.max(T_compute, T_memory)

  return {
    T_compute,
    memoryWeight,
    memoryKV,
    T_memory,
    total,
    kvShare: T_memory === 0 ? 0 : memoryKV / T_memory,
    memorySlope: (L * bytesPerToken) / BW,
    bottleneck: T_compute > T_memory ? 'compute' : 'memory',
    ratio: T_memory === 0 ? Infinity : T_compute / T_memory,
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
        T_compute: m.T_compute,
        T_memory: m.T_memory,
        memoryWeight: m.memoryWeight,
        memoryKV: m.memoryKV,
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

  const intersection = useMemo<number | null>(() => {
    const denom = NActive / C - (L * bytesPerToken) / BW
    if (denom <= 0) return null
    const bStar = NTotal / BW / denom
    if (!Number.isFinite(bStar) || bStar < 1 || bStar > BMax) return null
    return bStar
  }, [NActive, C, NTotal, BW, L, bytesPerToken, BMax])

  const yMax = useMemo<number>(() => {
    const maxValue = Math.max(
      ...data.flatMap((item) => [item.T_compute, item.T_memory, item.memoryKV]),
    )
    return Number.isFinite(maxValue) && maxValue > 0 ? maxValue * 1.08 : 1
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
    intersection,
    yMax,
  }
}

interface TComputeMemorySimulatorProps {
  /** UI language for labels, helpers, and notes. Defaults to `zh`. */
  lang?: Lang
}

export function TComputeMemorySimulator({ lang = 'zh' }: TComputeMemorySimulatorProps = {}) {
  const t = MESSAGES[lang]
  const sim = useSimulator()
  const [chartReady, setChartReady] = useState(false)
  useEffect(() => setChartReady(true), [])
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
    intersection,
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
    current.bottleneck === 'compute'
      ? t.bottleneckValue.compute
      : t.bottleneckValue.memory
  const totalMs = formatMs(current.total)
  const bottleneckNote = intersection
    ? t.cards.notes.crossoverHas(formatCompact(intersection), totalMs)
    : t.cards.notes.crossoverNone(totalMs)
  const sharePct = (current.kvShare * 100).toFixed(2)

  return (
    <div className={styles.root}>
      <div className={styles.stack}>
        <div className={styles.panel}>
          <div className={styles.header}>
            <h3 className={styles.title}>T_compute / T_memory Batch Size Simulator</h3>
            <p className={styles.subtitle}>
              T_compute = B × N_active / C, T_memory = N_total / BW + B × L × b / BW
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
            accentColor={COLORS.compute}
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
            accentColor={COLORS.compute}
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
            label={t.cards.tComputeLabel(safeB)}
            value={formatMs(current.T_compute)}
            note={t.cards.notes.tCompute}
          />
          <StatCard
            label={t.cards.tMemoryLabel(safeB)}
            value={formatMs(current.T_memory)}
            note={t.cards.notes.tMemory}
          />
          <StatCard
            label={t.cards.estimatedLatencyLabel}
            value={formatMs(current.total)}
            note={t.cards.notes.latency}
          />
          <StatCard
            label={t.cards.memoryWeightLabel}
            value={formatMs(current.memoryWeight)}
            note={t.cards.notes.memoryWeight}
          />
          <StatCard
            label={t.cards.memoryKVLabel}
            value={formatMs(current.memoryKV)}
            note={t.cards.notes.memoryKV(sharePct)}
          />
          <StatCard
            label={t.cards.memorySlopeLabel}
            value={formatMs(current.memorySlope)}
            note={t.cards.notes.memorySlope}
          />
        </div>

        <div className={styles.chart}>
          {chartReady ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="B"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  label={{
                    value: t.axis.x,
                    position: 'insideBottom',
                    offset: -8,
                    style: { fill: '#475569', fontSize: 11 },
                  }}
                />
                <YAxis
                  domain={[0, yMax]}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickFormatter={(value: number) => formatMs(value, false)}
                  width={56}
                  label={{
                    value: t.axis.y,
                    angle: -90,
                    position: 'insideLeft',
                    offset: 12,
                    style: { fill: '#475569', fontSize: 11, textAnchor: 'middle' },
                  }}
                />
                <Tooltip
                  formatter={(value) => formatMs(Number(value))}
                  labelFormatter={(value) => `B = ${value}`}
                  contentStyle={{
                    borderRadius: 10,
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 14px rgba(15,23,42,0.12)',
                    fontSize: 11,
                    padding: '6px 10px',
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ fontSize: 11, paddingBottom: 12 }}
                />
                <ReferenceLine
                  x={safeB}
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  label={{ value: `B=${safeB}`, fill: '#475569', fontSize: 10 }}
                />
                {intersection ? (
                  <ReferenceLine
                    x={intersection}
                    stroke="#f59e0b"
                    strokeDasharray="5 5"
                    label={{ value: 'B*', fill: '#b45309', fontSize: 10 }}
                  />
                ) : null}
                <Line
                  type="monotone"
                  dataKey="T_compute"
                  stroke={COLORS.compute}
                  dot={false}
                  strokeWidth={2.5}
                  style={{ filter: `drop-shadow(0 0 6px ${GLOW.compute})` }}
                  name="T_compute"
                />
                <Line
                  type="monotone"
                  dataKey="T_memory"
                  stroke={COLORS.memory}
                  dot={false}
                  strokeWidth={2.5}
                  style={{ filter: `drop-shadow(0 0 6px ${GLOW.memory})` }}
                  name="T_memory"
                />
                <Line
                  type="monotone"
                  dataKey="memoryKV"
                  stroke={COLORS.kv}
                  dot={false}
                  strokeWidth={2}
                  style={{ filter: `drop-shadow(0 0 5px ${GLOW.kv})` }}
                  strokeDasharray="4 4"
                  name="KV part only"
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
              {t.panels.ratioNote(formatCompact(current.ratio), sharePct)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
