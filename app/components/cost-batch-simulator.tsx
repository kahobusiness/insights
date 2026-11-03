'use client'

import dynamic from 'next/dynamic'
import type { CostBatchSimulatorProps } from './cost-batch-simulator-impl'

// A client-side split point keeps Recharts out of the shared MDX route bundle.
// Keep SSR enabled so the simulator's labels and controls remain prerendered.
export const CostBatchSimulator = dynamic<CostBatchSimulatorProps>(() =>
  import('./cost-batch-simulator-impl').then(module => module.CostBatchSimulator)
)
