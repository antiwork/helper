export type CustomerInfo = {
  prompt: string;
  metadata: CustomerMetadata;
};

export type CustomerMetadata = {
  name?: string | null;
  value?: number | null;
  links?: Record<string, string> | null;
  isVip?: boolean;
};
