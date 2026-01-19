'use client';

import { ActivityType } from '@/hooks/useActivityFeed';

interface ActivityFiltersProps {
  currentFilter: ActivityType;
  onFilterChange: (filter: ActivityType) => void;
  counts?: {
    all?: number;
    buys?: number;
    sells?: number;
    whales?: number;
  };
}

const FILTERS: { value: ActivityType; label: string; icon: string; color: string }[] = [
  { value: 'all', label: 'All', icon: '📊', color: 'orange' },
  { value: 'buys', label: 'Buys', icon: '🟢', color: 'green' },
  { value: 'sells', label: 'Sells', icon: '🔴', color: 'red' },
  { value: 'whales', label: 'Whales', icon: '🐋', color: 'purple' },
];

export function ActivityFilters({
  currentFilter,
  onFilterChange,
  counts,
}: ActivityFiltersProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {FILTERS.map((filter) => {
        const isActive = currentFilter === filter.value;
        const count = counts?.[filter.value];

        // Determine colors based on filter type
        const getColors = () => {
          if (!isActive) {
            return 'bg-[#1a1f2e] border-[#2a3544] text-gray-400 hover:text-white hover:border-[#3a4554]';
          }

          switch (filter.color) {
            case 'green':
              return 'bg-green-500/20 border-green-500/50 text-green-400';
            case 'red':
              return 'bg-red-500/20 border-red-500/50 text-red-400';
            case 'purple':
              return 'bg-purple-500/20 border-purple-500/50 text-purple-400';
            default:
              return 'bg-orange-500/20 border-orange-500/50 text-orange-400';
          }
        };

        return (
          <button
            key={filter.value}
            onClick={() => onFilterChange(filter.value)}
            className={`
              flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-semibold
              transition-all whitespace-nowrap flex-shrink-0
              ${getColors()}
            `}
          >
            <span>{filter.icon}</span>
            <span>{filter.label}</span>
            {count !== undefined && count > 0 && (
              <span className={`
                text-xs px-1.5 py-0.5 rounded-full
                ${isActive ? 'bg-white/20' : 'bg-gray-700'}
              `}>
                {count > 99 ? '99+' : count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// COMPACT VERSION (for token page)
// ============================================================================

export function ActivityFiltersCompact({
  currentFilter,
  onFilterChange,
}: Omit<ActivityFiltersProps, 'counts'>) {
  return (
    <div className="flex items-center gap-1 bg-[#12121a] rounded-lg p-1">
      {FILTERS.map((filter) => {
        const isActive = currentFilter === filter.value;

        return (
          <button
            key={filter.value}
            onClick={() => onFilterChange(filter.value)}
            className={`
              px-3 py-1.5 rounded-md text-xs font-semibold transition-all
              ${isActive
                ? 'bg-[#2a3544] text-white'
                : 'text-gray-500 hover:text-gray-300'
              }
            `}
          >
            {filter.icon} {filter.label}
          </button>
        );
      })}
    </div>
  );
}
