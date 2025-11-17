/**
 * Progress Component
 */

'use client'

import * as React from 'react'

interface ProgressProps {
  value: number
  className?: string
}

export function Progress({ value, className = '' }: ProgressProps) {
  return (
    <div className={`w-full h-2 bg-border rounded-full overflow-hidden ${className}`}>
      <div
        className="h-full bg-secondary-500 transition-all duration-300"
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  )
}
