export type HelperWidgetConfig = {
  title?: string;
  email?: string;
  email_hash?: string;
  mailbox_slug: string;
  timestamp?: number;
  customer_metadata?: {
    name?: string | null;
    value?: number | null;
    links?: Record<string, string> | null;
  } | null;
  icon_color?: string | null;
  experimental_read_page?: boolean;
  show_toggle_button?: boolean;
  guide_enabled?: boolean;
};

export type ReadPageToolConfig = {
  toolName: string;
  toolDescription: string;
  pageHTML: string;
  pageContent: string;
};
