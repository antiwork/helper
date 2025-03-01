"use client";

import { PlusCircleIcon } from "@heroicons/react/24/outline";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "@/components/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";
import KnowledgeBankItem, { KnowledgeEditForm } from "./knowledgeBankItem";
import SectionWrapper from "./sectionWrapper";
import SuggestedKnowledgeBankItem from "./suggestedKnowledgeBankItem";

const KnowledgeBankSetting = () => {
  const params = useParams<{ mailbox_slug: string }>();

  const [newFaqContent, setNewFaqContent] = useState<string>("");
  const [showNewFaqForm, setShowNewFaqForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const utils = api.useUtils();

  const { data: faqs = [], isLoading } = api.mailbox.faqs.list.useQuery({
    mailboxSlug: params.mailbox_slug,
  });

  const filteredFaqs = faqs.filter(
    (faq) => !faq.suggested && faq.content.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const suggestedFaqs = faqs.filter((faq) => faq.suggested && faq.suggestedReplacementForId === null);

  const findSuggestedReplacement = (faqId: number) => {
    return faqs.find((faq) => faq.suggested && faq.suggestedReplacementForId === faqId);
  };

  const createMutation = api.mailbox.faqs.create.useMutation({
    onSuccess: () => {
      utils.mailbox.faqs.list.invalidate({ mailboxSlug: params.mailbox_slug });
      setShowNewFaqForm(false);
      setNewFaqContent("");
    },
    onError: () => {
      toast({ title: "Error creating knowledge", variant: "destructive" });
    },
  });

  const deleteMutation = api.mailbox.faqs.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "Knowledge deleted!",
        variant: "success",
      });
      utils.mailbox.faqs.list.invalidate({ mailboxSlug: params.mailbox_slug });
    },
    onError: () => {
      toast({
        title: "Error deleting knowledge",
        variant: "destructive",
      });
    },
  });

  const handleUpsertFaq = async () => {
    if (!newFaqContent) return;
    await createMutation.mutateAsync({
      content: newFaqContent,
      mailboxSlug: params.mailbox_slug,
    });
  };

  const handleDeleteFaq = async (id: number) => {
    if (confirm("Are you sure you want to delete this knowledge?")) {
      await deleteMutation.mutateAsync({ mailboxSlug: params.mailbox_slug, id });
    }
  };

  return (
    <SectionWrapper
      title="Knowledge Bank"
      description={
        <>
          <div className="mb-2">
            Record information that you frequently share with customers. Helper will use this to provide consistent,
            accurate, and relevant responses to inquiries.
          </div>
          Helper will suggest improvements to your knowledge bank to ensure it's up to date.
        </>
      }
    >
      <Input
        type="text"
        placeholder="Search knowledge bank..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="mb-4"
      />
      {suggestedFaqs.length > 0 && (
        <Accordion type="single" collapsible>
          <AccordionItem value="suggested">
            <AccordionTrigger className="hover:no-underline">
              <Badge variant="yellow">
                {suggestedFaqs.length} suggested {suggestedFaqs.length === 1 ? "entry" : "entries"}
              </Badge>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {suggestedFaqs.map((faq) => (
                  <SuggestedKnowledgeBankItem key={faq.id} faq={faq} mailboxSlug={params.mailbox_slug} />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
      <div className="mb-4 divide-y divide-border">
        {isLoading ? (
          <>
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-4">
                <div className="grow space-y-2">
                  <div className="h-4 w-32 rounded bg-secondary animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
                  <div className="h-4 w-48 rounded bg-secondary animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
                </div>
                <div className="h-6 w-16 rounded bg-secondary animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
              </div>
            ))}
          </>
        ) : (
          filteredFaqs.map((faq) => (
            <KnowledgeBankItem
              key={faq.id}
              faq={faq}
              suggestedReplacement={findSuggestedReplacement(faq.id)}
              onDelete={() => handleDeleteFaq(faq.id)}
              mailboxSlug={params.mailbox_slug}
            />
          ))
        )}
      </div>
      {showNewFaqForm ? (
        <div className="mb-4">
          <KnowledgeEditForm
            content={newFaqContent}
            onChange={setNewFaqContent}
            onSubmit={handleUpsertFaq}
            onCancel={() => {
              setShowNewFaqForm(false);
              setNewFaqContent("");
            }}
            isLoading={createMutation.isPending}
          />
        </div>
      ) : (
        <Button
          variant="subtle"
          onClick={(e) => {
            e.preventDefault();
            setNewFaqContent("");
            setShowNewFaqForm(true);
          }}
        >
          <PlusCircleIcon className="mr-2 h-4 w-4" />
          Add Knowledge
        </Button>
      )}
    </SectionWrapper>
  );
};

export default KnowledgeBankSetting;
