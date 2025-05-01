import ReactMarkdown from "react-markdown";
import "@/components/linkCta.css";
import DOMPurify from "isomorphic-dompurify";
import { extractEmailPartsFromDocument } from "@/lib/shared/html";
import { cn } from "@/lib/utils";

const extractEmailParts = (htmlString: string) =>
  extractEmailPartsFromDocument(
    new DOMParser().parseFromString(DOMPurify.sanitize(htmlString, { FORBID_TAGS: ["script", "style"] }), "text/html"),
  );

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

export const PlaintextContent = ({ text }: { text: string }) =>
  text.split("\n").map((line, i) => <p key={i}>{line}</p>);

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
      mainContent: (
        <ReactMarkdown
          className={cn(className, "prose")}
          components={{
            a: ({ children, ...props }: any) => (
              <a target="_blank" rel="noopener noreferrer" {...props}>
                {children}
              </a>
            ),
          }}
        >
          {body}
        </ReactMarkdown>
      ),
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
