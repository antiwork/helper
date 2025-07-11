import { useEffect, useState } from "react";
import { HelperWidgetConfig, ReadPageToolConfig } from "@helperai/sdk";

export function useReadPageTool(
  token: string | null,
  config: HelperWidgetConfig | null,
  pageHTML: string | null,
  currentURL: string | null,
) {
  const [readPageToolCall, setReadPageToolCall] = useState<ReadPageToolConfig | null>(null);

  useEffect(() => {
    const fetchReadPageTool = async () => {
      if (!token || !config?.experimentalReadPage || !pageHTML) return;

      try {
        const response = await fetch(`${window.location.origin}/api/widget/read-page-tool`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            pageHTML,
            currentURL,
          }),
        });

        if (!response.ok) {
          // eslint-disable-next-line no-console
          console.error("Failed to fetch read page tool");
          return;
        }

        const data = await response.json();
        if (data.readPageTool) {
          setReadPageToolCall(data.readPageTool);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Failed to fetch read page tool:", error);
      }
    };

    void fetchReadPageTool();
  }, [token, config?.experimentalReadPage, pageHTML, currentURL]);

  return { readPageToolCall };
}
