import * as React from "react"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"
import { DayPicker, getDefaultClassNames } from "react-day-picker";

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/shared/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  ...props
}) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "bg-background group/calendar p-3 [--cell-size:2.5rem] in-data-[slot=card-content]:bg-transparent in-data-[slot=popover-content]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString("default", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn("relative flex flex-col gap-4 md:flex-row", defaultClassNames.months),
        month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "h-[--cell-size] w-[--cell-size] select-none p-0 aria-disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "h-[--cell-size] w-[--cell-size] select-none p-0 aria-disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex h-[--cell-size] w-full items-center justify-center px-[--cell-size]",
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          "flex h-[--cell-size] w-full items-center justify-center gap-1.5 text-sm font-medium",
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn(
          "has-focus:border-ring border-input shadow-xs has-focus:ring-ring/50 has-focus:ring-[3px] relative rounded-md border",
          defaultClassNames.dropdown_root
        ),
        dropdown: cn("bg-popover absolute inset-0 opacity-0", defaultClassNames.dropdown),
        caption_label: cn(
          "select-none font-medium dark:text-gray-200", 
          captionLayout === "label"
            ? "text-sm"
            : "[&>svg]:text-muted-foreground flex h-8 items-center gap-1 rounded-md pl-2 pr-1 text-sm [&>svg]:size-3.5", 
          defaultClassNames.caption_label
        ),
        table: "w-full border-collapse",
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "text-muted-foreground flex-1 select-none rounded-md text-[0.8rem] font-normal dark:text-gray-400",
          defaultClassNames.weekday
        ),
        week: cn("mt-2 flex w-full", defaultClassNames.week),
        week_number_header: cn("w-[--cell-size] select-none", defaultClassNames.week_number_header),
        week_number: cn(
          "text-muted-foreground select-none text-[0.8rem] dark:text-gray-400",
          defaultClassNames.week_number
        ),
        day: cn(
          "group/day relative aspect-square h-full w-full select-none p-0 text-center",
          // Range styling yang diperbaiki
          "[&:has([data-range-start=true])]:rounded-l-md",
          "[&:has([data-range-end=true])]:rounded-r-md",
          "[&:has([data-range-middle=true])]:bg-blue-50 dark:[&:has([data-range-middle=true])]:bg-blue-900/20",
          defaultClassNames.day
        ),
        range_start: cn(
          "bg-blue-500 dark:bg-blue-600 rounded-l-md", 
          defaultClassNames.range_start
        ),
        range_middle: cn(
          "bg-blue-50 dark:bg-blue-900/20 rounded-none", 
          defaultClassNames.range_middle
        ),
        range_end: cn(
          "bg-blue-500 dark:bg-blue-600 rounded-r-md", 
          defaultClassNames.range_end
        ),
        today: cn(
          "bg-accent text-accent-foreground font-semibold rounded-md data-[selected=true]:rounded-none dark:bg-gray-700 dark:text-gray-200",
          defaultClassNames.today
        ),
        outside: cn(
          "text-muted-foreground opacity-50 aria-selected:text-muted-foreground dark:text-gray-600",
          defaultClassNames.outside
        ),
        disabled: cn(
          "text-muted-foreground opacity-30 dark:text-gray-600", 
          defaultClassNames.disabled
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (<div data-slot="calendar" ref={rootRef} className={cn(className)} {...props} />);
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return (<ChevronLeftIcon className={cn("size-4 dark:text-gray-300", className)} {...props} />);
          }

          if (orientation === "right") {
            return (<ChevronRightIcon className={cn("size-4 dark:text-gray-300", className)} {...props} />);
          }

          return (<ChevronDownIcon className={cn("size-4 dark:text-gray-300", className)} {...props} />);
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex size-[--cell-size] items-center justify-center text-center dark:text-gray-300">
                {children}
              </div>
            </td>
          );
        },
        ...components,
      }}
      {...props} />
  );
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}) {
  const defaultClassNames = getDefaultClassNames()

  const ref = React.useRef(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        // Base styles
        "flex aspect-square h-auto w-full min-w-[--cell-size] flex-col gap-1 font-normal leading-none",
        "hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200",
        "transition-colors duration-150",
        
        // Single date selection (bukan range)
        "data-[selected-single=true]:bg-blue-600 data-[selected-single=true]:text-white",
        "data-[selected-single=true]:hover:bg-blue-700 data-[selected-single=true]:rounded-md",
        "dark:data-[selected-single=true]:bg-blue-600 dark:data-[selected-single=true]:text-white",
        
        // Range start (tanggal awal)
        "data-[range-start=true]:bg-blue-600 data-[range-start=true]:text-white",
        "data-[range-start=true]:rounded-l-md data-[range-start=true]:rounded-r-none",
        "data-[range-start=true]:hover:bg-blue-700",
        "dark:data-[range-start=true]:bg-blue-600",
        
        // Range end (tanggal akhir)
        "data-[range-end=true]:bg-blue-600 data-[range-end=true]:text-white",
        "data-[range-end=true]:rounded-r-md data-[range-end=true]:rounded-l-none",
        "data-[range-end=true]:hover:bg-blue-700",
        "dark:data-[range-end=true]:bg-blue-600",
        
        // Range middle (tanggal di antara start dan end)
        "data-[range-middle=true]:bg-blue-100 data-[range-middle=true]:text-blue-900",
        "data-[range-middle=true]:rounded-none",
        "data-[range-middle=true]:hover:bg-blue-200",
        "dark:data-[range-middle=true]:bg-blue-900/30 dark:data-[range-middle=true]:text-blue-200",
        
        // Focus state
        "group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-ring/50",
        "group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10",
        "group-data-[focused=true]/day:ring-2 group-data-[focused=true]/day:ring-offset-1",
        
        // Text sizing
        "[&>span]:text-xs [&>span]:opacity-70",
        
        defaultClassNames.day,
        className
      )}
      {...props} />
  );
}

export { Calendar, CalendarDayButton }