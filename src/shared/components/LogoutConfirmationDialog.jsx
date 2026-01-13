import React, { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { LogOut, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const LogoutConfirmationDialog = ({
  onLogout = () => {},
  trigger,
}) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogout = async () => {
    setIsSubmitting(true);
    try {
      if (typeof onLogout === "function") {
        await onLogout();
      } else {
        console.error("onLogout is not a function:", onLogout);
      }
      setOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (!isSubmitting) setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="ghost"
            size="sm"
            className={
              "flex items-center cursor-pointer hover:bg-red-50 hover:text-red-600 hover:border-red-300 dark:hover:bg-red-900/20 dark:hover:text-red-400 dark:hover:border-red-800 transition-all duration-200 dark:text-gray-200 dark:border-slate-600 dark:bg-slate-800"
            }
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className={cn(
        "sm:max-w-md shadow-lg",
        "bg-white dark:bg-slate-900",
        "border border-gray-200 dark:border-slate-700",
        "transition-colors duration-200"
      )}>
        <DialogHeader>
          <div className="flex items-center space-x-3 mb-2">
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center",
              "transition-all duration-200 shadow-md",
              "bg-linear-to-br from-orange-100 to-orange-50",
              "dark:from-orange-900/40 dark:to-orange-900/20"
            )}>
              <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1">
              <DialogTitle className={cn(
                "text-xl font-semibold transition-colors duration-200",
                "text-gray-900 dark:text-white"
              )}>
                Konfirmasi Logout
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className={cn(
            "text-left mt-3 leading-relaxed transition-colors duration-200",
            "text-gray-600 dark:text-gray-400"
          )}>
            Apakah Anda yakin ingin keluar dari sistem? Anda perlu masuk kembali untuk mengakses akun Anda.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
            className={cn(
              "flex-1 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md",
              "hover:bg-gray-100 dark:hover:bg-slate-800",
              "border-gray-300 dark:border-slate-600",
              "text-gray-700 dark:text-gray-200",
              "dark:bg-slate-800",
              isSubmitting && "opacity-50 cursor-not-allowed"
            )}
          >
            <span className="font-medium">Batal</span>
          </Button>
          <Button
            type="button"
            onClick={handleLogout}
            disabled={isSubmitting}
            className={cn(
              "flex-1 cursor-pointer transition-all duration-200",
              "shadow-sm hover:shadow-lg",
              "bg-red-600 hover:bg-red-700 text-white",
              "dark:bg-red-700 dark:hover:bg-red-800",
              "focus:ring-2 focus:ring-red-400 focus:ring-offset-2",
              "dark:focus:ring-red-600 dark:focus:ring-offset-slate-900",
              isSubmitting && "opacity-70 cursor-not-allowed"
            )}
          >
            <div className="flex items-center justify-center gap-2">
              <LogOut className={cn(
                "w-4 h-4 transition-transform duration-200",
                isSubmitting && "animate-pulse"
              )} />
              <span className="font-medium">
                {isSubmitting ? "Sedang Logout..." : "Ya, Logout"}
              </span>
            </div>
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
};

export default LogoutConfirmationDialog;