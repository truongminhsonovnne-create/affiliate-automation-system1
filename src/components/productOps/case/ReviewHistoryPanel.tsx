/**
 * Review History Panel
 *
 * Displays case history and audit trail
 */

import React from 'react';
import type { ProductOpsHistoryEntry } from '../../../features/productOps/types';

interface ReviewHistoryPanelProps {
  history: ProductOpsHistoryEntry[];
}

export function ReviewHistoryPanel({ history }: ReviewHistoryPanelProps) {
  if (history.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-2">
          History
        </h2>
        <p className="text-gray-500">No history available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="border-b border-gray-200 px-4 py-3">
        <h2 className="text-lg font-medium text-gray-900">
          History
        </h2>
      </div>

      <div className="divide-y divide-gray-200">
        {history.map((entry) => (
          <HistoryEntry key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  );
}

function HistoryEntry({ entry }: { entry: ProductOpsHistoryEntry }) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-gray-400" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900">
            <span className="font-medium">{entry.actorName}</span>
            {' '}{entry.action.toLowerCase()}
          </p>
          {entry.details && (
            <p className="text-sm text-gray-600 mt-1">{entry.details}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            {formatTimestamp(entry.timestamp)}
          </p>
        </div>
      </div>
    </div>
  );
}

function formatTimestamp(date: Date): string {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default ReviewHistoryPanel;
