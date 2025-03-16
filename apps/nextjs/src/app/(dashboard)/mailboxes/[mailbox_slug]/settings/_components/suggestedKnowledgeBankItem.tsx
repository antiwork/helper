"use client";

import { CheckIcon, XMarkIcon } from "@heroicons/react/16/solid";
import { useState } from "react";
import type { FAQ } from "@/app/types/global";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/react";

type SuggestedKnowledgeBankItemProps = {
  mailboxSlug: string;
  faq: FAQ;
};

const SuggestedKnowledgeBankItem = ({ faq, mailboxSlug }: SuggestedKnowledgeBankItemProps) => {
  const [content, setContent] = useState(faq.content);
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
    <div className="flex flex-col gap-2 border border-bright rounded-lg p-4">
      <div className="flex-1 w-full text-left text-sm">
        <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={3} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="subtle"
          onClick={() => deleteFaq.mutate({ mailboxSlug, id: faq.id })}
          disabled={deleteFaq.isPending}
        >
          <XMarkIcon className="h-4 w-4 mr-1" />
          Reject
        </Button>
        <Button
          variant="bright"
          onClick={() => updateFaq.mutate({ mailboxSlug, id: faq.id, content, enabled: true })}
          disabled={updateFaq.isPending}
        >
          <CheckIcon className="h-4 w-4 mr-1" />
          Accept
        </Button>
      </div>
    </div>
  );
};

export default SuggestedKnowledgeBankItem;
