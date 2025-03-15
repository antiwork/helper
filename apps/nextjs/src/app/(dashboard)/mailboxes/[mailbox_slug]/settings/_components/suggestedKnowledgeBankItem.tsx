"use client";

import { CheckIcon, XMarkIcon } from "@heroicons/react/16/solid";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { FAQ } from "@/app/types/global";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { KnowledgeEditForm } from "./knowledgeBankItem";

type SuggestedKnowledgeBankItemProps = {
  mailboxSlug: string;
  faq: FAQ;
};

const SuggestedKnowledgeBankItem = ({ faq, mailboxSlug }: SuggestedKnowledgeBankItemProps) => {
  const [editingContent, setEditingContent] = useState<string>(faq.content);
  const utils = api.useUtils();
  
  const updateFaq = api.mailbox.faqs.update.useMutation({
    onSuccess: () => {
      utils.mailbox.faqs.list.invalidate();
    },
  });

  const deleteFaq = api.mailbox.faqs.delete.useMutation({
    onSuccess: () => {
      utils.mailbox.faqs.list.invalidate();
    },
  });

  return (
    <div className="flex flex-col gap-4 border border-bright rounded-lg p-4">
      <KnowledgeEditForm
        content={editingContent}
        onChange={setEditingContent}
        onSubmit={() => updateFaq.mutate({ mailboxSlug, id: faq.id, content: editingContent, enabled: true })}
        onCancel={() => deleteFaq.mutate({ mailboxSlug, id: faq.id })}
        isLoading={updateFaq.isPending || deleteFaq.isPending}
      />
    </div>
  );
};

export default SuggestedKnowledgeBankItem;
