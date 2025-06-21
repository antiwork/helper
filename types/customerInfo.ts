export type CustomerInfo = {
  prompt: string;
  metadata: CustomerMetadata;
};

type CustomerMetadata = {
  name?: string | null;
  value?: number | null;
  links?: Record<string, string> | null;
  isVip?: boolean;
};
