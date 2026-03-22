/**
 * Growth Support Cards
 *
 * Support content cards for growth pages
 * - How-to steps
 * - FAQ items
 * - Trust elements
 */

import React from 'react';
import type { ToolStep, FaqItem } from '../../../growthPages/types/index.js';

interface GrowthSupportCardsProps {
  type: 'steps' | 'faq';
  items: ToolStep[] | FaqItem[];
  className?: string;
}

/**
 * Tool steps component
 */
function ToolSteps({ steps }: { steps: ToolStep[] }) {
  return (
    <div className="space-y-6">
      {steps.map((step) => (
        <div key={step.number} className="flex gap-4">
          <div className="flex-shrink-0 w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center font-bold">
            {step.number}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">
              {step.title}
            </h3>
            <p className="text-gray-600 text-sm">
              {step.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * FAQ component
 */
function FaqItems({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="border rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            className="w-full px-4 py-3 text-left flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
            aria-expanded={openIndex === index}
          >
            <span className="font-medium text-gray-900">{item.question}</span>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${
                openIndex === index ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {openIndex === index && (
            <div className="px-4 py-3 bg-white text-gray-600 text-sm">
              {item.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Growth support cards component
 */
export function GrowthSupportCards({
  type,
  items,
  className = '',
}: GrowthSupportCardsProps) {
  if (items.length === 0) return null;

  return (
    <section className={`mt-12 ${className}`}>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        {type === 'steps' ? 'Cách sử dụng' : 'Câu hỏi thường gặp'}
      </h2>

      {type === 'steps' ? (
        <ToolSteps steps={items as ToolStep[]} />
      ) : (
        <FaqItems items={items as FaqItem[]} />
      )}
    </section>
  );
}
