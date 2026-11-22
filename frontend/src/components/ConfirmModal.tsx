import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, CheckCircle2, X } from 'lucide-react';

type ConfirmTone = 'primary' | 'success' | 'danger';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  from?: string;
  to?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmModal({
  open,
  title,
  message,
  from,
  to,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'primary',
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const Icon = tone === 'danger' ? AlertTriangle : CheckCircle2;
  const iconClass = tone === 'danger'
    ? 'bg-rose-500/15 text-rose-400 ring-rose-500/20'
    : tone === 'success'
      ? 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/20'
      : 'bg-indigo/15 text-indigo ring-indigo/20';
  const buttonClass = tone === 'danger'
    ? 'bg-rose-500 text-white hover:bg-rose-600'
    : tone === 'success'
      ? 'bg-emerald-500 text-white hover:bg-emerald-600'
      : 'bg-indigo text-white hover:bg-indigo-dark';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6 }}
            transition={{ duration: 0.16 }}
            onClick={(event) => event.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#14141a] shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <div className="p-6">
              <div className="mb-4 flex items-start gap-3">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${iconClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close confirmation"
                  className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.05] text-muted transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{message}</p>

              {(from || to) && (
                <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                  <span className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-muted">{from || 'Current'}</span>
                  <ArrowRight className="h-4 w-4 text-faint" />
                  <span className="rounded-lg bg-white/[0.08] px-3 py-1.5 text-xs font-semibold text-white">{to || 'New status'}</span>
                </div>
              )}

              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg bg-white/[0.05] px-4 py-2.5 text-xs font-medium text-muted transition-colors hover:bg-white/10 hover:text-white"
                >
                  {cancelLabel}
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  className={`rounded-lg px-4 py-2.5 text-xs font-semibold transition-colors ${buttonClass}`}
                >
                  {confirmLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
