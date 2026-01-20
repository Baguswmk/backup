import React from "react";
import { Button } from "@/shared/components/ui/button";
import { X } from "lucide-react";

const ModalHeader = ({
  title,
  subtitle,
  icon: Icon,
  onClose,
  disabled = false,
  className = "",
}) => {
  return (
    <div
      className={`sticky top-0 bg-neutral-50 dark:bg-gray-900 shadow-sm dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10 ${className}`}
    >
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2 dark:text-gray-200">
          {Icon && <Icon className="w-5 h-5" />}
          {title}
        </h2>
        {subtitle && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{subtitle}</p>}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="h-8 w-8 p-0 cursor-pointer disabled:cursor-not-allowed dark:hover:bg-gray-700 dark:text-gray-200"
        disabled={disabled}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default ModalHeader;
