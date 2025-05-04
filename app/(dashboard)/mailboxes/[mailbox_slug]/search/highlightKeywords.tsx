"use client";

const isTextNode = (node: Node): node is Text => node.nodeType === Node.TEXT_NODE;
export const highlightKeywords = (htmlString: string, keywords: string[]) => {
  if (!keywords.length) return htmlString;

  const doc = new DOMParser().parseFromString(htmlString, "text/html");

  keywords.forEach((keyword) => {
    const walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null);

    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (isTextNode(node) && node.nodeValue) {
        const keywordIndex = node.nodeValue.toLowerCase().indexOf(keyword.toLowerCase());

        if (keywordIndex !== -1) {
          const span = document.createElement("mark");
          span.className = "bg-secondary-200";
          span.textContent = node.nodeValue.substring(keywordIndex, keywordIndex + keyword.length);

          const after = node.splitText(keywordIndex);
          if (after.nodeValue && node.parentNode) {
            after.nodeValue = after.nodeValue.substring(keyword.length);
            node.parentNode.insertBefore(span, after);
          }
          walker.nextNode();
        }
      }
    }
  });

  return doc.body.innerHTML;
};
