import { useEffect, useState } from "react";
import type { AttachedFile } from "@/app/types/global";
import LoadingSpinner from "@/components/loadingSpinner";

type PreviewModalProps = {
  file: AttachedFile;
};

const mediaTypes = { pdf: "pdf", image: "image", video: "video" } as const;

const mimetypeToMediaType: Record<string, keyof typeof mediaTypes> = {
  "application/pdf": mediaTypes.pdf,
  "image/jpeg": mediaTypes.image,
  "image/png": mediaTypes.image,
  "image/gif": mediaTypes.image,
  "image/webp": mediaTypes.image,
  "video/mp4": mediaTypes.video,
  "video/webm": mediaTypes.video,
  "video/quicktime": mediaTypes.video,
} as const;

export default function PreviewModal({ file }: PreviewModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const mediaType: keyof typeof mediaTypes | undefined = mimetypeToMediaType[file.mimetype];
  const isPreviewSupported = mediaType !== undefined;
  const isPdf = mediaType === "pdf";

  useEffect(() => {
    setIsLoaded(false);
    setError(null);
  }, [file]);

  return (
    <div
      className={`transition-duration-300 flex w-full grow justify-center transition ${isPdf ? "min-h-[600px]" : "min-h-[300px]"} ${isPreviewSupported ? "rounded-b" : ""}`}
    >
      {!isLoaded && !error && isPreviewSupported ? (
        <LoadingSpinner className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      ) : null}
      <div className="flex w-full items-center">
        {mediaType == "pdf" && !error && file.presignedUrl ? (
          <object
            data={file.presignedUrl}
            type="application/pdf"
            className="h-[80vh] w-full rounded-b"
            onLoad={() => setIsLoaded(true)}
            onError={() => setError("Failed to load PDF. Please reload the page.")}
          >
            <p>
              PDF cannot be displayed.{" "}
              <a href={file.presignedUrl} download className="underline">
                Download
              </a>{" "}
              instead.
            </p>
          </object>
        ) : null}

        {mediaType == "image" && !error && file.presignedUrl ? (
          <img
            className="max-h-[80vh] w-full rounded-b object-contain"
            src={file.presignedUrl}
            crossOrigin="anonymous"
            alt=""
            onError={() => {
              setError("Failed to load image. Please reload the page.");
            }}
            onLoad={() => setIsLoaded(true)}
          />
        ) : null}

        {mediaType == "video" && !error && file.presignedUrl ? (
          <video
            className="max-h-[80vh] w-full rounded-b"
            src={file.presignedUrl}
            autoPlay
            controls
            onError={() => {
              setError("Failed to load media. Please reload the page.");
            }}
            onLoad={() => setIsLoaded(true)}
          />
        ) : null}

        {error ? <div className="flex items-center p-3">{error}</div> : null}

        {!isPreviewSupported ? (
          <span className="px-4">
            Media preview is not available for this file type.
            <br />
            Please{" "}
            <a href={file.presignedUrl ?? undefined} download className="underline">
              download
            </a>{" "}
            the file to see it.
          </span>
        ) : null}
      </div>
    </div>
  );
}
