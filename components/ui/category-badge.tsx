/**
 * CategoryBadge Component
 *
 * Visual indicator for formulation category (Nutriceuticals vs Cosmeticeuticals)
 * Displays category-specific icon, label, and color scheme
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { getCategoryBadgeProps, formatCategoryName } from '@/lib/utils/display-formatters';
import type { FormulationCategory } from '@/lib/utils/category-detection';

interface CategoryBadgeProps {
  category: FormulationCategory;
  showIcon?: boolean;
  showDescription?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function CategoryBadge({
  category,
  showIcon = true,
  showDescription = false,
  size = 'md',
  className = '',
}: CategoryBadgeProps) {
  const badgeProps = getCategoryBadgeProps(category);

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1',
  };

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <Badge
        variant={badgeProps.variant}
        className={`${badgeProps.color} ${sizeClasses[size]} font-medium`}
        title={badgeProps.description}
      >
        {showIcon && <span className="mr-1">{badgeProps.icon}</span>}
        {badgeProps.label}
      </Badge>
      {showDescription && (
        <span className="text-xs text-muted-foreground ml-1">{badgeProps.description}</span>
      )}
    </div>
  );
}

export default CategoryBadge;
