"use client";

import { useEffect, useState } from "react";
import SectionWrapper from "@/app/(dashboard)/mailboxes/[mailbox_slug]/settings/_components/sectionWrapper";
import { toast } from "@/components/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import ApiCard from "./apiCard";
import ApiForm from "./apiForm";

type ToolSettingProps = {
  mailboxSlug: string;
};

const ToolSetting = ({ mailboxSlug }: ToolSettingProps) => {
  const [showApiForm, setShowApiForm] = useState(false);
  const { data: apis = [], isLoading: apisLoading, error } = api.mailbox.tools.list.useQuery({ mailboxSlug });

  useEffect(() => {
    if (error) {
      toast({
        title: "Error fetching APIs",
        variant: "destructive",
      });
    }
  }, [error]);

  return (
    <SectionWrapper
      title="Tools"
      description="Connect your API using an OpenAPI spec to let Helper take actions in your app when drafting replies."
    >
      <div className="flex flex-col gap-8">
        {!showApiForm && (
          <div>
            <Button variant="subtle" onClick={() => setShowApiForm(true)}>
              Connect API
            </Button>
          </div>
        )}

        <div className="space-y-6">
          {showApiForm && <ApiForm mailboxSlug={mailboxSlug} onCancel={() => setShowApiForm(false)} />}

          {apisLoading ? (
            <>
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-4">
                  <div className="h-5 w-8 rounded bg-secondary animate-skeleton" />
                  <div className="grow space-y-2">
                    <div className="h-4 w-32 rounded bg-secondary animate-skeleton" />
                    <div className="h-4 w-48 rounded bg-secondary animate-skeleton" />
                  </div>
                </div>
              ))}
            </>
          ) : (
            apis.map((api) => <ApiCard key={api.id} api={api} mailboxSlug={mailboxSlug} />)
          )}
        </div>
      </div>
    </SectionWrapper>
  );
};

export default ToolSetting;
