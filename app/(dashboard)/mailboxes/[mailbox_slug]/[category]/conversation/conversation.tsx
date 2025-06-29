import {
  ConversationContextProvider,
} from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/conversation/conversationContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import ConversationContent from "./conversationContent";

const Conversation = () => (
  <SidebarProvider>
    <ConversationContextProvider>
      <ConversationContent />
    </ConversationContextProvider>
  </SidebarProvider>
);

export default Conversation;
