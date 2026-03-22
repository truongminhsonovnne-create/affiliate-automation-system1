/**
 * Review Recommendation Panel
 *
 * Displays recommendation with clear separation from evidence
 */

import React from 'react';
import type { ProductOpsRecommendationModel } from '../../../features/productOps/types';

interface ReviewRecommendationPanelProps {
  recommendation?: ProductOpsRecommendationModel;
}

export function ReviewRecommendationPanel({ recommendation }: ReviewRecommendationPanelProps) {
  if (!recommendation) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-2">
          Recommendation
        </h2>
        <p className="text-gray-500">No recommendation available</p>
      </div>
    );
  }

  const confidenceColor = recommendation.confidence >= 0.7 ? 'text-green-600' :
    recommendation.confidence >= 0.4 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">
            Recommendation
          </h2>
          <ConfidenceBadge confidence={recommendation.confidence} color={confidenceColor} />
        </div>
      </div>

      {/* Recommendation Content */}
      <div className="px-4 py-3">
        <p className="text-gray-900 whitespace-pre-wrap">
          {recommendation.recommendation}
        </p>
      </div>

      {/* Priority & Risk */}
      <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
        <div className="flex items-center gap-4">
          <PriorityBadge priority={recommendation.priority} />
          {recommendation.riskAssessment && (
            <div className="text-sm">
              <span className="text-gray-500">Risk: </span>
              <span className="text-gray-700">{recommendation.riskAssessment}</span>
            </div>
          )}
        </div>
      </div>

      {/* Suggested Actions */}
      {recommendation.suggestedActions.length > 0 && (
        <div className="border-t border-gray-200 px-4 py-3">
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            Suggested Actions
          </h3>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
            {recommendation.suggestedActions.map((action, index) => (
              <li key={index}>{action}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Alternatives */}
      {recommendation.alternatives && recommendation.alternatives.length > 0 && (
        <div className="border-t border-gray-200 px-4 py-3">
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            Alternative Approaches
          </h3>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
            {recommendation.alternatives.map((alt, index) => (
              <li key={index}>{alt}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Confidence Badge
function ConfidenceBadge({ confidence, color }: { confidence: number; color: string }) {
  const label = confidence >= 0.7 ? 'High' : confidence >= 0.4 ? 'Medium' : 'Low';

  return (
    <span className={`text-sm font-medium ${color}`}>
      {label} Confidence ({Math.round(confidence * 100)}%)
    </span>
  );
}

// Priority Badge
function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    critical: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-green-100 text-green-800',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[priority] || colors.medium}`}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)} Priority
    </span>
  );
}

export default ReviewRecommendationPanel;
