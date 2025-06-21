import { kebabCase, upperFirst } from "lodash-es";
import { AlertTriangle, ChevronDown, ChevronRight, Zap } from "lucide-react";
import { useState } from "react";
import type { Message } from "@/app/types/global";
import HumanizedTime from "@/components/humanizedTime";
import { JsonView } from "@/components/jsonView";
import { ToolMetadata } from "@/db/schema/conversationMessages";

export const formatParameter = (name: string) => upperFirst(kebabCase(name).replaceAll("-", " "));

export const ToolItem = ({
  message,
  initialExpanded,
}: {
  message: Message & { metadata: ToolMetadata };
  initialExpanded: boolean;
}) => {
  const [detailsExpanded, setDetailsExpanded] = useState(initialExpanded);
  const tool = message.metadata.tool;
  const parameters = message.metadata.parameters;
  const isSuccess = message.metadata.success;
  const apiResult = message.metadata.result;
  const Icon = isSuccess ? Zap : AlertTriangle;

  return (
    <div className="flex flex-col mx-auto max-w-full">
      <button
        className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        onClick={() => setDetailsExpanded(!detailsExpanded)}
      >
        {detailsExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <Icon className="h-4 w-4" />
        <span className="flex items-center gap-1">
          {tool.name}
          {isSuccess ? "" : " failed"}
        </span>
        <span>·</span>
        <span>
          <HumanizedTime time={message.createdAt} />
        </span>
      </button>

      {detailsExpanded && (
        <div className="mt-2 text-sm text-muted-foreground border rounded p-4 overflow-x-auto">
          <div className="flex flex-col gap-2">
            {!isSuccess && (
              <>
                <div>
                  <div>
                    <strong>Request</strong>
                  </div>
                  <div className="font-mono">
                    {tool.requestMethod} {tool.url}
                  </div>
                </div>
              </>
            )}
            <div>
              <div>
                <strong>Parameters</strong>
              </div>
              <div className="font-mono">
                <JsonView data={parameters} />
              </div>
            </div>
            <div>
              <div>
                <strong>Result</strong>
              </div>
              <div className="font-mono">
                <JsonView data={apiResult} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
