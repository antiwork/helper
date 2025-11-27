const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_FILE_COUNT = 5;
const SUPPORTED_MIME_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp", "application/pdf"];

export interface AttachmentValidationResult {
  isValid: boolean;
  errors: string[];
  fileSize?: number;
  totalSize?: number;
}

export interface AttachmentData {
  name: string;
  size?: number;
  type?: string;
  url: string; // Required for server-side validation
}

export interface ClientAttachmentData {
  name: string;
  size?: number;
  type?: string;
  url?: string; // Optional for client-side file validation
}

export function validateAttachment(attachment: AttachmentData): AttachmentValidationResult {
  const errors: string[] = [];

  // Validate URL is present
  if (!attachment.url) {
    errors.push(`${attachment.name}: Missing URL`);
    return { isValid: false, errors };
  }

  // Validate file type
  if (attachment.type && !SUPPORTED_MIME_TYPES.includes(attachment.type)) {
    errors.push(`${attachment.name}: Only image and PDF files are supported`);
    return { isValid: false, errors };
  }

  // Validate data URL format
  if (!/^data:(image\/(png|jpeg|gif|webp)|application\/pdf);base64,.+/.test(attachment.url)) {
    errors.push(`${attachment.name}: Invalid data URL format`);
  }

  // Calculate file size
  let fileSize = attachment.size || 0;
  if (attachment.url.startsWith("data:")) {
    const [, base64Data] = attachment.url.split(",");
    if (base64Data) {
      fileSize = Math.ceil((base64Data.length * 3) / 4);
    }
  }

  // Validate file size
  if (fileSize > MAX_FILE_SIZE) {
    errors.push(`${attachment.name}: File size (${Math.round(fileSize / 1024 / 1024)}MB) exceeds limit (25MB)`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    fileSize,
  };
}

export function validateClientAttachments(
  attachments: ClientAttachmentData[],
  currentFiles: ClientAttachmentData[] = [],
): AttachmentValidationResult {
  const errors: string[] = [];
  let totalSize = 0;

  // Check file count limit
  if (currentFiles.length + attachments.length > MAX_FILE_COUNT) {
    errors.push(`Cannot upload more than ${MAX_FILE_COUNT} files total`);
  }

  // Calculate current total size
  for (const file of currentFiles) {
    totalSize += file.size || 0;
  }

  // Validate each attachment (skip URL validation for client files)
  for (const attachment of attachments) {
    if (attachment.type && !SUPPORTED_MIME_TYPES.includes(attachment.type)) {
      errors.push(`${attachment.name}: Only image and PDF files are supported`);
    }

    const fileSize = attachment.size || 0;
    if (fileSize > MAX_FILE_SIZE) {
      errors.push(`${attachment.name}: File size (${Math.round(fileSize / 1024 / 1024)}MB) exceeds limit (25MB)`);
    }

    totalSize += fileSize;
  }

  // Check total size limit
  if (totalSize > MAX_TOTAL_SIZE) {
    errors.push(`Total file size (${Math.round(totalSize / 1024 / 1024)}MB) exceeds limit (50MB)`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    totalSize,
  };
}

export function validateAttachments(
  attachments: AttachmentData[],
  currentFiles: AttachmentData[] = [],
): AttachmentValidationResult {
  const errors: string[] = [];
  let totalSize = 0;

  // Check file count limit
  if (currentFiles.length + attachments.length > MAX_FILE_COUNT) {
    errors.push(`Cannot upload more than ${MAX_FILE_COUNT} files total`);
  }

  // Calculate current total size
  for (const file of currentFiles) {
    totalSize += file.size || 0;
  }

  // Validate each attachment
  for (const attachment of attachments) {
    const result = validateAttachment(attachment);
    errors.push(...result.errors);

    if (result.fileSize) {
      totalSize += result.fileSize;
    }
  }

  // Check total size limit
  if (totalSize > MAX_TOTAL_SIZE) {
    errors.push(`Total file size (${Math.round(totalSize / 1024 / 1024)}MB) exceeds limit (50MB)`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    totalSize,
  };
}
