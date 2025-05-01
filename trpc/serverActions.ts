import { experimental_nextAppDirCaller } from "@trpc/server/adapters/next-app-dir";
import { mailboxProcedure } from "./router/mailbox";
import { createContext } from "./server";

export const mailboxProcedureAction = mailboxProcedure.experimental_caller(
  experimental_nextAppDirCaller({
    createContext: () => createContext("server-action"),
  }),
);
