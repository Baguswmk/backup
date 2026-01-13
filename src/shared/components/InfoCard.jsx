import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

const InfoCard = ({
  title,
  icon: Icon,
  children,
  variant = "default",
  className = "",
}) => {
  const variantClasses = {
    default: "border-gray-200 dark:border-gray-700 dark:bg-gray-800",
    primary: "border-blue-200 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20",
    success: "border-green-200 bg-green-50 dark:border-green-700 dark:bg-green-900/20",
    warning: "border-orange-200 bg-orange-50 dark:border-orange-700 dark:bg-orange-900/20",
    purple: "border-purple-200 bg-purple-50 dark:border-purple-700 dark:bg-purple-900/20",
  };

  return (
    <Card className={`${variantClasses[variant]} ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 dark:text-gray-200">
          {Icon && <Icon className="w-4 h-4" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {children}
        </div>
      </CardContent>
    </Card>
  );
};

const InfoItem = ({ label, value, icon: Icon, className = "" }) => (
  <div className={className}>
    <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1 text-xs">
      {Icon && <Icon className="w-3 h-3" />}
      {label}:
    </span>
    <p className="font-medium mt-1 dark:text-gray-200">{value}</p>
  </div>
);

export { InfoCard, InfoItem };
