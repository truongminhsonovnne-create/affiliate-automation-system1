'use client';

/**
 * ConfirmDialog — Destructive action confirmation
 *
 * Used for: delete, bulk delete, reset, cancel operations.
 * Shows a clear title, description, and two actions:
 *   - Confirm (destructive variant, red)
 *   - Cancel (secondary variant)
 *
 * Usage:
 *   <ConfirmDialog
 *     open={showDialog}
 *     onClose={handleCancel}
 *     onConfirm={handleConfirm}
 *     title="Xóa sản phẩm"
 *     description="Bạn có chắc muốn xóa 3 sản phẩm đã chọn? Hành động này không thể hoàn tác."
 *     confirmLabel="Xóa"
 *     loading={isDeleting}
 *   />
 */

import { AlertTriangle } from 'lucide-react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  destructive?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  loading = false,
  destructive = true,
  size = 'sm',
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size={size}
      closeOnOverlay
      showClose
    >
      <div className="flex items-start gap-4">
        {/* Warning icon */}
        {destructive && (
          <div className="flex-shrink-0 mt-0.5">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-red-50 border border-red-100">
              <AlertTriangle className="h-5 w-5 text-red-500" aria-hidden="true" />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          {description && (
            <p className="mt-2 text-sm text-gray-500 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant="destructive"
          onClick={onConfirm}
          loading={loading}
        >
          {confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default ConfirmDialog;
