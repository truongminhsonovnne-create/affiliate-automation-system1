/**
 * Review Evidence Panel
 *
 * Evidence-first presentation component
 */

import React from 'react';
import type { ProductOpsEvidencePanelModel } from '../../../features/productOps/types';

interface ReviewEvidencePanelProps {
  evidence: ProductOpsEvidencePanelModel;
}

export function ReviewEvidencePanel({ evidence }: ReviewEvidencePanelProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="border-b border-gray-200 px-4 py-3">
        <h2 className="text-lg font-medium text-gray-900">
          Evidence
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {evidence.summary}
        </p>
      </div>

      {/* Key Findings */}
      {evidence.keyFindings.length > 0 && (
        <div className="border-b border-gray-200 px-4 py-3 bg-yellow-50">
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            Key Findings
          </h3>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
            {evidence.keyFindings.map((finding, index) => (
              <li key={index}>{finding}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Evidence Sections */}
      {evidence.sections.length > 0 && (
        <div className="divide-y divide-gray-200">
          {evidence.sections.map((section, index) => (
            <EvidenceSection key={index} section={section} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {evidence.sections.length === 0 && evidence.keyFindings.length === 0 && (
        <div className="px-4 py-8 text-center text-gray-500">
          No evidence available
        </div>
      )}
    </div>
  );
}

// Evidence Section Component
function EvidenceSection({
  section,
}: {
  section: ProductOpsEvidencePanelModel['sections'][0];
}) {
  return (
    <div className="px-4 py-3">
      <h3 className="text-sm font-medium text-gray-900 mb-2">
        {section.title}
      </h3>

      {section.type === 'text' && (
        <p className="text-sm text-gray-700 whitespace-pre-wrap">
          {section.content}
        </p>
      )}

      {section.type === 'list' && (
        <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
          {section.content.split('\n').filter(Boolean).map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )}

      {section.type === 'code' && (
        <pre className="text-sm bg-gray-100 p-3 rounded-md overflow-x-auto">
          <code>{section.content}</code>
        </pre>
      )}

      {section.type === 'table' && section.data && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {Object.keys(section.data[0] || {}).map((key) => (
                  <th
                    key={key}
                    className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                  >
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {section.data.map((row, i) => (
                <tr key={i}>
                  {Object.values(row).map((value, j) => (
                    <td key={j} className="px-3 py-2 text-sm text-gray-700">
                      {String(value)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ReviewEvidencePanel;
