"use client";

import { PlusCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";
import SectionWrapper from "../sectionWrapper";
import KnowledgeBankItem, { KnowledgeEditForm } from "./knowledgeBankItem";
import SuggestedKnowledgeBankItem from "./suggestedKnowledgeBankItem";

const KnowledgeBankSetting = () => {
  const [newFaqContent, setNewFaqContent] = useState<string>("");
  const [showNewFaqForm, setShowNewFaqForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const utils = api.useUtils();

  const { data: faqs = [], isLoading } = api.mailbox.faqs.list.useQuery();

  const filteredFaqs = faqs.filter((faq) => faq.content.toLowerCase().includes(searchQuery.toLowerCase()));

  const suggestedFaqs = filteredFaqs.filter((faq) => faq.suggested && faq.suggestedReplacementForId === null);
  const withSuggestedReplacement = filteredFaqs.flatMap((faq) => {
    const suggestedReplacement = faqs.find((f) => f.suggestedReplacementForId === faq.id);
    return suggestedReplacement ? [{ ...faq, suggestedReplacement }] : [];
  });
  const otherEntries = filteredFaqs.filter(
    (faq) => !faq.suggested && !withSuggestedReplacement.some((f) => f.id === faq.id),
  );

  const createMutation = api.mailbox.faqs.create.useMutation({
    onSuccess: (data) => {
      utils.mailbox.faqs.list.setData(undefined, (old) =>
        old ? [...old, data].sort((a, b) => a.content.localeCompare(b.content)) : [data],
      );
      setShowNewFaqForm(false);
      setNewFaqContent("");
    },
    onError: (error) => {
      toast.error("Error creating knowledge", { description: error.message });
    },
  });

  const deleteMutation = api.mailbox.faqs.delete.useMutation({
    onSuccess: () => {
      toast.success("Knowledge deleted!");
      utils.mailbox.faqs.list.invalidate();
    },
    onError: (error) => {
      toast.error("Error deleting knowledge", { description: error.message });
    },
  });

  const handleUpsertFaq = async () => {
    if (!newFaqContent) return;
    await createMutation.mutateAsync({
      content: newFaqContent,
    });
  };

  const handleDeleteFaq = async (id: number) => {
    await deleteMutation.mutateAsync({ id });
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
              <Badge variant="bright">
                {suggestedFaqs.length} suggested {suggestedFaqs.length === 1 ? "entry" : "entries"}
              </Badge>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {suggestedFaqs.map((faq) => (
                  <SuggestedKnowledgeBankItem key={faq.id} faq={faq} />
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
                  <div className="h-4 w-32 rounded bg-secondary animate-skeleton" />
                  <div className="h-4 w-48 rounded bg-secondary animate-skeleton" />
                </div>
                <div className="h-6 w-16 rounded bg-secondary animate-skeleton" />
              </div>
            ))}
          </>
        ) : (
          <>
            {withSuggestedReplacement.map((faq) => (
              <KnowledgeBankItem
                key={faq.id}
                faq={faq}
                suggestedReplacement={faq.suggestedReplacement}
                onDelete={() => handleDeleteFaq(faq.id)}
              />
            ))}
            {otherEntries.map((faq) => (
              <KnowledgeBankItem key={faq.id} faq={faq} onDelete={() => handleDeleteFaq(faq.id)} />
            ))}
          </>
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
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Knowledge
        </Button>
      )}
    </SectionWrapper>
  );
};

export default KnowledgeBankSetting;
