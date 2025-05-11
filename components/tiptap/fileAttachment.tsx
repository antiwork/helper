import cx from "classnames";
import { AlertTriangle, Paperclip, RefreshCw, X } from "lucide-react";
import { forwardRef } from "react";
import { UploadStatus, useFileUpload, type UnsavedFileInfo } from "@/components/fileUploadContext";
import LoadingSpinner from "@/components/loadingSpinner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatSizeHuman } from "@/components/utils/files";

type ActionIconProps = React.HTMLAttributes<HTMLButtonElement> & {
  label?: string;
};
const ActionIcon = forwardRef<HTMLButtonElement, ActionIconProps>(({ children, label, ...props }, ref) => (
  <button
    {...props}
    ref={ref}
    className={cx("flex h-6 w-6 cursor-pointer items-center justify-center hover:bg-muted", props.className)}
  >
    {children}
    {label && <span className="sr-only">{label}</span>}
  </button>
));
ActionIcon.displayName = "ActionIcon";

const FileAttachment = ({ fileInfo, onRetry }: { fileInfo: UnsavedFileInfo; onRetry: (file: File) => void }) => {
  const { onDelete } = useFileUpload();

  const baseIconStyles = "shrink-0 w-4 h-4";
  const deleteIcon = (
    <ActionIcon label="Delete" onClick={() => onDelete(fileInfo.file)}>
      <X className={baseIconStyles} />
    </ActionIcon>
  );
  let leftIcon = <Paperclip className={`${baseIconStyles} text-foreground`} />;
  let icon = null;
  switch (fileInfo.status) {
    case UploadStatus.UPLOADING:
      icon = <LoadingSpinner className={baseIconStyles} />;
      break;
    case UploadStatus.FAILED:
      leftIcon = (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertTriangle className={`${baseIconStyles} text-destructive-500`} />
            </TooltipTrigger>
            <TooltipContent>Upload failed</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
      icon = (
        <div className="flex">
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <ActionIcon label="Retry" onClick={() => onRetry(fileInfo.file)}>
                  <RefreshCw className={baseIconStyles} />
                </ActionIcon>
              </TooltipTrigger>
              <TooltipContent>Retry</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {deleteIcon}
        </div>
      );
      break;
    case UploadStatus.UPLOADED:
      icon = deleteIcon;
      break;
  }

  return (
    <div
      aria-label="File attachment"
      className="inline-flex h-8 max-w-[14rem] shrink-0 cursor-pointer items-center gap-2 overflow-hidden rounded-lg border border-border px-2 text-sm text-muted-foreground hover:border-border"
    >
      {leftIcon}
      <a
        href={fileInfo.blobUrl}
        download={fileInfo.file.name}
        title={fileInfo.file.name}
        className="flex min-w-0 flex-1 items-center gap-2"
      >
        <span className="truncate">{fileInfo.file.name}</span>
        <span className="shrink-0">({formatSizeHuman(fileInfo.file.size)})</span>
      </a>
      {icon}
    </div>
  );
};

export default FileAttachment;
