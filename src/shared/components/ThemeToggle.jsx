import React, { useState, useEffect } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

const ThemeToggle = () => {
  const [theme, setTheme] = useState("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const savedTheme = localStorage.getItem("internal_theme");

    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    } else {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      const initialTheme = prefersDark ? "dark" : "light";
      setTheme("system");
      applyTheme(initialTheme);
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => {
      if (theme === "system") {
        applyTheme(e.matches ? "dark" : "light");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const applyTheme = (newTheme) => {
    const root = document.documentElement;

    let actualTheme = newTheme;

    if (newTheme === "system") {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      actualTheme = prefersDark ? "dark" : "light";
    }

    if (actualTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    window.dispatchEvent(
      new CustomEvent("themechange", {
        detail: { theme: actualTheme },
      }),
    );
  };

  const toggleTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem("internal_theme", newTheme);
    applyTheme(newTheme);
  };

  const getCurrentTheme = () => {
    if (theme === "system") {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      return prefersDark ? "dark" : "light";
    }
    return theme;
  };

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        disabled
        className="w-9 h-9 rounded-md opacity-50"
      >
        <Sun className="w-5 h-5" />
      </Button>
    );
  }

  const currentTheme = getCurrentTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "w-9 h-9 rounded-md transition-all duration-200",
            "hover:bg-gray-100 dark:hover:bg-slate-700",
            "dark:text-gray-200 cursor-pointer",
          )}
          aria-label="Toggle theme"
        >
          {currentTheme === "dark" ? (
            <Moon className="w-5 h-5 text-blue-500 dark:text-blue-400 transition-all duration-300" />
          ) : (
            <Sun className="w-5 h-5 text-yellow-500 transition-all duration-300" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className={cn(
          "w-40 shadow-lg transition-colors duration-200",
          "bg-neutral-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700",
        )}
      >
        <DropdownMenuItem
          onClick={() => toggleTheme("light")}
          className={cn(
            "flex items-center gap-2 cursor-pointer transition-all duration-200",
            "hover:bg-gray-100 dark:hover:bg-slate-800",
            "dark:text-gray-200",
            theme === "light" &&
              "bg-orange-50 dark:bg-orange-900/20 font-medium text-[#ea661c] dark:text-orange-400",
          )}
        >
          <Sun className="w-4 h-4 text-yellow-500" />
          <span>Light</span>
          {theme === "light" && (
            <span className="ml-auto text-xs font-semibold text-[#ea661c] dark:text-orange-400">
              ✓
            </span>
          )}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => toggleTheme("dark")}
          className={cn(
            "flex items-center gap-2 cursor-pointer transition-all duration-200",
            "hover:bg-gray-100 dark:hover:bg-slate-800",
            "dark:text-gray-200",
            theme === "dark" &&
              "bg-orange-50 dark:bg-orange-900/20 font-medium text-[#ea661c] dark:text-orange-400",
          )}
        >
          <Moon className="w-4 h-4 text-blue-500 dark:text-blue-400" />
          <span>Dark</span>
          {theme === "dark" && (
            <span className="ml-auto text-xs font-semibold text-[#ea661c] dark:text-orange-400">
              ✓
            </span>
          )}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => toggleTheme("system")}
          className={cn(
            "flex items-center gap-2 cursor-pointer transition-all duration-200",
            "hover:bg-gray-100 dark:hover:bg-slate-800",
            "dark:text-gray-200",
            theme === "system" &&
              "bg-orange-50 dark:bg-orange-900/20 font-medium text-[#ea661c] dark:text-orange-400",
          )}
        >
          <Monitor className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span>System</span>
          {theme === "system" && (
            <span className="ml-auto text-xs font-semibold text-[#ea661c] dark:text-orange-400">
              ✓
            </span>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ThemeToggle;
