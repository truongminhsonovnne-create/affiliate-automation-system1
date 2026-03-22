/**
 * Operator Actions - Manual Flash Sale Crawl Form
 * Form component for triggering manual flash sale crawl
 */

import React, { useState, useCallback } from 'react';
import type { OperatorActor } from '../types';
import { OPERATOR_ACTION_TYPES } from '../types';
import {
  manualFlashSaleCrawlSchema,
  type ManualFlashSaleCrawlInput,
} from './manualRunSchemas';
import { buildConfirmationModel } from '../confirmation/buildConfirmationModel';
import { ActionConfirmationDialog } from '../components/ActionConfirmationDialog';
import { useTriggerFlashSaleCrawlMutation } from '../mutations/usePipelineMutations';
import type { OperatorActionConfirmationModel } from '../types';

// =============================================================================
// PROP TYPES
// =============================================================================

export interface ManualFlashSaleCrawlFormProps {
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
 * Manual flash sale crawl form
 */
export function ManualFlashSaleCrawlForm({
  actor,
  onSuccess,
  onError,
  className = '',
}: ManualFlashSaleCrawlFormProps) {
  // Form state
  const [source, setSource] = useState('shopee');
  const [categoryIds, setCategoryIds] = useState('');
  const [limit, setLimit] = useState(50);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Confirmation dialog state
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmation, setConfirmation] = useState<OperatorActionConfirmationModel | null>(null);

  // Mutation
  const mutation = useTriggerFlashSaleCrawlMutation({
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
    const categoryIdsArray = categoryIds
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    const data: ManualFlashSaleCrawlInput = {
      source,
      categoryIds: categoryIdsArray,
      limit,
    };

    const result = manualFlashSaleCrawlSchema.safeParse(data);

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
  }, [source, categoryIds, limit]);

  // Handle submit
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!validate()) return;

      const categoryIdsArray = categoryIds
        .split(',')
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      const payload: ManualFlashSaleCrawlInput = {
        source,
        categoryIds: categoryIdsArray,
        limit,
      };

      const confirmationModel = buildConfirmationModel(
        OPERATOR_ACTION_TYPES.TRIGGER_FLASH_SALE_CRAWL,
        {
          actor,
          actionType: OPERATOR_ACTION_TYPES.TRIGGER_FLASH_SALE_CRAWL,
          targetType: 'pipeline',
          targetId: 'manual-operation',
          metadata: { payload },
        }
      );

      setConfirmation(confirmationModel);
      setShowConfirmation(true);
    },
    [validate, source, categoryIds, limit, actor]
  );

  // Handle confirmation confirm
  const handleConfirm = useCallback(async () => {
    const categoryIdsArray = categoryIds
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    const payload: ManualFlashSaleCrawlInput = {
      source,
      categoryIds: categoryIdsArray,
      limit,
    };

    await mutation.trigger(payload);
  }, [mutation, source, categoryIds, limit]);

  return (
    <form className={`manual-flash-sale-crawl-form ${className}`} onSubmit={handleSubmit}>
      {/* Source */}
      <div className="form-field">
        <label className="form-field__label">Source</label>
        <select
          className="form-field__select"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        >
          <option value="shopee">Shopee</option>
          <option value="lazada">Lazada</option>
          <option value="tiki">Tiki</option>
        </select>
      </div>

      {/* Category IDs */}
      <div className="form-field">
        <label className="form-field__label">
          Category IDs
          <span className="form-field__optional">(optional)</span>
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
          max={500}
        />
        {errors.limit && <span className="form-field__error">{errors.limit}</span>}
      </div>

      {/* Submit */}
      <button
        type="submit"
        className="form-submit-button"
        disabled={mutation.isLoading}
      >
        {mutation.isLoading ? 'Starting...' : 'Start Flash Sale Crawl'}
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

export default ManualFlashSaleCrawlForm;
