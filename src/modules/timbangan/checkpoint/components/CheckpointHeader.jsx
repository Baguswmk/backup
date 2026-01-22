import React from "react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Plus, Loader2 } from "lucide-react";
import { KEYBOARD_SHORTCUTS } from "@/modules/timbangan/ritase/constant/ritaseConstants";

const CheckpointHeader = ({
  username,
  onOpenInputForm,
  isInitialLoading = false,
  isCheckingConnection = false,
  type,
}) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Dashboard {type}
        </h1>
        <p className="text-sm md:text-base text-gray-600">
          Welcome back, {username}
        </p>
      </div>

      <div className="flex justify-end items-center gap-2">
        <Button
          onClick={onOpenInputForm}
          disabled={isInitialLoading || isCheckingConnection}
          className="flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed dark:text-gray-200 dark:bg-slate-700"
        >
          {isCheckingConnection ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Input Timbangan
              <Badge variant="outline" className="font-mono dark:text-gray-200">
                {KEYBOARD_SHORTCUTS.INPUT_FORM.description}
              </Badge>
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default CheckpointHeader;
