import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Database } from "lucide-react";
import { cn } from "@/lib/utils";

const EmptyState = ({
  icon: Icon = Database,
  title,
  description,
  actionLabel,
  onAction,
  variant = "default",
  className = "",
}) => {
  return (
    <Card className={cn(
      "text-center py-12 transition-all duration-200 shadow-none border-none",
      "bg-white dark:bg-slate-800/50",
      " dark:border-slate-700",
      className
    )}>
      <CardContent>
        <div className={cn(
          "w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center transition-colors duration-200",
          "bg-gray-100 dark:bg-slate-700"
        )}>
          <Icon className="w-10 h-10 text-gray-400 dark:text-gray-500" />
        </div>
        <h3 className={cn(
          "text-lg font-semibold mb-2 transition-colors duration-200",
          "text-gray-900 dark:text-white"
        )}>
          {title}
        </h3>
        <p className={cn(
          "text-gray-600 dark:text-gray-400 mb-6 transition-colors duration-200",
          "max-w-md mx-auto"
        )}>
          {description}
        </p>
        {onAction && (
          <Button
            onClick={onAction}
            variant={variant === "primary" ? "default" : "ghost"}
            className={cn(
              "cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md",
              variant === "primary"
                ? "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
                : "hover:bg-gray-100 dark:hover:bg-slate-800 dark:bg-slate-800 dark:border-slate-600 dark:text-gray-200"
            )}
          >
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default EmptyState;