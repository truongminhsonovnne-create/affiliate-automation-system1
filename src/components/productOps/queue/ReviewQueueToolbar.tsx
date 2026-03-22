/**
 * Review Queue Toolbar
 *
 * Filter and sort controls for review queue
 */

import React from 'react';
import type {
  ProductOpsCaseSeverity,
  ProductOpsCaseStatus,
  ProductOpsCaseType,
} from '../../../features/productOps/types';

interface ReviewQueueToolbarProps {
  // Filters
  selectedSeverities: ProductOpsCaseSeverity[];
  selectedStatuses: ProductOpsCaseStatus[];
  selectedCaseTypes: ProductOpsCaseType[];
  searchQuery: string;
  staleOnly: boolean;
  assignedToMe: boolean;

  // Filter setters
  onSeverityChange: (severities: ProductOpsCaseSeverity[]) => void;
  onStatusChange: (statuses: ProductOpsCaseStatus[]) => void;
  onCaseTypeChange: (types: ProductOpsCaseType[]) => void;
  onSearchChange: (query: string) => void;
  onStaleOnlyChange: (staleOnly: boolean) => void;
  onAssignedToMeChange: (assignedToMe: boolean) => void;
  onResetFilters: () => void;

  // Sort
  sortField: string;
  sortDirection: 'asc' | 'desc';
  onSortChange: (field: string, direction: 'asc' | 'desc') => void;

  // Counts
  activeFilterCount: number;
  totalResults?: number;
}

export function ReviewQueueToolbar({
  selectedSeverities,
  selectedStatuses,
  selectedCaseTypes,
  searchQuery,
  staleOnly,
  assignedToMe,
  onSeverityChange,
  onStatusChange,
  onCaseTypeChange,
  onSearchChange,
  onStaleOnlyChange,
  onAssignedToMeChange,
  onResetFilters,
  sortField,
  sortDirection,
  onSortChange,
  activeFilterCount,
  totalResults,
}: ReviewQueueToolbarProps) {
  const severities: ProductOpsCaseSeverity[] = ['critical', 'high', 'medium', 'low'];
  const statuses: ProductOpsCaseStatus[] = ['open', 'in_review', 'pending_decision', 'accepted', 'rejected', 'deferred', 'needs_more_evidence', 'closed'];

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      {/* Search Row */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search cases..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Quick Filters */}
        <button
          onClick={() => onAssignedToMeChange(!assignedToMe)}
          className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            assignedToMe
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Assigned to Me
        </button>

        <button
          onClick={() => onStaleOnlyChange(!staleOnly)}
          className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            staleOnly
              ? 'bg-red-100 text-red-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Stale Only
        </button>

        {activeFilterCount > 0 && (
          <button
            onClick={onResetFilters}
            className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Clear Filters ({activeFilterCount})
          </button>
        )}

        {totalResults !== undefined && (
          <span className="text-sm text-gray-500 ml-auto">
            {totalResults} results
          </span>
        )}
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Severity Filter */}
        <FilterDropdown
          label="Severity"
          selected={selectedSeverities}
          options={severities}
          onChange={onSeverityChange}
          formatOption={(s) => s.charAt(0).toUpperCase() + s.slice(1)}
        />

        {/* Status Filter */}
        <FilterDropdown
          label="Status"
          selected={selectedStatuses}
          options={statuses}
          onChange={onStatusChange}
          formatOption={(s) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
        />

        {/* Sort */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm text-gray-500">Sort by:</span>
          <select
            value={sortField}
            onChange={(e) => onSortChange(e.target.value, sortDirection)}
            className="px-2 py-1 text-sm border border-gray-300 rounded"
          >
            <option value="createdAt">Created</option>
            <option value="updatedAt">Updated</option>
            <option value="severity">Severity</option>
            <option value="status">Status</option>
          </select>
          <button
            onClick={() => onSortChange(sortField, sortDirection === 'asc' ? 'desc' : 'asc')}
            className="p-1 text-gray-600 hover:text-gray-900"
            title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
          >
            {sortDirection === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Filter Dropdown Component
function FilterDropdown<T extends string>({
  label,
  selected,
  options,
  onChange,
  formatOption,
}: {
  label: string;
  selected: T[];
  options: T[];
  onChange: (selected: T[]) => void;
  formatOption: (option: T) => string;
}) {
  const [isOpen, setIsOpen] = React.useState(false);

  const toggleOption = (option: T) => {
    if (selected.includes(option)) {
      onChange(selected.filter((o) => o !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
      >
        <span>{label}</span>
        {selected.length > 0 && (
          <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs">
            {selected.length}
          </span>
        )}
        <span>▼</span>
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg">
          <div className="py-1 max-h-60 overflow-y-auto">
            {options.map((option) => (
              <label
                key={option}
                className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(option)}
                  onChange={() => toggleOption(option)}
                  className="mr-2"
                />
                <span className="text-sm">{formatOption(option)}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ReviewQueueToolbar;
