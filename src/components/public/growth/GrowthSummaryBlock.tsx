/**
 * Growth Summary Block
 *
 * Summary content block for growth pages
 * - Clean, readable typography
 * - No clutter
 */

import React from 'react';
import type { GrowthSurfaceSummary } from '../../../growthPages/types/index.js';

interface GrowthSummaryBlockProps {
  summary: GrowthSurfaceSummary;
  className?: string;
}

/**
 * Growth summary block component
 */
export function GrowthSummaryBlock({
  summary,
  className = '',
}: GrowthSummaryBlockProps) {
  return (
    <section className={`mb-8 ${className}`}>
      {/* Title */}
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        {summary.title}
      </h1>

      {/* Subtitle */}
      {summary.subtitle && (
        <p className="text-lg text-gray-600 mb-4">
          {summary.subtitle}
        </p>
      )}

      {/* Description */}
      <p className="text-gray-700 leading-relaxed mb-6">
        {summary.description}
      </p>

      {/* Highlights */}
      {summary.highlights.length > 0 && (
        <ul className="space-y-2">
          {summary.highlights.map((highlight, index) => (
            <li key={index} className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="text-gray-700">{highlight}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
