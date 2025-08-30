import { HomepageContent } from "./homepageContent";

export default function HomePage() {
  return (
    <TRPCReactProvider>
      <HelperClientProvider host={env.NEXT_PUBLIC_DEV_HOST} session={{}}>
        <HomepageContent mailboxName={(await getMailbox()).name} />
      </HelperClientProvider>
    </TRPCReactProvider>
  );
}
