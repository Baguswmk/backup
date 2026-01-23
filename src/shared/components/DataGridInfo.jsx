import { cn } from "@/lib/utils";

const DataGridInfo = ({ children, className = "" }) => {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border p-4 shadow-sm transition-all duration-200",
        "bg-neutral-50 dark:bg-slate-800/50",
        "border-gray-200 dark:border-slate-700",
        className,
      )}
    >
      <div className="flex items-center gap-4 flex-wrap">
        {children && (
          <>
            <span
              className={cn(
                "text-sm font-medium transition-colors duration-200",
                "text-gray-900 dark:text-white",
              )}
            >
              Aksi Cepat:
            </span>
            {children}
          </>
        )}
      </div>
    </div>
  );
};

export default DataGridInfo;
