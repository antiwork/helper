import { useCallback, useState } from "react";

// Derived from https://github.com/stereobooster/useful-react-snippets/blob/0435d95947b5aa672d68dd9783ce045bb9038202/useShiftSelected/useShiftSelected.ts
export const useShiftSelected = <P>(initialState: P[], change: (addOrRemove: boolean, items: P[]) => void) => {
  const [previousSelected, setPreviousSelected] = useState<P | null>(null);
  const [previousChecked, setPreviousChecked] = useState<boolean>(false);
  const [currentSelected, setCurrentSelected] = useState<P | null>(null);

  const onChange = useCallback(
    (item: P, isSelected: boolean, shiftKey: boolean) => {
      if (shiftKey) {
        const current = initialState.findIndex((x) => x === item);
        const previous = initialState.findIndex((x) => x === previousSelected);
        const previousCurrent = initialState.findIndex((x) => x === currentSelected);
        const start = Math.min(current, previous);
        const end = Math.max(current, previous);
        if (start > -1 && end > -1) {
          change(previousChecked, initialState.slice(start, end + 1));
          if (previousCurrent > end) {
            change(!previousChecked, initialState.slice(end + 1, previousCurrent + 1));
          }
          if (previousCurrent < start) {
            change(!previousChecked, initialState.slice(previousCurrent, start));
          }
          setCurrentSelected(item);
          return;
        }
      } else {
        setPreviousSelected(item);
        setCurrentSelected(null);
        setPreviousChecked(isSelected);
      }
      change(isSelected, [item]);
    },
    [
      change,
      initialState,
      previousSelected,
      setPreviousSelected,
      previousChecked,
      setPreviousChecked,
      currentSelected,
      setCurrentSelected,
    ],
  );

  return onChange;
};
