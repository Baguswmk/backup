import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
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
  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4",
        "bg-black/50 backdrop-blur-sm transition-all duration-200",
      )}
    >
      <Card
        className={cn(
          "max-w-md w-full shadow-lg transition-all duration-200",
          "bg-neutral-50 dark:bg-slate-900",
          "border border-gray-200 dark:border-slate-700",
          "animate-fade-in",
        )}
      >
        <CardHeader className="pb-3">
          <CardTitle
            className={cn(
              "flex items-center gap-2 transition-colors duration-200",
              "text-gray-900 dark:text-white",
            )}
          >
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center shadow-sm",
                variant === "destructive"
                  ? "bg-red-100 dark:bg-red-900/30"
                  : "bg-blue-100 dark:bg-blue-900/30",
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5",
                  variant === "destructive"
                    ? "text-red-600 dark:text-red-400"
                    : "text-blue-600 dark:text-blue-400",
                )}
              />
            </div>
            <span className="text-gray-700 dark:text-gray-300 ">{title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-gray-700 dark:text-gray-300 ">
          {description && (
            <p className="text-sm text-gray-700 dark:text-gray-300  leading-relaxed">
              {description}
            </p>
          )}
          {children}

          <div className="flex gap-2 pt-2">
            <Button
              variant={variant === "destructive" ? "destructive" : "default"}
              onClick={onConfirm}
              disabled={isProcessing}
              className={cn(
                "flex-1 cursor-pointer disabled:cursor-not-allowed dark:text-gray-200 transition-all duration-200 shadow-sm hover:shadow-md",
                variant === "destructive"
                  ? "bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
                  : "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800",
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
                "hover:bg-gray-100 dark:hover:bg-slate-800",
                "dark:bg-slate-800 dark:border-slate-600 dark:text-gray-200",
              )}
            >
              {cancelLabel}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfirmDialog;
