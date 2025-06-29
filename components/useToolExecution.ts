import { useState } from "react";
import { useConversationContext } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/conversation/conversationContext";
import { toast } from "@/components/hooks/useToast";
import { api } from "@/trpc/react";

export const useToolExecution = () => {
  const { mailboxSlug, conversationSlug, refetch } = useConversationContext();
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const runTool = api.mailbox.conversations.tools.run.useMutation();

  const handleToolExecution = async (slug: string, name: string, params: Record<string, string | number> = {}) => {
    setIsExecuting(true);
    setIsSuccess(false);
    try {
      const result = await runTool.mutateAsync({
        mailboxSlug,
        conversationSlug,
        tool: slug,
        params,
      });

      if (!result) {
        throw new Error("No result returned from tool execution");
      }

      if (result.success) {
        setIsSuccess(true);
        toast({
          title: `Tool "${name}" executed successfully`,
          description: result.message,
          variant: "success",
        });
        refetch();
        return true;
      }
      throw new Error(result.message);
    } catch (error) {
      toast({
        title: `Failed to execute tool "${name}"`,
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
      refetch();
      return false;
    } finally {
      setIsExecuting(false);
    }
  };

  return {
    isExecuting,
    isSuccess,
    handleToolExecution,
  };
};
