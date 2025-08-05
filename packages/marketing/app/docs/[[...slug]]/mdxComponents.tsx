import { APIPage } from "fumadocs-openapi/ui";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import defaultMdxComponents from "fumadocs-ui/mdx";
import { SupportPortalPrompt } from "@/app/docs/[[...slug]]/supportPortalPrompt";
import { openapi } from "@/lib/source";

export const mdxComponents = {
  ...defaultMdxComponents,
  APIPage: (props: any) => <APIPage {...openapi.getAPIPageProps(props)} />,
  Tabs,
  Tab,
  SupportPortalPrompt,
};
