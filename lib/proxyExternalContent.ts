import { env } from "@/lib/env";

export const proxyExternalContent = async (html: string | null) => {
  if (!html) return html;

  html = await replaceAsync(
    html,
    /<(?<tag>[a-z][a-z0-9]*)\s+(?<attributes>[^>]*?http[^>]*?)(?<endTag>\s*\/?>)/gi,
    async ({ groups: { tag = "", attributes = "", endTag = "" } = {} }) => {
      const processedAttributes = await replaceAsync(
        attributes,
        /(?<name>[a-z][-a-z0-9]*)=(?<value>(?<quote>['"])((?:(?!\k<quote>).)*?)\k<quote>|[^'"\s]+)/gis,
        async (match) => {
          const { name = "", value = "", quote = "" } = match.groups ?? {};
          const content = quote ? value.slice(1, -1) : value;

          if ((tag.toLowerCase() === "a" && name.toLowerCase() === "href") || name.toLowerCase() === "title")
            return match[0];

          if (/^https?:\/\/[^\s]+$/.test(content))
            return shouldProxyUrl(content) ? `${name}="${await proxyUrl(content)}"` : match[0];

          let processedValue = value;
          if (name === "style") {
            // Special case for url() in style attribute
            processedValue = await replaceAsync(
              processedValue,
              /\burl\((?:['"])?(https?:\/\/[^)]+?)(?:['"])?\)/g,
              async (match) => (match[1] && shouldProxyUrl(match[1]) ? `url(${await proxyUrl(match[1])})` : match[0]),
            );
          } else {
            // Replace all urls since attributes like srcset can contain multiple
            processedValue = await replaceAsync(processedValue, /\b(https?:\/\/[^\s]+)/g, async (match) =>
              match[1] && shouldProxyUrl(match[1]) ? await proxyUrl(match[1]) : match[0],
            );
          }

          return `${name}=${processedValue}`;
        },
      );

      return `<${tag} ${processedAttributes}${endTag}`;
    },
  );

  return html;
};

const replaceAsync = async (
  string: string,
  regexp: RegExp,
  replacerFunction: (match: RegExpMatchArray) => Promise<string>,
) => {
  const replacements = await Promise.all(Array.from(string.matchAll(regexp), (match) => replacerFunction(match)));
  let i = 0;
  return string.replace(regexp, () => replacements[i++] ?? "");
};

const shouldProxyUrl = (url: string) =>
  url.startsWith("http") &&
  !url.startsWith(`${env.PROXY_URL}/`) &&
  !url.startsWith(`${env.AUTH_URL}/`) &&
  !url.startsWith(`${env.NEXT_PUBLIC_SUPABASE_URL}/`);

const proxyUrl = async (url: string) => {
  if (!env.PROXY_SECRET_KEY || !env.PROXY_URL) return url;
  const { signature, expires } = await generateSignature(url, env.PROXY_SECRET_KEY);
  return `${env.PROXY_URL}?url=${encodeURIComponent(url)}&verify=${signature}&expires=${expires}`;
};

const generateSignature = async (url: string, secretKey: string, expiryTime = 300) => {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secretKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const expires = Math.floor(Date.now() / 1000) + expiryTime;
  const dataToSign = `${url}:${expires}`;
  const signatureData = encoder.encode(dataToSign);
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, signatureData);
  const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, ""); // URL-safe Base64 encoding

  return { signature, expires };
};
