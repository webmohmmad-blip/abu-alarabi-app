/**
 * Shared delete confirmation dialog.
 * Used by all four admin content pages (dossiers, worksheets, exams, quizzes).
 */
import { motion, AnimatePresence } from "framer-motion";
import { Trash2 } from "lucide-react";

interface DeleteDialogProps {
  /** Whether the dialog is visible */
  open: boolean;
  /** Called when the user clicks Cancel or the backdrop */
  onClose: () => void;
  /** Called when the user confirms deletion */
  onConfirm: () => void;
  /** Whether the deletion mutation is in-flight */
  isPending: boolean;
  /** Dialog heading, e.g. "حذف الدوسية" */
  title: string;
  /** Sub-heading, e.g. "لا يمكن التراجع عن هذا الإجراء" */
  subtitle: string;
  /** Optional label before the item name box, e.g. "هل أنت متأكد من حذف الامتحان:" */
  prefixText?: string;
  /** The item name / text displayed inside the highlighted box */
  itemText: string;
  /** Confirm button label, e.g. "حذف الامتحان" */
  confirmText: string;
  /** z-index class for stacking (default z-50 for top-level, z-[60] for nested) */
  zClass?: string;
}

export function DeleteDialog({
  open,
  onClose,
  onConfirm,
  isPending,
  title,
  subtitle,
  prefixText,
  itemText,
  confirmText,
  zClass = "z-50",
}: DeleteDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="delete-dialog-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 ${zClass} flex items-center justify-center bg-black/70 backdrop-blur-sm p-4`}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isPending) onClose();
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-[#1a1030] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
          >
            {/* Icon + heading */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h2 className="font-bold text-white">{title}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
              </div>
            </div>

            {/* Optional prefix sentence */}
            {prefixText && (
              <p className="text-sm text-white/80 mb-2">{prefixText}</p>
            )}

            {/* Item name */}
            <p className="text-sm font-bold text-white bg-white/5 rounded-xl px-3 py-2 mb-5 truncate">
              «{itemText}»
            </p>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => !isPending && onClose()}
                disabled={isPending}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-white text-sm font-bold hover:bg-white/5 transition-colors disabled:opacity-40"
              >
                إلغاء
              </button>
              <button
                onClick={onConfirm}
                disabled={isPending}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    جارٍ الحذف...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    {confirmText}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
