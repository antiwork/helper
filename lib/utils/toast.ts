import { toast } from "@/components/hooks/use-toast";

export function showErrorToast(operation: string, error: unknown) {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "An unexpected error occurred";

  toast({
    title: `Failed to ${operation}`,
    description: message,
    variant: "destructive",
  });
}

export function showSuccessToast(operation: string, description?: string) {
  toast({
    title: operation.charAt(0).toUpperCase() + operation.slice(1),
    description,
    variant: "success",
  });
}
