/**
 * Operator Actions - Manual AI Enrichment Form
 * Form component for triggering manual AI enrichment
 */

import React, { useState, useCallback } from 'react';
import type { OperatorActor } from '../types';
import { OPERATOR_ACTION_TYPES } from '../types';
import {
  manualAiEnrichmentSchema,
  type ManualAiEnrichmentInput,
} from './manualRunSchemas';
import { buildConfirmationModel } from '../confirmation/buildConfirmationModel';
import { ActionConfirmationDialog } from '../components/ActionConfirmationDialog';
import { useTriggerAiEnrichmentMutation } from '../mutations/usePipelineMutations';
import type { OperatorActionConfirmationModel } from '../types';

// =============================================================================
// PROP TYPES
// =============================================================================

export interface ManualAiEnrichmentFormProps {
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
 * Manual AI enrichment form
 */
export function ManualAiEnrichmentForm({
  actor,
  onSuccess,
  onError,
  className = '',
}: ManualAiEnrichmentFormProps) {
  // Form state
  const [productIds, setProductIds] = useState('');
  const [categoryIds, setCategoryIds] = useState('');
  const [priority, setPriority] = useState<'high' | 'normal' | 'low'>('normal');
  const [forceRefresh, setForceRefresh] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Confirmation dialog state
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmation, setConfirmation] = useState<OperatorActionConfirmationModel | null>(null);

  // Mutation
  const mutation = useTriggerAiEnrichmentMutation({
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
    const productIdsArray = productIds
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const categoryIdsArray = categoryIds
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    const data: ManualAiEnrichmentInput = {
      productIds: productIdsArray,
      categoryIds: categoryIdsArray,
      priority,
      forceRefresh,
    };

    const result = manualAiEnrichmentSchema.safeParse(data);

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
  }, [productIds, categoryIds, priority, forceRefresh]);

  // Handle submit
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!validate()) return;

      const productIdsArray = productIds
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      const categoryIdsArray = categoryIds
        .split(',')
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      const payload: ManualAiEnrichmentInput = {
        productIds: productIdsArray,
        categoryIds: categoryIdsArray,
        priority,
        forceRefresh,
      };

      const confirmationModel = buildConfirmationModel(
        OPERATOR_ACTION_TYPES.TRIGGER_AI_ENRICHMENT,
        {
          actor,
          actionType: OPERATOR_ACTION_TYPES.TRIGGER_AI_ENRICHMENT,
          targetType: 'pipeline',
          targetId: 'manual-operation',
          metadata: { payload },
        }
      );

      setConfirmation(confirmationModel);
      setShowConfirmation(true);
    },
    [validate, productIds, categoryIds, priority, forceRefresh, actor]
  );

  // Handle confirmation confirm
  const handleConfirm = useCallback(async () => {
    const productIdsArray = productIds
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const categoryIdsArray = categoryIds
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    const payload: ManualAiEnrichmentInput = {
      productIds: productIdsArray,
      categoryIds: categoryIdsArray,
      priority,
      forceRefresh,
    };

    await mutation.trigger(payload);
  }, [mutation, productIds, categoryIds, priority, forceRefresh]);

  return (
    <form className={`manual-ai-enrichment-form ${className}`} onSubmit={handleSubmit}>
      {/* Product IDs */}
      <div className="form-field">
        <label className="form-field__label">
          Product IDs
          <span className="form-field__optional">(optional, comma-separated UUIDs)</span>
        </label>
        <textarea
          className={`form-field__textarea ${errors.productIds ? 'form-field__input--error' : ''}`}
          value={productIds}
          onChange={(e) => setProductIds(e.target.value)}
          placeholder="Enter product UUIDs, one per line or comma-separated"
          rows={3}
        />
        {errors.productIds && (
          <span className="form-field__error">{errors.productIds}</span>
        )}
        <span className="form-field__help">
          Leave empty to enrich all pending products
        </span>
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

      {/* Priority */}
      <div className="form-field">
        <label className="form-field__label">Priority</label>
        <div className="form-field__radio-group">
          {[
            { value: 'high', label: 'High' },
            { value: 'normal', label: 'Normal' },
            { value: 'low', label: 'Low' },
          ].map((option) => (
            <label key={option.value} className="form-field__radio">
              <input
                type="radio"
                name="priority"
                value={option.value}
                checked={priority === option.value}
                onChange={(e) => setPriority(e.target.value as 'high' | 'normal' | 'low')}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Force Refresh */}
      <div className="form-field">
        <label className="form-field__checkbox form-field__checkbox--large">
          <input
            type="checkbox"
            checked={forceRefresh}
            onChange={(e) => setForceRefresh(e.target.checked)}
          />
          <span>Force refresh (re-enrich even if already enriched)</span>
        </label>
      </div>

      {/* Submit */}
      <button
        type="submit"
        className="form-submit-button"
        disabled={mutation.isLoading}
      >
        {mutation.isLoading ? 'Starting...' : 'Start AI Enrichment'}
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

export default ManualAiEnrichmentForm;
