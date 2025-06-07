import React from "react";

function ConversationsLayout({
  params,
  children,
}: {
  params: Promise<{ mailbox_slug: string }>;
  children: React.ReactNode;
}) {
  return children;
}

export default ConversationsLayout;
