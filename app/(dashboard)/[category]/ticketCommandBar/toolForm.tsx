import { useToolExecution } from "components/useToolExecution";
import { useState } from "react";
import { useConversationContext } from "@/app/(dashboard)/[category]/conversation/conversationContext";
import { formatParameter } from "@/app/(dashboard)/[category]/conversation/toolItem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RouterOutputs } from "@/trpc";

export type Tool = RouterOutputs["mailbox"]["conversations"]["tools"]["list"]["all"][number];

type ToolFormProps = {
  tool: Tool;
  onOpenChange: (open: boolean) => void;
};

export const ToolForm = ({ tool, onOpenChange }: ToolFormProps) => {
  const { data: conversationInfo } = useConversationContext();
  const [parameters, setParameters] = useState<Record<string, string | number>>(() => {
    const initialParams: Record<string, string | number> = {};
    const emailFrom = conversationInfo?.emailFrom;
    if (typeof emailFrom === "string") {
      tool.parameterTypes.forEach((param) => {
        if (param.name === tool.customerEmailParameter || (!tool.customerEmailParameter && param.name === "email")) {
          initialParams[param.name] = emailFrom;
        }
      });
    }
    return initialParams;
  });
  const [invalidFields, setInvalidFields] = useState<string[]>([]);

  const { isExecuting, handleToolExecution } = useToolExecution();

  const updateParameters = (name: string, value: string | undefined) => {
    if (value === undefined) {
      setParameters((prev) => {
        const { [name]: _, ...rest } = prev;
        return rest;
      });
      return;
    }
    setParameters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleExecute = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const invalidFields = tool.parameterTypes
      .filter(
        (param) =>
          (param.required && parameters[param.name] === undefined) ||
          (parameters[param.name] && param.type === "number" && isNaN(Number(parameters[param.name]))),
      )
      .map((param) => param.name);
    if (invalidFields.length > 0) {
      setInvalidFields(invalidFields);
      return;
    }

    const parameterValues = tool.parameterTypes.reduce<Record<string, string | number>>((acc, param) => {
      if (!parameters[param.name]) return acc;
      if (param.type === "number") {
        acc[param.name] = Number(parameters[param.name]);
      } else {
        acc[param.name] = parameters[param.name] ?? "";
      }
      return acc;
    }, {});

    const success = await handleToolExecution(tool.slug, tool.name, parameterValues);
    if (success) {
      onOpenChange(false);
    }
  };

  return (
    <form className="space-y-4 p-4 overflow-y-auto" onSubmit={handleExecute}>
      <div>
        <h3 className="font-medium">{tool.name}</h3>
        {tool.description && <p className="text-xs text-muted-foreground">{tool.description}</p>}
      </div>
      {tool.parameterTypes.map(({ name, description, required }) => (
        <div key={name} className="grid gap-1">
          <Label htmlFor={name} className="text-sm">
            {formatParameter(name)}
            {required ? "" : " (optional)"}
          </Label>
          <Input
            id={name}
            value={parameters[name] ?? ""}
            onChange={(e) => {
              updateParameters(name, e.target.value || undefined);
              setInvalidFields(invalidFields.filter((field) => field !== name));
            }}
            className={invalidFields.includes(name) ? "border-destructive" : ""}
            hint={description ? <span className="text-xs">{description}</span> : null}
          />
        </div>
      ))}
      <Button variant="default" type="submit" disabled={isExecuting}>
        {isExecuting ? "Running..." : "Run Tool"}
      </Button>
    </form>
  );
};
