import React from 'react';

export default function ConfirmModal({
  isOpen,
  title = 'Are you sure?',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'default',
}) {
  if (!isOpen) return null;

  const confirmBtnStyle =
    variant === 'danger'
      ? 'bg-rose-600 hover:bg-rose-500 text-white'
      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-medium';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 animate-in fade-in duration-150"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-4 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-zinc-100">{title}</h3>
        {message ? <p className="text-sm text-zinc-400 leading-relaxed">{message}</p> : null}

        <div className="flex items-center justify-end gap-2.5 pt-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-700 hover:text-white"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2 text-xs transition ${confirmBtnStyle}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
