/**
 * Shared admin toast notification.
 * Used by all four admin content pages.
 */
import { motion } from "framer-motion";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface AdminToastProps {
  message: string;
  type: "success" | "error";
  onDone: () => void;
}

export function AdminToast({ message, type, onDone }: AdminToastProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      onAnimationComplete={() => setTimeout(onDone, 2500)}
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-5 py-3 rounded-2xl shadow-2xl text-sm font-bold ${
        type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
      }`}
    >
      {type === "success" ? (
        <CheckCircle2 className="w-4 h-4" />
      ) : (
        <AlertCircle className="w-4 h-4" />
      )}
      {message}
    </motion.div>
  );
}
