import LoadingSpinner from "@/components/loadingSpinner";

export default function Loading() {
  return (
    <div className="flex grow h-full items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
}
