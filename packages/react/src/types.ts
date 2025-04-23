/**
 * Configuration options for the Helper widget
 * @typedef {Object} HelperConfig
 * @property {string} [title] - Optional title for the Helper widget
 * @property {string} [email] - User's email address (optional for anonymous sessions)
 * @property {string} [email_hash] - Hashed version of the user's email (required if email is provided)
 * @property {string} mailbox_slug - Unique identifier for the user's mailbox
 * @property {number} [timestamp] - Current timestamp (required if email is provided)
 * @property {Object} [customer_metadata] - Optional metadata about the customer
 * @property {string | null} [customer_metadata.name] - Customer's name
 * @property {number | null} [customer_metadata.value] - Numerical value associated with the customer
 * @property {Record<string, string> | null} [customer_metadata.links] - Key-value pairs of related links
 * @property {string | null} [icon_color] - Custom color for the Helper icon
 * @property {boolean} [experimental_read_page] - Feature flag for experimental read page
 * @property {boolean} [enable_guide] - Feature flag for guide feature / helping hand
 */
export type HelperConfig = {
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
  enable_guide?: boolean;
  theme?: {
    background: string;
    foreground: string;
    primary: string;
    accent: string;
  };
};
