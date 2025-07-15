"use client";

import { PlusCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/trpc/react";
import KnowledgeBankItem, { KnowledgeEditForm } from "./knowledgeBankItem";
import SuggestedKnowledgeBankItem from "./suggestedKnowledgeBankItem";

export default function KnowledgeBankSetting() {
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
    (faq) => !faq.suggested && !withSuggestedReplacement.some((f) => f.id === faq.id)
  );

  const createMutation = api.mailbox.faqs.create.useMutation({
    onSuccess: (data) => {
      utils.mailbox.faqs.list.setData(undefined, (old) =>
        old ? [...old, data].sort((a, b) => a.content.localeCompare(b.content)) : [data]
      );
      setShowNewFaqForm(false);
      setNewFaqContent("");
      toast.success("Knowledge added successfully");
    },
    onError: (error) => {
      toast.error("Error creating knowledge", { description: error.message });
    },
  });

  const deleteMutation = api.mailbox.faqs.delete.useMutation({
    onSuccess: () => {
      utils.mailbox.faqs.list.invalidate();
      toast.success("Knowledge deleted successfully");
    },
    onError: (error) => {
      toast.error("Error deleting knowledge", { description: error.message });
    },
  });

  return (
    <div className="space-y-6 mt-4">
      <Card>
        <CardHeader>
          <CardTitle>Knowledge Bank</CardTitle>
          <CardDescription>
            Record information that you frequently share with customers. Helper uses this to provide consistent and accurate responses.
            <p className="mt-2">
              Helper will suggest improvements to your knowledge bank to ensure it's up to date.
            </p>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="relative flex-1">
                <Input
                  type="text"
                  placeholder="Search knowledge bank..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full max-w-md pr-4"
                />
              </div>
              {!showNewFaqForm && (
                <Button
                  onClick={() => {
                    setNewFaqContent("");
                    setShowNewFaqForm(true);
                  }}
                  className="w-full sm:w-auto"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Knowledge
                </Button>
              )}
            </div>

            {showNewFaqForm && (
              <Card>
                <CardContent className="pt-6">
                  <KnowledgeEditForm
                    content={newFaqContent}
                    onChange={setNewFaqContent}
                    onSubmit={async () => {
                      if (!newFaqContent) return;
                      await createMutation.mutateAsync({ content: newFaqContent });
                    }}
                    onCancel={() => {
                      setShowNewFaqForm(false);
                      setNewFaqContent("");
                    }}
                    isLoading={createMutation.isPending}
                  />
                </CardContent>
              </Card>
            )}

            {suggestedFaqs.length > 0 && (
              <Card className="border-dashed">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="suggested" className="border-none">
                    <AccordionTrigger className="px-6 py-4 hover:no-underline">
                      <Badge variant="bright" className="py-1.5 px-3">
                        {suggestedFaqs.length} suggested {suggestedFaqs.length === 1 ? "entry" : "entries"}
                      </Badge>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6">
                      <div className="space-y-4">
                        {suggestedFaqs.map((faq) => (
                          <SuggestedKnowledgeBankItem key={faq.id} faq={faq} />
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </Card>
            )}

            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="divide-y">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-4 p-6">
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-2/3 rounded bg-muted" />
                          <div className="h-4 w-1/2 rounded bg-muted" />
                        </div>
                        <div className="h-8 w-20 rounded bg-muted" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="divide-y">
                    {withSuggestedReplacement.map((faq) => (
                      <div key={faq.id} className="p-6 transition-colors hover:bg-muted/50">
                        <KnowledgeBankItem
                          faq={faq}
                          suggestedReplacement={faq.suggestedReplacement}
                          onDelete={() => deleteMutation.mutate({ id: faq.id })}
                        />
                      </div>
                    ))}
                    {otherEntries.map((faq) => (
                      <div key={faq.id} className="p-6 transition-colors hover:bg-muted/50">
                        <KnowledgeBankItem 
                          faq={faq} 
                          onDelete={() => deleteMutation.mutate({ id: faq.id })} 
                        />
                      </div>
                    ))}
                    {!withSuggestedReplacement.length && !otherEntries.length && (
                      <div className="flex flex-col items-center justify-center gap-2 p-12 text-center">
                        <p className="text-sm text-muted-foreground">No knowledge entries found</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
