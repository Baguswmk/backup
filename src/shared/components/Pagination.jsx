import { useMemo } from "react";
import { Button } from "@/shared/components/ui/button";
import { ChevronRight, ChevronLeft } from "lucide-react";

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  isLoading,
  itemsPerPage,
  onItemsPerPageChange,
  totalItems,
}) => {
  const pages = useMemo(() => {
    const items = [];
    const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
    const maxVisible = isMobile ? 3 : 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) items.push(i);
    } else {
      const start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
      const end = Math.min(totalPages, start + maxVisible - 1);

      if (start > 1) {
        items.push(1);
        if (start > 2) items.push("...");
      }

      for (let i = start; i <= end; i++) items.push(i);

      if (end < totalPages) {
        if (end < totalPages - 1) items.push("...");
        items.push(totalPages);
      }
    }

    return items;
  }, [currentPage, totalPages]);

  const pageOptions = [10, 25, 50, 100];
  if (totalItems && !pageOptions.includes(totalItems)) {
    pageOptions.push({ value: totalItems, label: "All" });
  }

  return (
    <div className="w-full px-1 sm:px-2">
      {/* Mobile View - Compact */}
      <div className="flex sm:hidden items-center justify-between gap-1 mt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || isLoading}
          className="cursor-pointer disabled:cursor-not-allowed shrink-0 h-6 w-6 px-0 dark:border-gray-700 dark:hover:bg-gray-700 dark:text-gray-200"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-3 h-3" />
        </Button>

        <div className="flex items-center gap-1 flex-1 justify-center overflow-x-auto scrollbar-thin scrollbar-hide">
          {pages.map((page, idx) => (
            <Button
              key={idx}
              variant={page === currentPage ? "default" : "ghost"}
              size="sm"
              onClick={() => typeof page === "number" && onPageChange(page)}
              disabled={typeof page !== "number" || isLoading}
              className="cursor-pointer disabled:cursor-not-allowed min-w-6 h-6 px-1 text-xs shrink-0 dark:border-gray-700 dark:hover:bg-gray-700 dark:text-gray-200"
              aria-label={
                typeof page === "number" ? `Page ${page}` : "More pages"
              }
              aria-current={page === currentPage ? "page" : undefined}
            >
              {page}
            </Button>
          ))}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || isLoading}
          className="cursor-pointer disabled:cursor-not-allowed shrink-0 h-6 w-6 px-0 dark:border-gray-700 dark:hover:bg-gray-700 dark:text-gray-200"
          aria-label="Next page"
        >
          <ChevronRight className="w-3 h-3" />
        </Button>
      </div>

      {/* Desktop/Tablet View */}
      <div className="hidden sm:flex items-center justify-center gap-1 mt-2 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || isLoading}
          className="cursor-pointer disabled:cursor-not-allowed h-6 w-6 dark:border-gray-700 dark:hover:bg-gray-700 dark:text-gray-200"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-3 h-3" />
        </Button>

        {pages.map((page, idx) => (
          <Button
            key={idx}
            variant={page === currentPage ? "default" : "ghost"}
            size="sm"
            onClick={() => typeof page === "number" && onPageChange(page)}
            disabled={typeof page !== "number" || isLoading}
            className="cursor-pointer disabled:cursor-not-allowed min-w-6 h-6 px-1 text-xs dark:border-gray-700 dark:hover:bg-gray-700 dark:text-gray-200"
            aria-label={
              typeof page === "number" ? `Page ${page}` : "More pages"
            }
            aria-current={page === currentPage ? "page" : undefined}
          >
            {page}
          </Button>
        ))}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || isLoading}
          className="cursor-pointer disabled:cursor-not-allowed h-6 w-6 px-0 dark:border-gray-700 dark:hover:bg-gray-700 dark:text-gray-200"
          aria-label="Next page"
        >
          <ChevronRight className="w-3 h-3" />
        </Button>
      </div>

      {/* Page Info and Items Per Page Selector */}
      <div className="flex flex-col sm:flex-row items-center justify-between mt-1 gap-1">
        <div className="text-xs text-muted-foreground dark:text-gray-400">
          Page {currentPage} of {totalPages}
          {totalItems && ` (${totalItems} total items)`}
        </div>

        {onItemsPerPageChange && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground dark:text-gray-400">
              Show:
            </span>
            <div className="flex gap-1">
              {pageOptions.map((option) => {
                const value =
                  typeof option === "object" ? option.value : option;
                const label =
                  typeof option === "object" ? option.label : option;
                const isActive = itemsPerPage === value;

                return (
                  <Button
                    key={value}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => onItemsPerPageChange(value)}
                    disabled={isLoading}
                    className="cursor-pointer disabled:cursor-not-allowed h-6 px-1.5 text-xs dark:border-gray-700 dark:hover:bg-gray-700 dark:text-gray-200"
                    aria-label={`Show ${label} items per page`}
                  >
                    {label}
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Pagination;
