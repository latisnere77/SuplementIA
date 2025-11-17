/**
 * ExpandableSection Component
 * 
 * Collapsible section with smooth animations
 * Used for OpportunityCard sections
 */

'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExpandableSectionProps {
  title: string
  icon?: React.ReactNode
  badge?: string
  defaultExpanded?: boolean
  isExpanded?: boolean
  children: React.ReactNode
  className?: string
  headerClassName?: string
  contentClassName?: string
  onToggle?: (expanded?: boolean) => void
}

export function ExpandableSection({
  title,
  icon,
  badge,
  defaultExpanded = false,
  isExpanded: controlledIsExpanded,
  children,
  className,
  headerClassName,
  contentClassName,
  onToggle,
}: ExpandableSectionProps) {
  const [internalIsExpanded, setInternalIsExpanded] = React.useState(defaultExpanded)

  // Use controlled state if provided, otherwise use internal state
  const isExpanded = controlledIsExpanded !== undefined ? controlledIsExpanded : internalIsExpanded

  const handleToggle = () => {
    const newState = !isExpanded
    if (controlledIsExpanded === undefined) {
      setInternalIsExpanded(newState)
    }
    onToggle?.(newState)
  }

  return (
    <div className={cn('border border-border rounded-lg overflow-hidden', className)}>
      {/* Header */}
      <button
        onClick={handleToggle}
        className={cn(
          'w-full p-4 flex items-center justify-between',
          'bg-muted/50 hover:bg-muted transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          headerClassName
        )}
        aria-expanded={isExpanded}
        aria-controls={`expandable-content-${title}`}
      >
        <div className="flex items-center gap-3">
          {icon && (
            <div className="flex-shrink-0">
              {icon}
            </div>
          )}
          <span className="font-semibold text-left">{title}</span>
          {badge && (
            <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
              {badge}
            </span>
          )}
        </div>
        
        <div className="flex-shrink-0">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            id={`expandable-content-${title}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.3, ease: 'easeInOut' },
              opacity: { duration: 0.2, ease: 'easeInOut' }
            }}
            className="overflow-hidden"
          >
            <div className={cn('p-4 bg-background', contentClassName)}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
