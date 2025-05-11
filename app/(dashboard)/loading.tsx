import LoadingSpinner from "@/components/loadingSpinner";

export default function Loading() {
  return (
    <div className="flex h-dvh items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
}
