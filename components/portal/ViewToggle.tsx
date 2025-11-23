/**
 * View Toggle Component
 * Allows users to switch between Standard and Examine-style views
 */

'use client';

import { Button } from '@/components/ui/button';
import { LayoutGrid, BarChart3 } from 'lucide-react';

export type ViewMode = 'standard' | 'examine';

interface ViewToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewToggle({ mode, onChange }: ViewToggleProps) {
  return (
    <div className="flex gap-2 mb-6 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
      <Button
        variant={mode === 'standard' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onChange('standard')}
        className="flex items-center gap-2"
      >
        <LayoutGrid className="h-4 w-4" />
        Vista Estándar
      </Button>
      <Button
        variant={mode === 'examine' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onChange('examine')}
        className="flex items-center gap-2"
      >
        <BarChart3 className="h-4 w-4" />
        Vista Cuantitativa
      </Button>
    </div>
  );
}
