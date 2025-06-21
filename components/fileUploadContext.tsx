import React, { createContext, useContext, useState } from "react";
import { assertDefined } from "@/components/utils/assert";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/trpc/react";

export enum UploadStatus {
  UPLOADING = "uploading",
  UPLOADED = "uploaded",
  FAILED = "failed",
}

export type UnsavedFileInfo = {
  file: File;
  blobUrl: string;
  status: UploadStatus;
  url: string | null;
  slug: string | null;
  inline: boolean;
};
type OnUpload = { upload: Promise<UnsavedFileInfo>; blobUrl: string };

const TOTAL_FILE_SIZE_LIMIT = 26210000; // 25MiB in bytes (the limit imposed by Gmail)

const FileUploadContext = createContext<{
  unsavedFiles: UnsavedFileInfo[];
  readyFiles: UnsavedFileInfo[];
  failedAttachmentsExist: boolean;
  uploading: boolean;
  hasReadyFileAttachments: boolean;
  onUpload: (file: File, { inline }: { inline: boolean }) => OnUpload;
  onDelete: (file: File) => void;
  onRetry: (file: File) => OnUpload;
  resetFiles: (files: UnsavedFileInfo[]) => void;
} | null>(null);

const generateUnsavedFileInfo = (file: File, inline: boolean): UnsavedFileInfo => ({
  file,
  inline,
  status: UploadStatus.UPLOADING,
  blobUrl: URL.createObjectURL(file),
  url: null,
  slug: null,
});

export const FileUploadProvider = ({
  conversationSlug,
  children,
}: {
  // `conversationSlug` is required for file uploads, but it's marked as optional
  // so that other usages of the editor can be wrapped in this component,
  // which allows FileUploadContext be non-nullable.
  conversationSlug?: string | null;
  children: React.ReactNode;
}) => {
  const [unsavedFiles, setUnsavedFiles] = useState<UnsavedFileInfo[]>([]);
  const resetFiles = (files: UnsavedFileInfo[]) => {
    for (const file of unsavedFiles) URL.revokeObjectURL(file.blobUrl);
    setUnsavedFiles(files.map((f) => ({ ...f, blobUrl: URL.createObjectURL(f.file) })));
  };
  const utils = api.useUtils();

  const onRetry = (file: File): OnUpload => {
    const updatedFileInfo: UnsavedFileInfo = {
      ...assertDefined(unsavedFiles.find((f) => f.file === file)),
      status: UploadStatus.UPLOADING,
    };
    setUnsavedFiles((prevFiles) => prevFiles.map((f) => (f.file === updatedFileInfo.file ? updatedFileInfo : f)));
    return performUpload(updatedFileInfo);
  };
  const onDelete = (file: File): void => {
    setUnsavedFiles((prevFiles) =>
      prevFiles.flatMap((f) => {
        if (f.file === file) {
          URL.revokeObjectURL(f.blobUrl);
          return [];
        }
        return [f];
      }),
    );
  };
  const onUpload = (file: File, { inline }: { inline: boolean }): OnUpload => {
    const unsavedFileInfo = generateUnsavedFileInfo(file, inline);
    setUnsavedFiles((prevFiles) => [...prevFiles, unsavedFileInfo]);
    return performUpload(unsavedFileInfo);
  };
  const performUpload = (unsavedFileInfo: UnsavedFileInfo): OnUpload => {
    const totalFileSize = unsavedFiles
      .filter(
        (f) =>
          (f.status === UploadStatus.UPLOADING || f.status === UploadStatus.UPLOADED) &&
          !f.inline &&
          f.file !== unsavedFileInfo.file,
      )
      .reduce((acc, f) => acc + f.file.size, 0);
    const upload = new Promise<UnsavedFileInfo>(async (resolve, reject) => {
      try {
        if (totalFileSize + unsavedFileInfo.file.size > TOTAL_FILE_SIZE_LIMIT)
          throw new Error("Attachments cannot exceed 25MB in total");
        // Spread out uploads to avoid initiating many uploads all at once
        await new Promise((resolve) =>
          setTimeout(resolve, (unsavedFiles.filter((f) => f.status === UploadStatus.UPLOADING).length + 1) * 200),
        );
        const { file, bucket, signedUpload, isPublic } =
          await utils.client.mailbox.conversations.files.initiateUpload.mutate({
            conversationSlug: assertDefined(conversationSlug, "Conversation ID must be provided"),
            file: {
              fileName: unsavedFileInfo.file.name,
              fileSize: unsavedFileInfo.file.size,
              isInline: unsavedFileInfo.inline,
            },
          });
        const supabase = createClient();
        const { data, error } = await supabase.storage
          .from(bucket)
          .uploadToSignedUrl(signedUpload.path, signedUpload.token, unsavedFileInfo.file);
        if (error) throw error;
        if (!data) throw new Error("No data returned from Supabase");

        let url;
        if (isPublic) {
          url = supabase.storage.from(bucket).getPublicUrl(data.path).data.publicUrl;
        } else {
          url = await utils.client.mailbox.conversations.files.getFileUrl.query({ slug: file.slug });
        }

        const updatedFile: UnsavedFileInfo = {
          slug: file.slug,
          url,
          status: UploadStatus.UPLOADED,
          file: unsavedFileInfo.file,
          blobUrl: unsavedFileInfo.blobUrl,
          inline: unsavedFileInfo.inline,
        };
        setUnsavedFiles((prevFiles) => prevFiles.map((f) => (f.file === unsavedFileInfo.file ? updatedFile : f)));
        resolve(updatedFile);
      } catch (e) {
        setUnsavedFiles((prevFiles) =>
          prevFiles.map((f) => (f.file === unsavedFileInfo.file ? { ...f, status: UploadStatus.FAILED } : f)),
        );
        if (e instanceof Error && e.message) {
          captureExceptionAndLog(e);
          reject(e.message);
        } else reject(null);
      }
    });

    return { upload, blobUrl: unsavedFileInfo.blobUrl };
  };

  const uploading = unsavedFiles.filter((f) => f.status === UploadStatus.UPLOADING).length > 0;
  const failedAttachmentsExist = unsavedFiles.filter((f) => !f.inline && f.status === UploadStatus.FAILED).length > 0;
  const readyFiles = unsavedFiles.flatMap((f) => (f.status === UploadStatus.UPLOADED ? [f] : []));
  const hasReadyFileAttachments =
    unsavedFiles.filter((f) => !f.inline && f.status === UploadStatus.UPLOADED).length > 0;

  return (
    <FileUploadContext.Provider
      value={{
        unsavedFiles,
        readyFiles,
        failedAttachmentsExist,
        uploading,
        hasReadyFileAttachments,
        onUpload,
        resetFiles,
        onDelete,
        onRetry,
      }}
    >
      {children}
    </FileUploadContext.Provider>
  );
};

export const useFileUpload = () =>
  assertDefined(useContext(FileUploadContext), "Make sure FileUploadProvider is used.");
