/**
 * Operator Actions - Manual Operations Panel
 * Panel/UI for manual pipeline operations
 */

import React, { useState } from 'react';
import type { OperatorActor } from '../types';
import { OPERATOR_ACTION_TYPES } from '../types';
import { buildOperatorActionPermissionState } from '../permissions/operatorActionPermissions';

// Form imports
import { ManualSearchCrawlForm } from '../forms/ManualSearchCrawlForm';
import { ManualAiEnrichmentForm } from '../forms/ManualAiEnrichmentForm';
import { ManualPublishPreparationForm } from '../forms/ManualPublishPreparationForm';
import { ManualPublisherRunForm } from '../forms/ManualPublisherRunForm';

// =============================================================================
// PROP TYPES
// =============================================================================

export interface ManualOperationsPanelProps {
  /** Current user */
  actor: OperatorActor;

  /** Callback when operation starts */
  onSuccess?: (action: string, result?: unknown) => void;

  /** Callback when operation fails */
  onError?: (action: string, error: Error) => void;

  /** Custom class name */
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Manual operations panel with forms
 */
export function ManualOperationsPanel({
  actor,
  onSuccess,
  onError,
  className = '',
}: ManualOperationsPanelProps) {
  const [activeTab, setActiveTab] = useState<string>('crawl');

  // Check permissions for each operation
  const canTriggerSearchCrawl = buildOperatorActionPermissionState(
    actor,
    OPERATOR_ACTION_TYPES.TRIGGER_SEARCH_CRAWL
  ).canExecute;

  const canTriggerAiEnrichment = buildOperatorActionPermissionState(
    actor,
    OPERATOR_ACTION_TYPES.TRIGGER_AI_ENRICHMENT
  ).canExecute;

  const canTriggerPublishPreparation = buildOperatorActionPermissionState(
    actor,
    OPERATOR_ACTION_TYPES.TRIGGER_PUBLISH_PREPARATION
  ).canExecute;

  const canTriggerPublisherRun = buildOperatorActionPermissionState(
    actor,
    OPERATOR_ACTION_TYPES.TRIGGER_PUBLISHER_RUN
  ).canExecute;

  const tabs = [
    { id: 'crawl', label: 'Crawl', icon: '🔍' },
    { id: 'enrichment', label: 'AI Enrichment', icon: '🤖' },
    { id: 'publish', label: 'Publish', icon: '📤' },
  ];

  return (
    <div className={`manual-operations-panel ${className}`}>
      <h2 className="manual-operations-panel__title">Manual Operations</h2>
      <p className="manual-operations-panel__description">
        Trigger manual operations for the affiliate automation system
      </p>

      {/* Tabs */}
      <div className="manual-operations-panel__tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`manual-operations-panel__tab ${activeTab === tab.id ? 'manual-operations-panel__tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="manual-operations-panel__tab-icon">{tab.icon}</span>
            <span className="manual-operations-panel__tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="manual-operations-panel__content">
        {activeTab === 'crawl' && (
          <div className="manual-operations-panel__section">
            <h3 className="manual-operations-panel__section-title">Search Crawl</h3>
            {canTriggerSearchCrawl ? (
              <ManualSearchCrawlForm
                actor={actor}
                onSuccess={(result) => onSuccess?.('search_crawl', result)}
                onError={(error) => onError?.('search_crawl', error)}
              />
            ) : (
              <PermissionDeniedMessage />
            )}
          </div>
        )}

        {activeTab === 'enrichment' && (
          <div className="manual-operations-panel__section">
            <h3 className="manual-operations-panel__section-title">AI Enrichment</h3>
            {canTriggerAiEnrichment ? (
              <ManualAiEnrichmentForm
                actor={actor}
                onSuccess={(result) => onSuccess?.('ai_enrichment', result)}
                onError={(error) => onError?.('ai_enrichment', error)}
              />
            ) : (
              <PermissionDeniedMessage />
            )}
          </div>
        )}

        {activeTab === 'publish' && (
          <div className="manual-operations-panel__section">
            <h3 className="manual-operations-panel__section-title">Publish Preparation</h3>
            {canTriggerPublishPreparation ? (
              <ManualPublishPreparationForm
                actor={actor}
                onSuccess={(result) => onSuccess?.('publish_preparation', result)}
                onError={(error) => onError?.('publish_preparation', error)}
              />
            ) : (
              <PermissionDeniedMessage />
            )}

            <h3 className="manual-operations-panel__section-title" style={{ marginTop: '24px' }}>
              Publisher Run
            </h3>
            {canTriggerPublisherRun ? (
              <ManualPublisherRunForm
                actor={actor}
                onSuccess={(result) => onSuccess?.('publisher_run', result)}
                onError={(error) => onError?.('publisher_run', error)}
              />
            ) : (
              <PermissionDeniedMessage />
            )}
          </div>
        )}
      </div>

      {/* Audit Notice */}
      <div className="manual-operations-panel__audit-notice">
        <span className="manual-operations-panel__audit-icon">ℹ️</span>
        <span>All manual operations are logged in the audit trail</span>
      </div>
    </div>
  );
}

/** Permission denied message */
function PermissionDeniedMessage() {
  return (
    <div className="manual-operations-panel__permission-denied">
      <p>You don't have permission to perform this operation.</p>
    </div>
  );
}

export default ManualOperationsPanel;
