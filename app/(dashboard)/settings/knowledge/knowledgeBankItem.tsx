import { truncate } from "lodash-es";
import { Check, Trash, X } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import type { FAQ } from "@/app/types/global";
import { ConfirmationDialog } from "@/components/confirmationDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

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
        <Label htmlFor="knowledge-content-textarea">{originalContent ? "Suggested Change" : "Content"}</Label>
        <Textarea
          id="knowledge-content-textarea"
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
                <X className="h-4 w-4 mr-2" />
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
              <Check className="h-4 w-4 mr-2" />
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
  onDelete: () => void;
  faq: FAQ & Partial<{ key: string }>;
  suggestedReplacement?: FAQ | null;
};

const KnowledgeBankItem = ({ faq, suggestedReplacement, onDelete }: KnowledgeBankItemProps) => {
  const [editingContent, setEditingContent] = useState<string | null>(null);

  const utils = api.useUtils();
  const updateMutation = api.mailbox.faqs.update.useMutation({
    onSuccess: (_, { id, ...input }) => {
      utils.mailbox.faqs.list.setData(undefined, (data) =>
        data?.map((faq) => (faq.id === id ? { ...faq, ...input } : faq)),
      );
      setEditingContent(null);
    },
    onError: () => {
      toast.error("Error updating knowledge");
    },
  });

  const acceptMutation = api.mailbox.faqs.accept.useMutation({
    onSuccess: () => {
      utils.mailbox.faqs.list.invalidate();
    },
    onError: () => {
      toast.error("Error updating knowledge");
    },
  });

  const rejectMutation = api.mailbox.faqs.reject.useMutation({
    onSuccess: () => {
      utils.mailbox.faqs.list.invalidate();
    },
    onError: () => {
      toast.error("Error updating knowledge");
    },
  });

  const handleUpdateFaq = async () => {
    if (suggestedReplacement) {
      await acceptMutation.mutateAsync({
        id: suggestedReplacement.id,
        content: editingContent ?? undefined,
      });
      setEditingContent(null);
      return;
    }

    if (!editingContent || faq.content === editingContent) {
      setEditingContent(null);
      return;
    }

    await updateMutation.mutateAsync({
      content: editingContent,
      id: faq.id,
    });
    setEditingContent(null);
  };

  const handleStartEditing = () => {
    if (!faq) return;
    setEditingContent(suggestedReplacement?.content ?? faq.content);
  };

  return (
    <div className="py-4" data-testid="knowledge-bank-item">
      {editingContent ? (
        <KnowledgeEditForm
          content={editingContent}
          originalContent={suggestedReplacement ? faq.content : undefined}
          onChange={setEditingContent}
          onSubmit={() => handleUpdateFaq()}
          onCancel={() => {
            setEditingContent(null);
            if (suggestedReplacement) {
              rejectMutation.mutateAsync({ id: suggestedReplacement.id });
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
            aria-label="Edit knowledge"
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
          <ConfirmationDialog
            message="Are you sure you want to delete this knowledge?"
            onConfirm={onDelete}
            confirmLabel="Yes, delete"
          >
            <Button variant="ghost" size="sm" iconOnly>
              <Trash className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </Button>
          </ConfirmationDialog>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBankItem;
