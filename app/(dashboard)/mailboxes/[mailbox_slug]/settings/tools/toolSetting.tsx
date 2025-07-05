"use client";

import { PlusCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { ToolsListSkeleton } from "@/components/skeletons/ToolsListSkeleton";
import { Button } from "@/components/ui/button";
import { showErrorToast } from "@/lib/utils/toast";
import { api } from "@/trpc/react";
import SectionWrapper from "../sectionWrapper";
import ApiCard from "./apiCard";
import ApiForm from "./apiForm";

type ToolSettingProps = {
  mailboxSlug: string;
};

const ToolSetting = ({ mailboxSlug }: ToolSettingProps) => {
  const [showApiForm, setShowApiForm] = useState(false);
  const {
    data: apis = [],
    isLoading: apisLoading,
    isFetching: apisFetching,
    error,
  } = api.mailbox.tools.list.useQuery({ mailboxSlug });

  useEffect(() => {
    if (error) {
      showErrorToast("Failed to fetch APIs", error);
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
              <PlusCircle className="mr-2 h-4 w-4" />
              Connect API
            </Button>
          </div>
        )}

        <div className="space-y-6">
          {showApiForm && <ApiForm mailboxSlug={mailboxSlug} onCancel={() => setShowApiForm(false)} />}

          {apisLoading || (apisFetching && apis.length === 0) ? (
            <ToolsListSkeleton count={2} />
          ) : (
            apis.map((api) => <ApiCard key={api.id} api={api} mailboxSlug={mailboxSlug} />)
          )}
        </div>
      </div>
    </SectionWrapper>
  );
};

export default ToolSetting;
