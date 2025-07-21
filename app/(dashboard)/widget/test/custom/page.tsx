import { CustomWidgetTest } from "@/app/(dashboard)/widget/test/custom/customWidgetTest";
import { generateSession } from "@/app/(dashboard)/widget/test/custom/generateSession";
import { HelperClientProvider } from "@/app/(dashboard)/widget/test/custom/helperClientProvider";
import { getBaseUrl } from "@/components/constants";

export const dynamic = "force-dynamic";

export default async function WidgetTest({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; isVip?: string; anonymous?: string }>;
}) {
  if (getBaseUrl() !== "https://helperai.dev") {
    return <div>Only available in development</div>;
  }

  return (
    <HelperClientProvider host="https://helperai.dev" session={generateSession(await searchParams)}>
      <CustomWidgetTest />
    </HelperClientProvider>
  );
}
