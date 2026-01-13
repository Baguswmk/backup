import React from "react";
import { Badge } from "@/shared/components/ui/badge";

const StatusBadge = ({ status, variant, className = "" }) => {
  const getVariant = (status) => {
    const map = {
      ACTIVE: "success",
      INACTIVE: "secondary",
      CLOSED: "destructive",
      pending: "default",
      approved: "success",
      active: "success",
      maintenance: "warning",
      inactive: "secondary",
    };
    return variant || map[status] || "secondary";
  };

  const variantStyles = {
    success: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700",
    secondary: "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600",
    destructive: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700",
    default: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
    warning: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700",
  };

  const variantClass =
    variantStyles[getVariant(status)] || variantStyles.secondary;

  return <Badge className={`${variantClass} ${className}`}>{status}</Badge>;
};

export default StatusBadge;