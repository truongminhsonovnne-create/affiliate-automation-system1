/**
 * Operator Actions - Manual Publish Preparation Form
 * Form component for triggering manual publish preparation
 */

import React, { useState, useCallback } from 'react';
import type { OperatorActor } from '../types';
import { OPERATOR_ACTION_TYPES } from '../types';
import {
  manualPublishPreparationSchema,
  type ManualPublishPreparationInput,
} from './manualRunSchemas';
import { buildConfirmationModel } from '../confirmation/buildConfirmationModel';
import { ActionConfirmationDialog } from '../components/ActionConfirmationDialog';
import { useTriggerPublishPreparationMutation } from '../mutations/usePipelineMutations';
import type { OperatorActionConfirmationModel } from '../types';

// =============================================================================
// PROP TYPES
// =============================================================================

export interface ManualPublishPreparationFormProps {
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
 * Manual publish preparation form
 */
export function ManualPublishPreparationForm({
  actor,
  onSuccess,
  onError,
  className = '',
}: ManualPublishPreparationFormProps) {
  // Form state
  const [productIds, setProductIds] = useState('');
  const [channels, setChannels] = useState<string[]>(['website']);
  const [scheduledTime, setScheduledTime] = useState('');
  const [dryRun, setDryRun] = useState(true);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Confirmation dialog state
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmation, setConfirmation] = useState<OperatorActionConfirmationModel | null>(null);

  // Mutation
  const mutation = useTriggerPublishPreparationMutation({
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

    const data: ManualPublishPreparationInput = {
      productIds: productIdsArray,
      channels: channels as ['facebook', 'tiktok', 'website', 'instagram'],
      scheduledTime: scheduledTime || undefined,
      dryRun,
    };

    const result = manualPublishPreparationSchema.safeParse(data);

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
  }, [productIds, channels, scheduledTime, dryRun]);

  // Handle submit
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!validate()) return;

      const productIdsArray = productIds
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      const payload: ManualPublishPreparationInput = {
        productIds: productIdsArray,
        channels: channels as ['facebook', 'tiktok', 'website', 'instagram'],
        scheduledTime: scheduledTime || undefined,
        dryRun,
      };

      const confirmationModel = buildConfirmationModel(
        OPERATOR_ACTION_TYPES.TRIGGER_PUBLISH_PREPARATION,
        {
          actor,
          actionType: OPERATOR_ACTION_TYPES.TRIGGER_PUBLISH_PREPARATION,
          targetType: 'pipeline',
          targetId: 'manual-operation',
          metadata: { payload },
        }
      );

      setConfirmation(confirmationModel);
      setShowConfirmation(true);
    },
    [validate, productIds, channels, scheduledTime, dryRun, actor]
  );

  // Handle confirmation confirm
  const handleConfirm = useCallback(async () => {
    const productIdsArray = productIds
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const payload: ManualPublishPreparationInput = {
      productIds: productIdsArray,
      channels: channels as ['facebook', 'tiktok', 'website', 'instagram'],
      scheduledTime: scheduledTime || undefined,
      dryRun,
    };

    await mutation.trigger(payload);
  }, [mutation, productIds, channels, scheduledTime, dryRun]);

  // Handle channel toggle
  const handleChannelToggle = useCallback((channel: string) => {
    setChannels((prev) =>
      prev.includes(channel)
        ? prev.filter((c) => c !== channel)
        : [...prev, channel]
    );
  }, []);

  const channelOptions = ['facebook', 'tiktok', 'website', 'instagram'];

  return (
    <form className={`manual-publish-preparation-form ${className}`} onSubmit={handleSubmit}>
      {/* Product IDs */}
      <div className="form-field">
        <label className="form-field__label">
          Product IDs
          <span className="form-field__optional">(optional)</span>
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
          Leave empty to prepare all ready products
        </span>
      </div>

      {/* Channels */}
      <div className="form-field">
        <label className="form-field__label">
          Channels
          <span className="form-field__required">*</span>
        </label>
        <div className="form-field__checkbox-group">
          {channelOptions.map((channel) => (
            <label key={channel} className="form-field__checkbox">
              <input
                type="checkbox"
                checked={channels.includes(channel)}
                onChange={() => handleChannelToggle(channel)}
              />
              <span>{channel}</span>
            </label>
          ))}
        </div>
        {errors.channels && (
          <span className="form-field__error">{errors.channels}</span>
        )}
      </div>

      {/* Scheduled Time */}
      <div className="form-field">
        <label className="form-field__label">
          Scheduled Time
          <span className="form-field__optional">(optional)</span>
        </label>
        <input
          type="datetime-local"
          className={`form-field__input ${errors.scheduledTime ? 'form-field__input--error' : ''}`}
          value={scheduledTime}
          onChange={(e) => setScheduledTime(e.target.value)}
        />
        {errors.scheduledTime && (
          <span className="form-field__error">{errors.scheduledTime}</span>
        )}
        <span className="form-field__help">
          Leave empty for immediate preparation
        </span>
      </div>

      {/* Dry Run */}
      <div className="form-field">
        <label className="form-field__checkbox form-field__checkbox--large">
          <input
            type="checkbox"
            checked={dryRun}
            onChange={(e) => setDryRun(e.target.checked)}
          />
          <span>Dry run (simulate without actual publishing)</span>
        </label>
      </div>

      {/* Submit */}
      <button
        type="submit"
        className="form-submit-button"
        disabled={mutation.isLoading || channels.length === 0}
      >
        {mutation.isLoading ? 'Starting...' : 'Start Publish Preparation'}
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

export default ManualPublishPreparationForm;
