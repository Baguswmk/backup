import React, { useState, useMemo } from "react";
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

  const selectedItems = useMemo(
    () => items.filter((it) => values.includes(String(it.value))),
    [items, values]
  );

  const toggleItem = (value) => {
    const valueStr = String(value);
    if (values.includes(valueStr)) {
      onChange?.(values.filter((v) => v !== valueStr));
    } else {
      onChange?.([...values, valueStr]);
    }
  };

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
            "w-full justify-between cursor-pointer disabled:cursor-not-allowed ",
            "dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700",
            error ? "border-red-500 dark:border-red-500" : ""
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
        className="border-none w-[--radix-popover-trigger-width] p-0 dark:bg-gray-800 dark:border-gray-700"
        align="start"
      >
        <Command className="bg-white dark:bg-gray-800 dark:text-gray-200">
          <CommandInput 
            placeholder={`Cari ${placeholder.toLowerCase()}`}
            className="dark:text-gray-200"
          />
          <CommandEmpty className="dark:text-gray-400">{emptyText}</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {items.map((item) => (
              <CommandItem
                key={item.value}
                value={`${item.label} ${item.hint ?? ""}`}
                onSelect={() => toggleItem(item.value)}
                className="cursor-pointer dark:hover:bg-gray-700 dark:text-gray-200"
              >
                <div className="flex items-center gap-2 w-full">
                  <Check
                    className={cn(
                      "h-4 w-4",
                      values.includes(String(item.value))
                        ? "opacity-100"
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
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default MultiSearchableSelect;