import { useCallback, useState } from "react";
import { toast } from "./use-toast";

export interface UseManualSaveOptions<T> {
  onSave: (data: T) => Promise<void>;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  successMessage?: string;
  errorMessage?: string;
}

export interface UseManualSaveReturn<T> {
  currentData: T;
  originalData: T;
  isDirty: boolean;
  isLoading: boolean;
  error: Error | null;
  updateData: (updates: Partial<T>) => void;
  setData: (data: T) => void;
  handleSave: () => Promise<void>;
  handleCancel: () => void;
  handleReset: (newOriginalData: T) => void;
}

export function useManualSave<T extends Record<string, any>>(
  initialData: T,
  options: UseManualSaveOptions<T>,
): UseManualSaveReturn<T> {
  const [originalData, setOriginalData] = useState<T>(initialData);
  const [currentData, setCurrentData] = useState<T>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const isDirty = JSON.stringify(currentData) !== JSON.stringify(originalData);

  const updateData = useCallback((updates: Partial<T>) => {
    setCurrentData((prev) => ({ ...prev, ...updates }));
    setError(null);
  }, []);

  const setData = useCallback((data: T) => {
    setCurrentData(data);
    setError(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!isDirty) return;

    setIsLoading(true);
    setError(null);

    try {
      await options.onSave(currentData);
      setOriginalData(currentData);

      if (options.successMessage) {
        toast({
          title: "Success",
          description: options.successMessage,
        });
      }

      options.onSuccess?.();
    } catch (err) {
      const error = err instanceof Error ? err : new Error("An error occurred");
      setError(error);

      const errorMessage = options.errorMessage || error.message;
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });

      options.onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [currentData, isDirty, options]);

  const handleCancel = useCallback(() => {
    setCurrentData(originalData);
    setError(null);
  }, [originalData]);

  const handleReset = useCallback((newOriginalData: T) => {
    setOriginalData(newOriginalData);
    setCurrentData(newOriginalData);
    setError(null);
  }, []);

  return {
    currentData,
    originalData,
    isDirty,
    isLoading,
    error,
    updateData,
    setData,
    handleSave,
    handleCancel,
    handleReset,
  };
}
