import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}

export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <AlertDialog.Portal forceMount>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14, ease: "easeOut" }}
            >
              <AlertDialog.Overlay
                className="fixed inset-0 z-40 bg-black/30 dark:bg-black/50
                           backdrop-blur-[2px]"
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 4 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              <AlertDialog.Content
                className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-[380px]
                           -translate-x-1/2 -translate-y-1/2
                           glass border border-border rounded-sidebar
                           shadow-[0_20px_40px_-12px_rgba(0,0,0,0.25)]
                           px-6 pt-6 pb-5
                           focus:outline-none"
              >
                <AlertDialog.Title
                  className="text-[14px] font-semibold text-sidebar-text
                             tracking-[-0.01em] mb-2"
                >
                  {title}
                </AlertDialog.Title>
                <AlertDialog.Description
                  className="text-[12px] text-sidebar-textSecondary
                             leading-relaxed mb-5"
                >
                  {description}
                </AlertDialog.Description>
                <div className="flex justify-end gap-2">
                  <AlertDialog.Cancel
                    className="px-3.5 py-1.5 rounded-btn text-[12px] font-medium
                               text-sidebar-text tracking-[-0.01em]
                               hover:bg-black/[0.04] dark:hover:bg-white/[0.06]
                               transition-colors"
                  >
                    {cancelLabel}
                  </AlertDialog.Cancel>
                  <AlertDialog.Action
                    onClick={onConfirm}
                    className={
                      destructive
                        ? "px-3.5 py-1.5 rounded-btn text-[12px] font-medium tracking-[-0.01em] border border-red-500/40 text-red-500 hover:bg-red-500/[0.08] transition-colors"
                        : "px-3.5 py-1.5 rounded-btn text-[12px] font-medium tracking-[-0.01em] bg-accent text-white hover:opacity-90 transition-opacity"
                    }
                  >
                    {confirmLabel}
                  </AlertDialog.Action>
                </div>
              </AlertDialog.Content>
            </motion.div>
          </AlertDialog.Portal>
        )}
      </AnimatePresence>
    </AlertDialog.Root>
  );
}
