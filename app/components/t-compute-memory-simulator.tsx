'use client'

import dynamic from 'next/dynamic'
import type { TComputeMemorySimulatorProps } from './t-compute-memory-simulator-impl'

export const TComputeMemorySimulator = dynamic<TComputeMemorySimulatorProps>(() =>
  import('./t-compute-memory-simulator-impl').then(module => module.TComputeMemorySimulator)
)
