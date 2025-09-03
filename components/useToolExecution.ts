import { useState } from "react";
import { toast } from "sonner";
import { useConversationContext } from "@/app/(dashboard)/[category]/conversation/conversationContext";
import { api } from "@/trpc/react";

export const useToolExecution = () => {
  const { conversationSlug, refetch } = useConversationContext();
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const runTool = api.mailbox.conversations.tools.run.useMutation();

  const handleToolExecution = async (slug: string, name: string, params: Record<string, string | number> = {}) => {
    setIsExecuting(true);
    setIsSuccess(false);
    try {
      const result = await runTool.mutateAsync({
        conversationSlug,
        tool: slug,
        params,
      });

      if (!result) {
        throw new Error("No result returned from tool execution");
      }

      if (result.success) {
        setIsSuccess(true);
        toast.success(`Tool "${name}" executed successfully`, {
          description: "message" in result ? result.message : undefined,
        });
        refetch();
        return true;
      }
      throw new Error("error" in result ? result.error : undefined);
    } catch (error) {
      toast.error(`Failed to execute tool "${name}"`, {
        description: error instanceof Error ? error.message : "Unknown error",
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
