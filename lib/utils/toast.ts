import { toast } from "@/components/hooks/use-toast";

export function showErrorToast(title: string, error?: unknown) {
  const message = error
    ? error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "An unexpected error occurred"
    : undefined;

  toast({
    title,
    description: message,
    variant: "destructive",
  });
}

export function showSuccessToast(title: string, description?: string) {
  toast({
    title,
    description,
    variant: "success",
  });
}
