import { CheckIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { truncate } from "lodash";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { FAQ } from "@/app/types/global";
import { toast } from "@/components/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import type { NewRow as NewRowType } from "./useSettings";

type KnowledgeEditFormProps = {
  content: string;
  originalContent?: string;
  onSubmit: () => void;
  onCancel?: () => void;
  onChange?: (content: string) => void;
  isLoading: boolean;
};

export const KnowledgeEditForm = ({
  content,
  originalContent,
  isLoading,
  onSubmit,
  onCancel,
  onChange,
}: KnowledgeEditFormProps) => {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="border rounded-lg p-4 space-y-4"
    >
      {originalContent && (
        <div>
          <Label>Original Content</Label>
          <div className="mt-2 p-3 bg-muted rounded-md">
            <ReactMarkdown className="prose prose-sm">{originalContent}</ReactMarkdown>
          </div>
        </div>
      )}
      <div>
        <Label>{originalContent ? "Suggested Change" : "Content"}</Label>
        <Textarea
          value={content}
          onChange={(e) => onChange?.(e.target.value)}
          className={cn("min-h-[10rem]", originalContent && "border-bright")}
          onModEnter={onSubmit}
        />
      </div>
      <div className={originalContent ? "grid grid-cols-2 gap-2" : "flex justify-end gap-2"}>
        {onCancel && (
          <Button type="button" variant="subtle" onClick={onCancel}>
            {originalContent ? (
              <>
                <XMarkIcon className="h-4 w-4 mr-2" />
                Reject
              </>
            ) : (
              "Cancel"
            )}
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            "Saving..."
          ) : originalContent ? (
            <>
              <CheckIcon className="h-4 w-4 mr-2" />
              Accept
            </>
          ) : (
            "Save"
          )}
        </Button>
      </div>
    </form>
  );
};

type KnowledgeBankItemProps = {
  mailboxSlug: string;
  onDelete: () => void;
  faq: FAQ & Partial<NewRowType>;
  suggestedReplacement?: FAQ | null;
};

const KnowledgeBankItem = ({ mailboxSlug, faq, suggestedReplacement, onDelete }: KnowledgeBankItemProps) => {
  const [editingContent, setEditingContent] = useState<string | null>(null);

  const utils = api.useUtils();
  const updateMutation = api.mailbox.faqs.update.useMutation({
    onSuccess: (_, { mailboxSlug, id, ...input }) => {
      utils.mailbox.faqs.list.setData({ mailboxSlug }, (data) =>
        data?.map((faq) => (faq.id === id ? { ...faq, ...input } : faq)),
      );
      setEditingContent(null);
    },
    onError: () => {
      toast({ title: "Error updating knowledge", variant: "destructive" });
    },
  });

  const deleteMutation = api.mailbox.faqs.delete.useMutation({
    onSuccess: () => {
      utils.mailbox.faqs.list.invalidate({ mailboxSlug });
    },
  });

  const handleUpdateFaq = async () => {
    if (!editingContent || faq.content === editingContent) {
      setEditingContent(null);
      return;
    }

    if (suggestedReplacement) {
      // Use the tweak procedure for suggested replacements
      await api.mailbox.faqs.tweak.mutateAsync({
        content: editingContent,
        mailboxSlug,
        id: suggestedReplacement.id,
      });
    } else {
      // Use the regular update for normal edits
      await updateMutation.mutateAsync({
        content: editingContent,
        mailboxSlug,
        id: faq.id,
      });
    }

    setEditingContent(null);
  };

  const handleStartEditing = () => {
    if (!faq) return;
    setEditingContent(suggestedReplacement?.content ?? faq.content);
  };

  return (
    <div className="py-4">
      {editingContent ? (
        <KnowledgeEditForm
          content={editingContent}
          originalContent={suggestedReplacement ? faq.content : undefined}
          onChange={setEditingContent}
          onSubmit={() => handleUpdateFaq()}
          onCancel={() => {
            setEditingContent(null);
            if (suggestedReplacement) {
              api.mailbox.faqs.reject.mutateAsync({
                mailboxSlug,
                id: suggestedReplacement.id,
              });
            }
          }}
          isLoading={updateMutation.isPending}
        />
      ) : (
        <div className="flex gap-4">
          <Switch
            aria-label="Enable Knowledge"
            checked={faq.enabled}
            onCheckedChange={() => {
              updateMutation.mutateAsync({
                enabled: !faq.enabled,
                mailboxSlug,
                id: faq.id,
              });
            }}
            disabled={updateMutation.isPending}
            className="mt-0.5"
          />
          <button
            className="flex-1 w-full text-left text-sm hover:underline"
            onClick={(e) => {
              e.preventDefault();
              handleStartEditing();
            }}
          >
            <ReactMarkdown className={cn("prose prose-sm", !faq.enabled && "text-muted-foreground")}>
              {truncate(faq?.content, { length: 125 })}
            </ReactMarkdown>
            {suggestedReplacement && (
              <Badge variant="bright" className="mt-1 shrink-0">
                Suggested Edit
              </Badge>
            )}
          </button>
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            onClick={(e) => {
              e.preventDefault();
              onDelete();
            }}
          >
            <TrashIcon className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </Button>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBankItem;
