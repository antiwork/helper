"use client";

import { PlusCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import SectionWrapper from "../sectionWrapper";
import ApiCard from "./apiCard";
import ApiForm from "./apiForm";
import { ToolsListSkeleton } from "./toolListSkeleton";

const ToolSetting = () => {
  const [showApiForm, setShowApiForm] = useState(false);
  const {
    data: apis = [],
    isLoading: apisLoading,
    isFetching: apisFetching,
    error,
  } = api.mailbox.tools.list.useQuery();

  useEffect(() => {
    if (error) {
      toast.error("Error fetching APIs", {
        description: error instanceof Error ? error.message : "Unknown error",
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
              <PlusCircle className="mr-2 h-4 w-4" />
              Connect API
            </Button>
          </div>
        )}

        <div className="space-y-6">
          {showApiForm && <ApiForm onCancel={() => setShowApiForm(false)} />}

          {apisLoading || (apisFetching && apis.length === 0) ? (
            <ToolsListSkeleton count={1} />
          ) : (
            apis.map((api) => <ApiCard key={api.id} api={api} />)
          )}
        </div>
      </div>
    </SectionWrapper>
  );
};

export default ToolSetting;
