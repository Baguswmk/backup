import React, { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "@/shared/components/ui/button";
import { ChevronsUpDown, Check } from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/shared/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/shared/components/ui/command";
import { cn } from "@/lib/utils";

const MultiSearchableSelect = ({
  items = [],
  values = [],
  onChange,
  placeholder = "Pilih...",
  emptyText = "Data tidak ditemukan",
  disabled = false,
  error = false,
}) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const commandListRef = useRef(null);

  const selectedItems = useMemo(
    () => items.filter((it) => values.includes(String(it.value))),
    [items, values],
  );

  const toggleItem = (value) => {
    const valueStr = String(value);
    if (values.includes(valueStr)) {
      onChange?.(values.filter((v) => v !== valueStr));
    } else {
      onChange?.([...values, valueStr]);
    }
  };

  useEffect(() => {
    if (searchValue && commandListRef.current) {
      commandListRef.current.scrollTop = 0;
    }
  }, [searchValue]);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        const input = document.querySelector("input[cmdk-input]");
        if (input) {
          input.focus();
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between cursor-pointer disabled:cursor-not-allowed hover:bg-gray-200",
            "dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700",
            error ? "border-red-500 dark:border-red-500" : "",
          )}
        >
          <span className="truncate text-left">
            {selectedItems.length > 0
              ? `${selectedItems.length} dipilih: ${selectedItems
                  .map((i) => i.label)
                  .join(", ")}`
              : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="border-none w-[--radix-popover-trigger-width] p-0 dark:bg-gray-800 dark:border-gray-700 z-[60]"
        align="start"
      >
        <Command 
          loop
          shouldFilter
          className="bg-neutral-50 dark:bg-gray-800 dark:text-gray-200"
        >
          <CommandInput
            placeholder={`Cari ${placeholder.toLowerCase()}`}
            className="dark:text-gray-200"
            onValueChange={setSearchValue}
          />
          <CommandEmpty className="dark:text-gray-400">
            {emptyText}
          </CommandEmpty>
          <CommandGroup 
            ref={commandListRef} 
            className="max-h-64 overflow-auto"
          >
            {items.map((item) => {
              const isSelected = values.includes(String(item.value));
              return (
                <CommandItem
                  key={item.value}
                  value={`${item.label} ${item.hint ?? ""}`}
                  onSelect={() => toggleItem(item.value)}
                  className={cn(
                    "cursor-pointer transition-all duration-150",
                    "dark:text-gray-200",
                    // Highlight state with stronger visual (when navigating with keyboard)
                    "aria-selected:bg-blue-100 aria-selected:dark:bg-blue-900/50",
                    "aria-selected:text-blue-900 aria-selected:dark:text-blue-100",
                    "aria-selected:border-l-4 aria-selected:border-blue-500 aria-selected:dark:border-blue-400",
                    "aria-selected:pl-2 aria-selected:font-medium",
                    "aria-selected:shadow-sm",
                    // Hover state (mouse)
                    "hover:bg-gray-200 dark:hover:bg-gray-700",
                    // Selected items background
                    isSelected && "bg-green-50 dark:bg-green-900/20"
                  )}
                >
                  <div className="flex items-center gap-2 w-full">
                    <Check
                      className={cn(
                        "h-4 w-4 transition-all",
                        isSelected
                          ? "opacity-100 text-green-600 dark:text-green-400"
                          : "opacity-0"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{item.label}</div>
                      {item.hint && (
                        <div className="text-xs text-muted-foreground dark:text-gray-400 truncate">
                          {item.hint}
                        </div>
                      )}
                    </div>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default MultiSearchableSelect;