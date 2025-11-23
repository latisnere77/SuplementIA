/**
 * View Toggle Component
 * Allows users to switch between Standard and Examine-style views
 */

'use client';

import { LayoutGrid, BarChart3 } from 'lucide-react';

export type ViewMode = 'standard' | 'examine';

interface ViewToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewToggle({ mode, onChange }: ViewToggleProps) {
  return (
    <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-lg w-fit">
      <button
        onClick={() => onChange('standard')}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors
          ${mode === 'standard' 
            ? 'bg-blue-600 text-white shadow-sm' 
            : 'bg-transparent text-gray-700 hover:bg-gray-200'
          }
        `}
      >
        <LayoutGrid className="h-4 w-4" />
        Vista Estándar
      </button>
      <button
        onClick={() => onChange('examine')}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors
          ${mode === 'examine' 
            ? 'bg-blue-600 text-white shadow-sm' 
            : 'bg-transparent text-gray-700 hover:bg-gray-200'
          }
        `}
      >
        <BarChart3 className="h-4 w-4" />
        Vista Cuantitativa
      </button>
    </div>
  );
}
