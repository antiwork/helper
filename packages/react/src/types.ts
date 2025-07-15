// TODO: Import from sdk once it's published
export type HelperWidgetConfig = {
  title?: string;
  email?: string;
  emailHash?: string;
  timestamp?: number;
  customerMetadata?: {
    name?: string | null;
    value?: number | null;
    links?: Record<string, string> | null;
  } | null;
  iconColor?: string | null;
  experimentalReadPage?: boolean;
  showToggleButton?: boolean;
  enableGuide?: boolean;
  theme?: {
    background: string;
    foreground: string;
    primary: string;
    accent: string;
  };
  viewportWidth?: number;
};
