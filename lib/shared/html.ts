import { captureExceptionAndThrowIfDevelopment } from "@/lib/shared/sentry";

export const extractEmailPartsFromDocument = (doc: Document) => {
  const fallbackEmailParts = { mainContent: doc.body.innerHTML, quotedContext: "" };
  const quotedContextSelector = 'blockquote[type="cite"], .gmail_quote';
  try {
    const allQuotedContextElements = doc.querySelectorAll(quotedContextSelector);
    const topLevelQuotedContextElements = Array.from(allQuotedContextElements).filter(
      (element) => !element.parentElement?.closest(quotedContextSelector),
    );
    if (topLevelQuotedContextElements.length === 0) {
      return fallbackEmailParts;
    }
    topLevelQuotedContextElements.forEach((element) => {
      if (element.parentElement) element.remove();
    });

    return {
      mainContent: doc.body.innerHTML,
      quotedContext: topLevelQuotedContextElements.map((element) => element.outerHTML).join("\n"),
    };
  } catch (e) {
    captureExceptionAndThrowIfDevelopment(e);
    return fallbackEmailParts;
  }
};
