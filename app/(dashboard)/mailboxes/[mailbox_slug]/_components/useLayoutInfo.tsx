import { createContext, useContext, useState, type Dispatch, type SetStateAction } from "react";
import { assertDefined } from "@/components/utils/assert";

type State = {
  listHidden: boolean;
};

const LayoutInfoContext = createContext<{
  state: State;
  setState: Dispatch<SetStateAction<State>>;
} | null>(null);

export const LayoutInfoProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<State>({
    listHidden: false,
  });
  return <LayoutInfoContext.Provider value={{ state, setState }}>{children}</LayoutInfoContext.Provider>;
};

export const useLayoutInfo = () =>
  assertDefined(useContext(LayoutInfoContext), "Make sure LayoutInfoProvider is used.");
