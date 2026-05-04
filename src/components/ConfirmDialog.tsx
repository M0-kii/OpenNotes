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
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <AlertDialog.Overlay className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" />
            </motion.div>

            {/* Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{
                duration: 0.2,
                ease: [0.22, 0.61, 0.36, 1],
              }}
              className="fixed inset-0 z-50 flex items-center justify-center"
            >
              <AlertDialog.Content
                className="w-[340px] rounded-xl bg-[#f5f5f7]/95
                           dark:bg-[#2c2c2e]/55
                           backdrop-blur-xl
                           shadow-[0_12px_40px_rgba(0,0,0,0.2),0_0_0_0.5px_rgba(0,0,0,0.1)]
                           dark:shadow-[0_12px_40px_rgba(0,0,0,0.4),0_0_0_0.5px_rgba(255,255,255,0.1)]
                           p-6 focus:outline-none"
              >
                {/* Title */}
                <AlertDialog.Title className="text-[13px] font-bold text-[#1d1d1f] dark:text-[#f5f5f7] leading-tight mb-2">
                  {title}
                </AlertDialog.Title>

                {/* Description with secondary text color */}
                <AlertDialog.Description className="text-[11px] text-[#86868b] dark:text-[#98989d] leading-relaxed mb-6">
                  {description}
                </AlertDialog.Description>

                {/* Button group*/}
                <div className="flex justify-end gap-2">
                  {/* Cancel button */}
                  <AlertDialog.Cancel
                    className="h-[26px] px-4 rounded-md text-[12px] font-medium
                               text-[#1d1d1f] dark:text-[#f5f5f7]
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
                        ? "h-[26px] px-4 rounded-md text-[12px] font-medium text-white bg-[#ff3b30] hover:bg-[#ff453a] active:bg-[#ff6961] shadow-[0_0_0_0.5px_rgba(255,59,48,0.3)] transition-colors duration-100"
                        : "h-[26px] px-4 rounded-md text-[12px] font-medium text-white bg-[#007aff] hover:bg-[#0071e9] active:bg-[#0066d4] shadow-[0_0_0_0.5px_rgba(0,122,255,0.3)] transition-colors duration-100"
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
