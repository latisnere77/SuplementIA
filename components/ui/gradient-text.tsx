/**
 * GradientText Component
 * 
 * Animated gradient text effect for titles and important metrics
 * Based on 21st.dev Magic component
 */

'use client'

import * as React from 'react'
import { motion, type MotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

interface GradientTextProps extends Omit<React.HTMLAttributes<HTMLElement>, keyof MotionProps> {
  className?: string
  children: React.ReactNode
  as?: React.ElementType
  animate?: boolean
}

export function GradientText({ 
  className, 
  children, 
  as: Component = 'span',
  animate = true,
  ...props 
}: GradientTextProps) {
  const MotionComponent = motion.create(Component as any)
  
  return (
    <>
      {/* Gradient animation keyframes */}
      <style jsx global>{`
        @keyframes gradient-border {
          0%, 100% { border-radius: 37% 29% 27% 27% / 28% 25% 41% 37%; }
          25% { border-radius: 47% 29% 39% 49% / 61% 19% 66% 26%; }
          50% { border-radius: 57% 23% 47% 72% / 63% 17% 66% 33%; }
          75% { border-radius: 28% 49% 29% 100% / 93% 20% 64% 25%; }
        }
        
        @keyframes gradient-1 {
          0%, 100% { top: 0; right: 0; }
          50% { top: 50%; right: 25%; }
          75% { top: 25%; right: 50%; }
        }
        
        @keyframes gradient-2 {
          0%, 100% { top: 0; left: 0; }
          60% { top: 75%; left: 25%; }
          85% { top: 50%; left: 50%; }
        }
        
        @keyframes gradient-3 {
          0%, 100% { bottom: 0; left: 0; }
          40% { bottom: 50%; left: 25%; }
          65% { bottom: 25%; left: 50%; }
        }
        
        @keyframes gradient-4 {
          0%, 100% { bottom: 0; right: 0; }
          50% { bottom: 25%; right: 40%; }
          90% { bottom: 50%; right: 25%; }
        }
        
        :root {
          --color-1: 330 100% 40%;
          --color-2: 140 100% 55%;
          --color-3: 210 100% 30%;
          --color-4: 60 100% 70%;
        }
      `}</style>
      
      <MotionComponent
        className={cn(
          'relative inline-flex overflow-hidden bg-white dark:bg-black',
          className
        )}
        {...props}
      >
        {children}
        
        {animate && (
          <span className="pointer-events-none absolute inset-0 mix-blend-lighten dark:mix-blend-darken">
            <span className="pointer-events-none absolute -top-1/2 h-[30vw] w-[30vw] animate-[gradient-border_6s_ease-in-out_infinite,gradient-1_12s_ease-in-out_infinite_alternate] bg-[hsl(var(--color-1))] mix-blend-overlay blur-[1rem]" />
            <span className="pointer-events-none absolute right-0 top-0 h-[30vw] w-[30vw] animate-[gradient-border_6s_ease-in-out_infinite,gradient-2_12s_ease-in-out_infinite_alternate] bg-[hsl(var(--color-2))] mix-blend-overlay blur-[1rem]" />
            <span className="pointer-events-none absolute bottom-0 left-0 h-[30vw] w-[30vw] animate-[gradient-border_6s_ease-in-out_infinite,gradient-3_12s_ease-in-out_infinite_alternate] bg-[hsl(var(--color-3))] mix-blend-overlay blur-[1rem]" />
            <span className="pointer-events-none absolute -bottom-1/2 right-0 h-[30vw] w-[30vw] animate-[gradient-border_6s_ease-in-out_infinite,gradient-4_12s_ease-in-out_infinite_alternate] bg-[hsl(var(--color-4))] mix-blend-overlay blur-[1rem]" />
          </span>
        )}
      </MotionComponent>
    </>
  )
}
