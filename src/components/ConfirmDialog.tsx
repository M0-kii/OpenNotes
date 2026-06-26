import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";
import { springGentle, easeSmooth } from "../lib/animations";

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
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <AlertDialog.Overlay className="fixed inset-0 z-40 bg-overlay backdrop-blur-sm" />
            </motion.div>

            {/* Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={springGentle}
              className="fixed inset-0 z-50 flex items-center justify-center"
            >
              <AlertDialog.Content
                className="w-[340px] rounded-xl bg-surface-elevated
                           backdrop-blur-xl
                           shadow-[0_12px_40px_rgba(0,0,0,0.2),0_0_0_0.5px_rgba(0,0,0,0.1)]
                           dark:shadow-[0_12px_40px_rgba(0,0,0,0.4),0_0_0_0.5px_rgba(255,255,255,0.1)]
                           p-6 focus:outline-none"
              >
                {/* Title */}
                <AlertDialog.Title className="text-[13px] font-bold text-text-primary leading-tight mb-2">
                  {title}
                </AlertDialog.Title>

                {/* Description with secondary text color */}
                <AlertDialog.Description className="text-[11px] text-text-secondary leading-relaxed mb-6">
                  {description}
                </AlertDialog.Description>

                {/* Button group*/}
                <div className="flex justify-end gap-2">
                  {/* Cancel button */}
                  <AlertDialog.Cancel
                    className="h-[26px] px-4 rounded-md text-[12px] font-medium
                               text-text-primary
                               bg-white/55 dark:bg-[#636366]/55
                               hover:bg-[#e8e8ed] dark:hover:bg-[#7c7c80]
                               active:bg-[#dcdce0] dark:active:bg-[#8e8e93]
                               shadow-[0_0_0_0.5px_rgba(0,0,0,0.15)]
                               dark:shadow-[0_0_0_0.5px_rgba(255,255,255,0.15)]
                               transition-colors duration-100"
                  >
                    {cancelLabel}
                  </AlertDialog.Cancel>

                  {/* Confirm button */}
                  <AlertDialog.Action
                    onClick={onConfirm}
                    className={
                      destructive
                        ? "h-[26px] px-4 rounded-md text-[12px] font-medium text-white bg-destructive hover:bg-destructive-hover active:bg-destructive-active shadow-[0_0_0_0.5px_rgba(255,59,48,0.3)] transition-colors duration-100"
                        : "h-[26px] px-4 rounded-md text-[12px] font-medium text-white bg-confirm hover:bg-confirm-hover active:bg-confirm-active shadow-[0_0_0_0.5px_rgba(0,122,255,0.3)] transition-colors duration-100"
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
