"use client";

import { CheckIcon, XMarkIcon } from "@heroicons/react/16/solid";
import ReactMarkdown from "react-markdown";
import type { FAQ } from "@/app/types/global";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";

type SuggestedKnowledgeBankItemProps = {
  mailboxSlug: string;
  faq: FAQ;
};

const SuggestedKnowledgeBankItem = ({ faq, mailboxSlug }: SuggestedKnowledgeBankItemProps) => {
  const utils = api.useUtils();
  const acceptFaq = api.mailbox.faqs.accept.useMutation({
    onSuccess: () => {
      utils.mailbox.faqs.list.invalidate();
    },
  });

  const rejectFaq = api.mailbox.faqs.reject.useMutation({
    onSuccess: () => {
      utils.mailbox.faqs.list.invalidate();
    },
  });

  return (
    <div className="flex flex-col gap-4 border border-bright rounded-lg p-4">
      <div className="flex-1 w-full text-left text-sm">
        <ReactMarkdown className="prose prose-sm">{faq?.content}</ReactMarkdown>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="subtle"
          onClick={() => rejectFaq.mutate({ mailboxSlug, id: faq.id })}
          disabled={rejectFaq.isPending}
        >
          <XMarkIcon className="h-4 w-4 mr-1" />
          Reject
        </Button>
        <Button
          variant="bright"
          onClick={() => acceptFaq.mutate({ mailboxSlug, id: faq.id })}
          disabled={acceptFaq.isPending}
        >
          <CheckIcon className="h-4 w-4 mr-1" />
          Accept
        </Button>
      </div>
    </div>
  );
};

export default SuggestedKnowledgeBankItem;
