import React from 'react';
import { Filter, ArrowUpDown, X, Tag } from 'lucide-react';
import { Category, Priority, Status } from '../../types';

interface FilterBarProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  selectedPriority: string;
  onSelectPriority: (p: string) => void;
  selectedStatus: string;
  onSelectStatus: (s: string) => void;
  selectedSort: string;
  onSelectSort: (sort: string) => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  selectedPriority,
  onSelectPriority,
  selectedStatus,
  onSelectStatus,
  selectedSort,
  onSelectSort,
  onResetFilters,
  hasActiveFilters,
}) => {
  const statuses: { id: string; label: string }[] = [
    { id: 'all', label: 'All Tasks' },
    { id: 'pending', label: 'Pending' },
    { id: 'completed', label: 'Completed' },
    { id: 'overdue', label: 'Overdue' },
  ];

  const priorities: { id: string; label: string }[] = [
    { id: 'all', label: 'All Priorities' },
    { id: 'urgent', label: 'Urgent' },
    { id: 'high', label: 'High' },
    { id: 'medium', label: 'Medium' },
    { id: 'low', label: 'Low' },
  ];

  return (
    <div className="space-y-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
      {/* Top row: Status Tabs & Sort Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Status tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
          {statuses.map(st => (
            <button
              key={st.id}
              onClick={() => onSelectStatus(st.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                selectedStatus === st.id
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        {/* Right: Sort & Reset */}
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              className="text-xs text-slate-500 hover:text-rose-600 flex items-center gap-1 font-medium transition"
            >
              <X className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}

          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedSort}
              onChange={e => onSelectSort(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="date_asc">Due Date (Earliest First)</option>
              <option value="date_desc">Due Date (Latest First)</option>
              <option value="priority_desc">Priority (High to Low)</option>
              <option value="title_asc">Title (A-Z)</option>
              <option value="created_desc">Recently Added</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bottom row: Categories & Priority Chips */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Categories:
        </span>
        <button
          onClick={() => onSelectCategory('all')}
          className={`px-2.5 py-1 text-xs font-medium rounded-lg transition ${
            selectedCategory === 'all'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          All
        </button>

        {categories.map(c => (
          <button
            key={c._id}
            onClick={() => onSelectCategory(c.name)}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition flex items-center gap-1.5 ${
              selectedCategory.toLowerCase() === c.name.toLowerCase()
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: c.color || '#6366f1' }}
            />
            {c.name}
          </button>
        ))}

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />

        {/* Priority Filter */}
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden sm:inline">
            Priority:
          </span>
          {priorities.map(p => (
            <button
              key={p.id}
              onClick={() => onSelectPriority(p.id)}
              className={`px-2 py-0.5 text-[11px] font-medium rounded-md transition ${
                selectedPriority.toLowerCase() === p.id.toLowerCase()
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
