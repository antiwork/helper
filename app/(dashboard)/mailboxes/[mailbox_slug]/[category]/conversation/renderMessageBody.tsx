import "@/components/linkCta.css";
import DOMPurify from "isomorphic-dompurify";
import MessageMarkdown from "@/components/messageMarkdown";
import { extractEmailPartsFromDocument } from "@/lib/shared/html";
import { cn } from "@/lib/utils";

const decodeHtmlEntities = (str: string): string => {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = str;
  return textarea.value;
};

const extractEmailParts = (htmlString: string) => {
  // Decode HTML entities first in case the content is double-encoded
  const decodedHtml = decodeHtmlEntities(htmlString);
  return extractEmailPartsFromDocument(
    new DOMParser().parseFromString(DOMPurify.sanitize(decodedHtml, { FORBID_TAGS: ["script", "style"] }), "text/html"),
  );
};

const adjustAttributes = (html: string) => {
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");

    for (const tag of Array.from(doc.querySelectorAll("a"))) {
      tag.setAttribute("target", "_blank");
    }

    for (const img of Array.from(doc.querySelectorAll("img"))) {
      img.setAttribute("onerror", "this.style.display='none'");
    }

    return doc.body.innerHTML;
  } catch (e) {
    return html;
  }
};

const PlaintextContent = ({ text }: { text: string }) => text.split("\n").map((line, i) => <p key={i}>{line}</p>);

export const renderMessageBody = ({
  body,
  isMarkdown,
  className,
}: {
  body: string | null;
  isMarkdown: boolean;
  className?: string;
}) => {
  if (isMarkdown) {
    return {
      mainContent: <MessageMarkdown className={cn(className, "prose")}>{body}</MessageMarkdown>,
      quotedContext: null,
    };
  }

  if (body?.includes("<") && body.includes(">")) {
    const { mainContent: parsedMain, quotedContext: parsedQuoted } = extractEmailParts(body || "");
    const adjustedMain = adjustAttributes(parsedMain);
    const adjustedQuoted = parsedQuoted ? adjustAttributes(parsedQuoted) : "";

    return {
      mainContent: <div className={cn(className, "prose")} dangerouslySetInnerHTML={{ __html: adjustedMain }} />,
      quotedContext: adjustedQuoted ? (
        <div className={className} dangerouslySetInnerHTML={{ __html: adjustedQuoted }} />
      ) : null,
    };
  }

  return {
    mainContent: (
      <div className={cn(className, "prose")}>
        {!body ? <span className="text-muted-foreground">(no content)</span> : <PlaintextContent text={body} />}
      </div>
    ),
    quotedContext: null,
  };
};
