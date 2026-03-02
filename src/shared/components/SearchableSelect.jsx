import {
  useState,
  useMemo,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
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

const SearchableSelect = forwardRef(
  (
    {
      items = [],
      id,
      value,
      onChange,
      placeholder = "Pilih...",
      emptyText = "Data tidak ditemukan",
      disabled = false,
      error = false,
      allowClear = false,
    },
    ref,
  ) => {
    const [open, setOpen] = useState(false);
    const [searchValue, setSearchValue] = useState("");
    const commandListRef = useRef(null);
    const buttonRef = useRef(null);

    useImperativeHandle(ref, () => ({
      focus: () => {
        setOpen(true);
        if (buttonRef.current) {
          buttonRef.current.focus();
        }
      },
    }));

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

    useEffect(() => {
      const handleWheel = (e) => {
        if (open && commandListRef.current?.contains(e.target)) {
          e.stopPropagation();
        }
      };

      if (open) {
        document.addEventListener("wheel", handleWheel, { capture: true });
      }

      return () => {
        document.removeEventListener("wheel", handleWheel, { capture: true });
      };
    }, [open]);

    useEffect(() => {
      if (searchValue && commandListRef.current) {
        commandListRef.current.scrollTop = 0;
      }
    }, [searchValue]);

    // Auto-scroll highlighted item into view
    useEffect(() => {
      if (open) {
        const timer = setTimeout(() => {
          const highlighted = document.querySelector('[data-selected="true"]');
          if (highlighted && commandListRef.current) {
            highlighted.scrollIntoView({
              block: "nearest",
              behavior: "smooth",
            });
          }
        }, 100);
        return () => clearTimeout(timer);
      }
    }, [open]);

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={buttonRef}
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
          className="w-[--radix-popover-trigger-width] p-0 bg-neutral-50 border-none dark:bg-gray-800 dark:border-gray-700 z-[60]"
          align="start"
        >
          <Command
            loop
            shouldFilter
            className="dark:bg-gray-800 dark:text-gray-200"
          >
            <CommandInput
              placeholder={`${placeholder.toLowerCase()}`}
              className="h-9 dark:text-gray-200"
              onValueChange={setSearchValue}
            />
            <CommandList
              ref={commandListRef}
              className="max-h-[300px] overflow-y-auto scrollbar-thin overscroll-contain"
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
                    className={cn(
                      "cursor-pointer transition-colors duration-150",
                      "dark:text-gray-400",
                      // Highlight state with stronger visual
                      "aria-selected:bg-blue-100 aria-selected:dark:bg-blue-900/40",
                      "aria-selected:text-blue-900 aria-selected:dark:text-blue-200",
                      "aria-selected:border-l-4 aria-selected:border-blue-500 aria-selected:dark:border-blue-400",
                      "aria-selected:pl-2",
                      // Hover state
                      "hover:bg-gray-200 dark:hover:bg-gray-700",
                    )}
                  >
                    <span className="text-gray-500 dark:text-gray-400 italic">
                      Kosongkan pilihan
                    </span>
                  </CommandItem>
                )}
                {items.map((item, idx) => {
                  const isSelected = String(item.value) === String(value);
                  return (
                    <CommandItem
                      key={item.id || `item-${idx}-${item.value}`}
                      value={`${item.label} ${item.hint ?? ""}`}
                      onSelect={() => {
                        onChange?.(item.value);
                        setOpen(false);
                      }}
                      data-selected={isSelected}
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
                        // Selected item (current value) background
                        isSelected && "bg-gray-100 dark:bg-gray-800/50",
                      )}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <Check
                          className={cn(
                            "h-4 w-4 transition-all",
                            isSelected
                              ? "opacity-100 text-green-600 dark:text-green-400"
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
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  },
);
SearchableSelect.displayName = "SearchableSelect";

export default SearchableSelect;
