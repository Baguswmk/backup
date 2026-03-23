import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  isProcessing = false,
  children,
  icon: Icon = AlertCircle,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }} className="detail-modal">
      <DialogContent showCloseButton={false} className="max-w-md w-full bg-neutral-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 p-0 overflow-hidden gap-0">
        <DialogHeader className="p-6 pb-3">
          <DialogTitle
            className={cn(
              "flex items-center gap-3 transition-colors duration-200",
              "text-gray-900 dark:text-white"
            )}
          >
            <div
              className={cn(
                "w-10 h-10 shrink-0 rounded-full flex items-center justify-center shadow-sm",
                variant === "destructive"
                  ? "bg-red-100 dark:bg-red-900/30"
                  : "bg-blue-100 dark:bg-blue-900/30"
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5",
                  variant === "destructive"
                    ? "text-red-600 dark:text-red-400"
                    : "text-blue-600 dark:text-blue-400"
                )}
              />
            </div>
            <span className="text-gray-700 dark:text-gray-300 text-lg font-semibold text-left">{title}</span>
          </DialogTitle>
          {description && (
            <DialogDescription className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed text-left pl-[52px]">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        
        <div className="px-6 pb-2 text-gray-700 dark:text-gray-300 space-y-4">
          {children}
        </div>

        <DialogFooter className="px-6 pb-6 pt-2 flex flex-row gap-2 sm:justify-center">
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={isProcessing}
            className={cn(
              "flex-1 cursor-pointer disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md text-white border-0",
              variant === "destructive"
                ? "bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
                : "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
            )}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                {confirmLabel}ing...
              </>
            ) : (
              confirmLabel
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isProcessing}
            className={cn(
              "flex-1 cursor-pointer disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md",
              "hover:bg-gray-200 bg-gray-100 border text-gray-700 border-gray-300 dark:border-slate-600 dark:hover:bg-slate-700 dark:bg-slate-800 dark:text-gray-200"
            )}
          >
            {cancelLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmDialog;
