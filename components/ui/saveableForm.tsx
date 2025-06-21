import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export interface SaveableFormProps {
  isDirty: boolean;
  isLoading: boolean;
  onSave: () => void;
  onCancel: () => void;
  children: ReactNode;
  saveText?: string;
  cancelText?: string;
  showUnsavedIndicator?: boolean;
  className?: string;
  disabled?: boolean;
}

export function SaveableForm({
  isDirty,
  isLoading,
  onSave,
  onCancel,
  children,
  saveText = "Save Changes",
  cancelText = "Cancel",
  showUnsavedIndicator = true,
  className,
  disabled = false,
}: SaveableFormProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <div className="relative">{children}</div>

      {isDirty && (
        <div className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-orange-500 rounded-full" />
            <span className="text-sm text-orange-700 dark:text-orange-300">You have unsaved changes</span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onCancel} disabled={isLoading || disabled}>
              {cancelText}
            </Button>
            <Button size="sm" onClick={onSave} disabled={isLoading || disabled}>
              {isLoading ? "Saving..." : saveText}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
