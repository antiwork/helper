import { type Mailbox } from "@/lib/data/mailbox";

export type MailboxTheme = NonNullable<Mailbox["preferences"]>["theme"];

export const buildThemeCss = (theme: MailboxTheme) => {
  if (!theme) return "";

  const { background, foreground, primary, accent } = theme;

  const normalizeHex = (color: string) => {
    if (color.startsWith("#")) color = color.slice(1);
    if (color.length === 3)
      color = color
        .split("")
        .map((c) => c + c)
        .join("");
    return color;
  };

  const getLuminance = (hexColor: string) => {
    const normalizedHex = normalizeHex(hexColor);
    const r = parseInt(normalizedHex.slice(0, 2), 16);
    const g = parseInt(normalizedHex.slice(2, 4), 16);
    const b = parseInt(normalizedHex.slice(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance;
  };

  const getContrastColor = (hexColor: string, candidate: string) => {
    const luminance = getLuminance(hexColor);
    const candidateLuminance = getLuminance(candidate);
    if ((luminance > 0.5 && candidateLuminance < 0.2) || (luminance < 0.5 && candidateLuminance > 0.8)) {
      return candidate;
    }
    return luminance > 0.5 ? "#000000" : "#ffffff";
  };

  const sidebarForeground = getContrastColor(primary, foreground);

  return `
    :root,
    .light,
    .dark {
      --sidebar-width: 280px;
      --sidebar-width-mobile: 100%;
      --sidebar-background: ${primary};
      --sidebar-foreground: ${sidebarForeground};
      --sidebar-primary: ${primary};
      --sidebar-primary-foreground: ${sidebarForeground};
      --sidebar-accent: color-mix(in srgb, ${sidebarForeground} 20%, transparent);
      --sidebar-accent-foreground: ${sidebarForeground};
      --sidebar-border: color-mix(in srgb, ${sidebarForeground} 50%, ${primary});
      --sidebar-ring: color-mix(in srgb, ${sidebarForeground} 50%, ${primary});
      --background: ${background};
      --foreground: ${foreground};
      --card: ${background};
      --card-foreground: ${foreground};
      --popover: ${background};
      --popover-foreground: ${foreground};
      --primary: ${primary};
      --primary-foreground: ${getContrastColor(primary, foreground)};
      --secondary: color-mix(in srgb, ${accent} 20%, ${background});
      --secondary-foreground: ${foreground};
      --muted: color-mix(in srgb, ${foreground} 50%, ${background});
      --muted-foreground: ${foreground};
      --accent: ${primary};
      --accent-foreground: ${getContrastColor(primary, foreground)};
      --border: color-mix(in srgb, ${foreground} 50%, ${background});
      --input: color-mix(in srgb, ${foreground} 50%, ${background});
      --ring: color-mix(in srgb, ${primary} 50%, ${background});
      --bright: ${accent};
      --bright-foreground: ${getContrastColor(accent, foreground)};
    }
  `;
};
