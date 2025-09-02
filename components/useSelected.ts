import { difference, uniq } from "lodash-es";
import { useCallback, useState } from "react";

// Derived from https://github.com/stereobooster/useful-react-snippets/blob/0435d95947b5aa672d68dd9783ce045bb9038202/useShiftSelected/useSelected.ts
export const useSelected = <P>(initialState: P[]) => {
  const [selected, setSelected] = useState(initialState);

  const add = useCallback(
    (items: P[]) => {
      setSelected((oldList) => uniq([...oldList, ...items]));
    },
    [setSelected],
  );

  const remove = useCallback(
    (items: P[]) => {
      setSelected((oldList) => difference(oldList, items));
    },
    [setSelected],
  );

  const change = useCallback(
    (addOrRemove: boolean, items: P[]) => {
      if (addOrRemove) {
        add(items);
      } else {
        remove(items);
      }
    },
    [add, remove],
  );

  const clear = useCallback(() => setSelected([]), [setSelected]);

  return { selected, add, remove, clear, change, set: setSelected };
};
