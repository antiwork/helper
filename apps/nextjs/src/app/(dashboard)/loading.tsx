import LoadingSpinner from "@/components/loadingSpinner";

export default function Loading() {
  return (
    <div className="flex h-screen items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
}
