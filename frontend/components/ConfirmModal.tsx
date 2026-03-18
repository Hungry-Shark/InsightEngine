'use client';

import React from 'react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
        <p className="confirm-title">{title}</p>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button
            className={danger ? 'btn-danger' : 'btn-primary'}
            onClick={onConfirm}
            style={{ flex: 1, maxWidth: '160px' }}
          >
            {confirmLabel}
          </button>
          <button
            className="btn-secondary"
            onClick={onCancel}
            style={{ flex: 1, maxWidth: '160px' }}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
