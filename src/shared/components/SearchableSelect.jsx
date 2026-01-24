import { useState, useMemo, useEffect, useRef } from "react";
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
  CommandList,
} from "@/shared/components/ui/command";
import { cn } from "@/lib/utils";

const SearchableSelect = ({
  items = [],
  id,
  value,
  onChange,
  placeholder = "Pilih...",
  emptyText = "Data tidak ditemukan",
  disabled = false,
  error = false,
  allowClear = false,
}) => {
  const [open, setOpen] = useState(false);
  const commandListRef = useRef(null);

  const selected = useMemo(
    () => items.find((it) => String(it.value) === String(value)) || null,
    [items, value],
  );

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
          id={id}
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between cursor-pointer disabled:cursor-not-allowed hover:bg-gray-200",
            "dark:bg-gray-700 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700",
            error ? "border-red-500 dark:border-red-500" : "",
          )}
        >
          <span className="truncate text-left">
            {selected ? selected.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0 bg-neutral-50 border-none dark:bg-gray-800 dark:border-gray-700"
        align="start"
        onWheel={(e) => e.stopPropagation()}
      >
        <Command
          loop
          shouldFilter
          className="dark:bg-gray-800 dark:text-gray-200"
        >
          <CommandInput
            placeholder={`${placeholder.toLowerCase()}`}
            className="h-9 dark:text-gray-200"
          />
          <CommandList
            ref={commandListRef}
            className="max-h-[300px] overflow-y-auto"
          >
            <CommandEmpty className="dark:text-gray-400">
              {emptyText}
            </CommandEmpty>
            <CommandGroup>
              {allowClear && (
                <CommandItem
                  value="__clear_selection__"
                  onSelect={() => {
                    onChange?.(null);
                    setOpen(false);
                  }}
                  className="cursor-pointer dark:hover:bg-gray-700 dark:text-gray-400"
                >
                  <span className="text-gray-500 dark:text-gray-400 italic">
                    Kosongkan pilihan
                  </span>
                </CommandItem>
              )}
              {items.map((item, idx) => (
                <CommandItem
                  key={item.id || `item-${idx}-${item.value}`}
                  value={`${item.label} ${item.hint ?? ""}`}
                  onSelect={() => {
                    onChange?.(item.value);
                    setOpen(false);
                  }}
                  className="cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 dark:text-gray-200"
                >
                  <div className="flex items-center gap-2 w-full">
                    <Check
                      className={cn(
                        "h-4 w-4",
                        String(item.value) === String(value)
                          ? "opacity-100"
                          : "opacity-0",
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
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default SearchableSelect;
