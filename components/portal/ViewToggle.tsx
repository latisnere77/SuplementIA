/**
 * View Toggle Component - Modern & Professional
 * Allows users to switch between Standard and Examine-style views
 */

'use client';

export type ViewMode = 'standard' | 'examine';

interface ViewToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewToggle({ mode, onChange }: ViewToggleProps) {
  return (
    <div className="inline-flex items-center gap-1 p-1 bg-gray-100 rounded-lg mb-6">
      <button
        type="button"
        onClick={() => onChange('standard')}
        className={`
          px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
          ${mode === 'standard'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
          }
        `}
      >
        Vista Estándar
      </button>
      <button
        type="button"
        onClick={() => onChange('examine')}
        className={`
          px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
          ${mode === 'examine'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
          }
        `}
      >
        Vista Cuantitativa
      </button>
    </div>
  );
}
