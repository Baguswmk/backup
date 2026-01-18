import { useMemo } from "react";
import { Button } from "@/shared/components/ui/button";
import { ChevronRight, ChevronLeft } from "lucide-react";

const Pagination = ({ currentPage, totalPages, onPageChange, isLoading }) => {
  const pages = useMemo(() => {
    const items = [];
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
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

  return (
    <div className="w-full px-2 sm:px-4">
      {/* Mobile View - Compact */}
      <div className="flex sm:hidden items-center justify-between gap-2 mt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || isLoading}
          className="cursor-pointer disabled:cursor-not-allowed shrink-0 h-8 px-2 dark:border-gray-700 dark:hover:bg-gray-700 dark:text-gray-200"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <div className="flex items-center gap-1 flex-1 justify-center overflow-x-auto scrollbar-hide">
          {pages.map((page, idx) => (
            <Button
              key={idx}
              variant={page === currentPage ? "default" : "ghost"}
              size="sm"
              onClick={() => typeof page === "number" && onPageChange(page)}
              disabled={typeof page !== "number" || isLoading}
              className="cursor-pointer disabled:cursor-not-allowed min-w-8 h-8 px-2 text-xs shrink-0 dark:border-gray-700 dark:hover:bg-gray-700 dark:text-gray-200"
              aria-label={typeof page === "number" ? `Page ${page}` : "More pages"}
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
          className="cursor-pointer disabled:cursor-not-allowed shrink-0 h-8 px-2 dark:border-gray-700 dark:hover:bg-gray-700 dark:text-gray-200"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Desktop/Tablet View */}
      <div className="hidden sm:flex items-center justify-center gap-2 mt-4 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || isLoading}
          className="cursor-pointer disabled:cursor-not-allowed dark:border-gray-700 dark:hover:bg-gray-700 dark:text-gray-200"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="ml-1 hidden md:inline">Previous</span>
        </Button>

        {pages.map((page, idx) => (
          <Button
            key={idx}
            variant={page === currentPage ? "default" : "ghost"}
            size="sm"
            onClick={() => typeof page === "number" && onPageChange(page)}
            disabled={typeof page !== "number" || isLoading}
            className="cursor-pointer disabled:cursor-not-allowed min-w-9 dark:border-gray-700 dark:hover:bg-gray-700 dark:text-gray-200"
            aria-label={typeof page === "number" ? `Page ${page}` : "More pages"}
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
          className="cursor-pointer disabled:cursor-not-allowed dark:border-gray-700 dark:hover:bg-gray-700 dark:text-gray-200"
          aria-label="Next page"
        >
          <span className="mr-1 hidden md:inline">Next</span>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Page Info - Mobile */}
      <div className="flex sm:hidden justify-center mt-2 text-xs text-muted-foreground dark:text-gray-400">
        Page {currentPage} of {totalPages}
      </div>
    </div>
  );
};

export default Pagination;
