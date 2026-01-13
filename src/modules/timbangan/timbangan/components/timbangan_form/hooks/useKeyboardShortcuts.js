// TimbanganForm/hooks/useKeyboardShortcuts.js
import { useEffect } from "react";

export const useKeyboardShortcuts = ({
  mode,
  wsConnected,
  currentWeight,
  isWeightStable,
  manualEditMode,
  isValid,
  isSubmitting,
  formSummary,
  showShortcutHelp,
  handleInsert,
  handleSubmit,
  resetForm,
  setShowShortcutHelp,
  setManualEditMode,
  onSubmit,
}) => {
  useEffect(() => {
    if (mode !== "create") return;

    const handleShortcut = (e) => {
      // Alt + D: Focus Hull No select
      if (e.altKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        const wrapper = document.getElementById("hull-no-select-wrapper");
        if (wrapper) {
          const selectButton = wrapper.querySelector('button[role="combobox"]');
          if (selectButton && !selectButton.disabled) {
            const isOpen = selectButton.getAttribute("aria-expanded") === "true";
            if (isOpen) {
              const commandInput = document.querySelector("input[cmdk-input]");
              if (commandInput) {
                commandInput.focus();
                commandInput.value = "";
                commandInput.dispatchEvent(new Event("input", { bubbles: true }));
              }
            } else {
              selectButton.click();
              setTimeout(() => {
                const commandInput = document.querySelector("input[cmdk-input]");
                if (commandInput) {
                  commandInput.focus();
                  commandInput.value = "";
                  commandInput.dispatchEvent(new Event("input", { bubbles: true }));
                }
              }, 100);
            }
          }
        }
      }

      // Alt + W: Focus weight input
      if (e.altKey && e.key.toLowerCase() === "w") {
        e.preventDefault();
        const weightInput = document.getElementById("gross_weight");
        if (weightInput && !weightInput.readOnly) {
          weightInput.focus();
        }
      }

      // Alt + I: Insert weight
      if (e.altKey && e.key.toLowerCase() === "i") {
        e.preventDefault();
        if (wsConnected && currentWeight && !manualEditMode && isWeightStable) {
          handleInsert();
        }
      }

      // Alt + M: Toggle manual mode
      if (e.altKey && e.key.toLowerCase() === "m") {
        e.preventDefault();
        if (mode === "create") {
          setManualEditMode((prev) => !prev);
        }
      }

      // Alt + S: Submit form
      if (e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (isValid && !isSubmitting && formSummary.isAutoFilled) {
          handleSubmit(e);
        }
      }

      // Alt + R: Reset form
      if (e.altKey && e.key.toLowerCase() === "r") {
        e.preventDefault();
        resetForm();
      }

      // Alt + H: Toggle shortcut help
      if (e.altKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        setShowShortcutHelp((prev) => !prev);
      }

      // Escape: Close or cancel
      if (e.key === "Escape") {
        e.preventDefault();
        if (showShortcutHelp) {
          setShowShortcutHelp(false);
        } else if (onSubmit) {
          onSubmit({ cancelled: true });
        }
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [
    mode,
    wsConnected,
    currentWeight,
    isWeightStable,
    manualEditMode,
    isValid,
    isSubmitting,
    formSummary.isAutoFilled,
    showShortcutHelp,
    handleInsert,
    handleSubmit,
    resetForm,
    setShowShortcutHelp,
    setManualEditMode,
    onSubmit,
  ]);
};