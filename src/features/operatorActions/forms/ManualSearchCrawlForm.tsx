/**
 * Operator Actions - Manual Search Crawl Form
 * Form component for triggering manual search crawl
 */

import React, { useState, useCallback } from 'react';
import { z } from 'zod';
import type { OperatorActor } from '../types';
import { OPERATOR_ACTION_TYPES } from '../types';
import {
  manualSearchCrawlSchema,
  type ManualSearchCrawlInput,
} from './manualRunSchemas';
import { buildConfirmationModel } from '../confirmation/buildConfirmationModel';
import { ActionConfirmationDialog } from '../components/ActionConfirmationDialog';
import { useTriggerSearchCrawlMutation } from '../mutations/usePipelineMutations';
import type { OperatorActionConfirmationModel } from '../types';

// =============================================================================
// PROP TYPES
// =============================================================================

export interface ManualSearchCrawlFormProps {
  /** Current user */
  actor: OperatorActor;

  /** Callback when form submits successfully */
  onSuccess?: (result: unknown) => void;

  /** Callback when form errors */
  onError?: (error: Error) => void;

  /** Custom class name */
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Manual search crawl form
 */
export function ManualSearchCrawlForm({
  actor,
  onSuccess,
  onError,
  className = '',
}: ManualSearchCrawlFormProps) {
  // Form state
  const [keywords, setKeywords] = useState('');
  const [categoryIds, setCategoryIds] = useState('');
  const [limit, setLimit] = useState(100);
  const [sources, setSources] = useState<string[]>(['shopee']);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Confirmation dialog state
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmation, setConfirmation] = useState<OperatorActionConfirmationModel | null>(null);

  // Mutation
  const mutation = useTriggerSearchCrawlMutation({
    onSuccess: (result) => {
      onSuccess?.(result);
      setShowConfirmation(false);
      setConfirmation(null);
    },
    onError: (error) => {
      onError?.(new Error(error.message));
    },
  });

  // Validate form
  const validate = useCallback((): boolean => {
    const keywordsArray = keywords
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    const categoryIdsArray = categoryIds
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    const data = {
      keywords: keywordsArray,
      categoryIds: categoryIdsArray,
      limit,
      sources,
    };

    const result = manualSearchCrawlSchema.safeParse(data);

    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const path = err.path.join('.');
        newErrors[path] = err.message;
      });
      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  }, [keywords, categoryIds, limit, sources]);

  // Handle submit
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!validate()) return;

      // Build payload
      const keywordsArray = keywords
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

      const categoryIdsArray = categoryIds
        .split(',')
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      const payload: ManualSearchCrawlInput = {
        keywords: keywordsArray,
        categoryIds: categoryIdsArray,
        limit,
        sources,
      };

      // Build confirmation
      const confirmationModel = buildConfirmationModel(
        OPERATOR_ACTION_TYPES.TRIGGER_SEARCH_CRAWL,
        {
          actor,
          actionType: OPERATOR_ACTION_TYPES.TRIGGER_SEARCH_CRAWL,
          targetType: 'pipeline',
          targetId: 'manual-operation',
          metadata: { payload },
        }
      );

      setConfirmation(confirmationModel);
      setShowConfirmation(true);
    },
    [validate, keywords, categoryIds, limit, sources, actor]
  );

  // Handle confirmation confirm
  const handleConfirm = useCallback(async () => {
    const keywordsArray = keywords
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    const categoryIdsArray = categoryIds
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    const payload: ManualSearchCrawlInput = {
      keywords: keywordsArray,
      categoryIds: categoryIdsArray,
      limit,
      sources,
    };

    await mutation.trigger(payload);
  }, [mutation, keywords, categoryIds, limit, sources]);

  // Handle source toggle
  const handleSourceToggle = useCallback((source: string) => {
    setSources((prev) =>
      prev.includes(source)
        ? prev.filter((s) => s !== source)
        : [...prev, source]
    );
  }, []);

  return (
    <form className={`manual-search-crawl-form ${className}`} onSubmit={handleSubmit}>
      {/* Keywords */}
      <div className="form-field">
        <label className="form-field__label">
          Keywords
          <span className="form-field__optional">(comma-separated)</span>
        </label>
        <input
          type="text"
          className={`form-field__input ${errors.keywords ? 'form-field__input--error' : ''}`}
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="iPhone 15, Samsung S24, Laptop gaming"
        />
        {errors.keywords && (
          <span className="form-field__error">{errors.keywords}</span>
        )}
        <span className="form-field__help">Enter keywords separated by commas</span>
      </div>

      {/* Category IDs */}
      <div className="form-field">
        <label className="form-field__label">
          Category IDs
          <span className="form-field__optional">(optional, comma-separated)</span>
        </label>
        <input
          type="text"
          className={`form-field__input ${errors.categoryIds ? 'form-field__input--error' : ''}`}
          value={categoryIds}
          onChange={(e) => setCategoryIds(e.target.value)}
          placeholder="uuid-1, uuid-2"
        />
        {errors.categoryIds && (
          <span className="form-field__error">{errors.categoryIds}</span>
        )}
      </div>

      {/* Limit */}
      <div className="form-field">
        <label className="form-field__label">Product Limit</label>
        <input
          type="number"
          className={`form-field__input form-field__input--number ${errors.limit ? 'form-field__input--error' : ''}`}
          value={limit}
          onChange={(e) => setLimit(parseInt(e.target.value) || 0)}
          min={1}
          max={1000}
        />
        {errors.limit && <span className="form-field__error">{errors.limit}</span>}
      </div>

      {/* Sources */}
      <div className="form-field">
        <label className="form-field__label">Sources</label>
        <div className="form-field__checkbox-group">
          {['shopee', 'lazada', 'tiki'].map((source) => (
            <label key={source} className="form-field__checkbox">
              <input
                type="checkbox"
                checked={sources.includes(source)}
                onChange={() => handleSourceToggle(source)}
              />
              <span>{source}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        className="form-submit-button"
        disabled={mutation.isLoading}
      >
        {mutation.isLoading ? 'Starting...' : 'Start Search Crawl'}
      </button>

      {/* Confirmation Dialog */}
      {confirmation && (
        <ActionConfirmationDialog
          confirmation={confirmation}
          isOpen={showConfirmation}
          onClose={() => setShowConfirmation(false)}
          onConfirm={handleConfirm}
          isLoading={mutation.isLoading}
        />
      )}
    </form>
  );
}

export default ManualSearchCrawlForm;
