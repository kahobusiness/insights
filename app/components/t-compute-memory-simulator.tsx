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
  desc: '使用更适合观察 KV cache 影响的中等规格推理卡参数。这里故意降低带宽与总参数量，让 L 与 b 对 T_memory 的影响更加明显。',
  B: 128,
  BMax: 2048,
  NActive: 8e9,
  C: 8e13,
  NTotal: 12e9,
  BW: 2e11,
  L: 8192,
  bytesPerToken: 2,
} as const

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
  bottleneck: 'Compute-bound' | 'Memory-bound'
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
    bottleneck: T_compute > T_memory ? 'Compute-bound' : 'Memory-bound',
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

export function TComputeMemorySimulator() {
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

  return (
    <div className={styles.root}>
      <div className={styles.stack}>
        <div className={styles.panel}>
          <div className={styles.header}>
            <h3 className={styles.title}>T_compute / T_memory Batch Size Simulator</h3>
            <p className={styles.subtitle}>
              T_compute = B × N_active / C，T_memory = N_total / BW + B × L × b / BW
            </p>
            <div className={styles.desc}>{DEFAULTS.desc}</div>
          </div>
        </div>

        <div className={styles.controls}>
          <LinearControl
            label="当前 B"
            value={safeB}
            setValue={setB}
            min={1}
            max={BMax}
            step={1}
            accentColor={COLORS.compute}
            helper="当前 batch size，标记图上竖线"
          />

          <LinearControl
            label="B 最大值"
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
            helper="横轴范围，常用 512 / 2048 / 4096"
          />

          <LogControl
            accentColor={COLORS.compute}
            label="N_active"
            value={NActive}
            setValue={setNActive}
            min={1e6}
            max={500e9}
            unit="params"
            helper="每 token 激活的参数量。MoE 通常更小"
          />

          <LogControl
            accentColor={COLORS.compute}
            label="C"
            value={C}
            setValue={setC}
            min={1e10}
            max={5e15}
            unit="ops/s"
            helper="有效计算吞吐"
          />

          <LogControl
            accentColor={COLORS.memory}
            label="N_total"
            value={NTotal}
            setValue={setNTotal}
            min={1e6}
            max={1e12}
            unit="params"
            helper="需要从内存读取的总参数 / 数据规模"
          />

          <LogControl
            accentColor={COLORS.memory}
            label="BW"
            value={BW}
            setValue={setBW}
            min={1e9}
            max={1e13}
            unit="B/s"
            helper="有效内存带宽"
          />

          <LinearControl
            accentColor={COLORS.kv}
            label="L"
            value={L}
            setValue={setL}
            min={128}
            max={1048576}
            step={1024}
            unit="tok"
            helper="序列长度 / KV 长度，最大 1M token"
          />

          <LinearControl
            accentColor={COLORS.kv}
            label="b"
            value={bytesPerToken}
            setValue={setBytesPerToken}
            min={1}
            max={8}
            step={1}
            unit="B"
            helper="每元素字节数：FP16≈2，FP8≈1，FP32≈4"
          />
        </div>

        <div className={styles.statGrid}>
          <StatCard
            className={styles.statSpanFull}
            label="Bottleneck"
            value={current.bottleneck}
            note={
              intersection
                ? `交点 B* ≈ ${formatCompact(intersection)} · Estimated Latency ${formatMs(current.total)}`
                : `当前范围内没有交点 · Estimated Latency ${formatMs(current.total)}`
            }
          />
          <StatCard
            label={`T_compute @ B=${safeB}`}
            value={formatMs(current.T_compute)}
            note="B × N_active / C"
          />
          <StatCard
            label={`T_memory @ B=${safeB}`}
            value={formatMs(current.T_memory)}
            note="weight + KV"
          />
          <StatCard
            label="Estimated Latency"
            value={formatMs(current.total)}
            note="max(T_compute, T_memory)"
          />
          <StatCard
            label="Memory weight term"
            value={formatMs(current.memoryWeight)}
            note="N_total / BW，决定截距"
          />
          <StatCard
            label="Memory KV term"
            value={formatMs(current.memoryKV)}
            note={`B×L×b/BW，占 ${(current.kvShare * 100).toFixed(2)}%`}
          />
          <StatCard
            label="Memory slope"
            value={formatMs(current.memorySlope)}
            note="每加 1 个 B 的 T_memory 增量"
          />
        </div>

        <div className={styles.chart}>
          {chartReady ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="B"
                tick={{ fontSize: 10, fill: '#64748b' }}
                label={{
                  value: 'Batch size B',
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
                  value: 'Time (ms)',
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
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
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
            <div className={styles.noteTitle}>读图小抄</div>
            <p>
              T_compute 的斜率是 N_active / C；T_memory 的斜率是 L × b / BW，截距是 N_total / BW。
              在超高带宽和超大参数量下，KV 项通常远小于权重读取项，所以调 L 和 b 不容易让总 T_memory 斜率明显变化。
            </p>
          </div>

          <div className={styles.note}>
            <div className={styles.noteTitle}>当前参数速览</div>
            <p>
              N_active={formatCompact(NActive)}，C={formatCompact(C)} ops/s，N_total=
              {formatCompact(NTotal)}，BW={formatCompact(BW)} B/s，L={formatCompact(L)}，b=
              {bytesPerToken}B。
            </p>
            <p className={styles.noteSub}>
              Compute / Memory 比值：{formatCompact(current.ratio)}。KV 项占比：
              {(current.kvShare * 100).toFixed(2)}%。继续提高 L、提高 b、降低 BW，都能明显拉高 T_memory 的斜率。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
