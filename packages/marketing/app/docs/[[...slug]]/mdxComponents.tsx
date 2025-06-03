import { APIPage } from "fumadocs-openapi/ui";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import defaultMdxComponents from "fumadocs-ui/mdx";
import { SecretGenerator } from "@/app/docs/[[...slug]]/secretGenerator";
import { openapi } from "@/lib/source";

export const mdxComponents = {
  ...defaultMdxComponents,
  APIPage: (props: any) => <APIPage {...openapi.getAPIPageProps(props)} />,
  Tabs,
  Tab,
  SecretGenerator,
};
