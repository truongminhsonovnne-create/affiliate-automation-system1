/**
 * Operator Actions - Manual Publisher Run Form
 * Form component for triggering manual publisher run
 */

import React, { useState, useCallback } from 'react';
import type { OperatorActor } from '../types';
import { OPERATOR_ACTION_TYPES } from '../types';
import {
  manualPublisherRunSchema,
  type ManualPublisherRunInput,
} from './manualRunSchemas';
import { buildConfirmationModel } from '../confirmation/buildConfirmationModel';
import { ActionConfirmationDialog } from '../components/ActionConfirmationDialog';
import { useTriggerPublisherRunMutation } from '../mutations/usePipelineMutations';
import type { OperatorActionConfirmationModel } from '../types';

// =============================================================================
// PROP TYPES
// =============================================================================

export interface ManualPublisherRunFormProps {
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
 * Manual publisher run form
 */
export function ManualPublisherRunForm({
  actor,
  onSuccess,
  onError,
  className = '',
}: ManualPublisherRunFormProps) {
  // Form state
  const [channels, setChannels] = useState<string[]>(['website']);
  const [publishType, setPublishType] = useState<'immediate' | 'scheduled'>('immediate');
  const [scheduledTime, setScheduledTime] = useState('');
  const [dryRun, setDryRun] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Confirmation dialog state
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmation, setConfirmation] = useState<OperatorActionConfirmationModel | null>(null);

  // Mutation
  const mutation = useTriggerPublisherRunMutation({
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
    const data: ManualPublisherRunInput = {
      channels: channels as ['facebook', 'tiktok', 'website', 'instagram'],
      publishType,
      scheduledTime: publishType === 'scheduled' ? scheduledTime : undefined,
      dryRun,
    };

    const result = manualPublisherRunSchema.safeParse(data);

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
  }, [channels, publishType, scheduledTime, dryRun]);

  // Handle submit
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!validate()) return;

      const payload: ManualPublisherRunInput = {
        channels: channels as ['facebook', 'tiktok', 'website', 'instagram'],
        publishType,
        scheduledTime: publishType === 'scheduled' ? scheduledTime : undefined,
        dryRun,
      };

      const confirmationModel = buildConfirmationModel(
        OPERATOR_ACTION_TYPES.TRIGGER_PUBLISHER_RUN,
        {
          actor,
          actionType: OPERATOR_ACTION_TYPES.TRIGGER_PUBLISHER_RUN,
          targetType: 'pipeline',
          targetId: 'manual-operation',
          metadata: { payload },
        }
      );

      setConfirmation(confirmationModel);
      setShowConfirmation(true);
    },
    [validate, channels, publishType, scheduledTime, dryRun, actor]
  );

  // Handle confirmation confirm
  const handleConfirm = useCallback(async () => {
    const payload: ManualPublisherRunInput = {
      channels: channels as ['facebook', 'tiktok', 'website', 'instagram'],
      publishType,
      scheduledTime: publishType === 'scheduled' ? scheduledTime : undefined,
      dryRun,
    };

    await mutation.trigger(payload);
  }, [mutation, channels, publishType, scheduledTime, dryRun]);

  // Handle channel toggle
  const handleChannelToggle = useCallback((channel: string) => {
    setChannels((prev) =>
      prev.includes(channel)
        ? prev.filter((c) => c !== channel)
        : [...prev, channel]
    );
  }, []);

  const channelOptions = ['facebook', 'tiktok', 'website', 'instagram'];

  // Show warning if dry run is not selected but publishing to production channels
  const showProductionWarning = !dryRun && channels.length > 0;

  return (
    <form className={`manual-publisher-run-form ${className}`} onSubmit={handleSubmit}>
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

      {/* Publish Type */}
      <div className="form-field">
        <label className="form-field__label">Publish Type</label>
        <div className="form-field__radio-group">
          <label className="form-field__radio">
            <input
              type="radio"
              name="publishType"
              value="immediate"
              checked={publishType === 'immediate'}
              onChange={() => setPublishType('immediate')}
            />
            <span>Immediate</span>
          </label>
          <label className="form-field__radio">
            <input
              type="radio"
              name="publishType"
              value="scheduled"
              checked={publishType === 'scheduled'}
              onChange={() => setPublishType('scheduled')}
            />
            <span>Scheduled</span>
          </label>
        </div>
      </div>

      {/* Scheduled Time (only shown when scheduled is selected) */}
      {publishType === 'scheduled' && (
        <div className="form-field">
          <label className="form-field__label">
            Scheduled Time
            <span className="form-field__required">*</span>
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
        </div>
      )}

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

      {/* Production Warning */}
      {showProductionWarning && (
        <div className="form-warning">
          <span className="form-warning__icon">⚠️</span>
          <span>
            You are about to publish to production channels. This action cannot be undone.
          </span>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        className="form-submit-button form-submit-button--danger"
        disabled={mutation.isLoading || channels.length === 0}
      >
        {mutation.isLoading
          ? 'Starting...'
          : dryRun
            ? 'Run Publisher (Dry Run)'
            : 'Run Publisher'}
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

export default ManualPublisherRunForm;
