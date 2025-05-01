import * as React from "react";
import { useOnGlobalEscPress } from "@/components/useOnGlobalEscPress";
import { useOnOutsideClick } from "@/components/useOnOutsideClick";
import { useRefToLatest } from "@/components/useRefToLatest";

type PopoverTrigger = (ariaAttributes: React.AriaAttributes) => React.ReactNode;

type Props = {
  trigger: PopoverTrigger;
  children: React.ReactNode;
  className?: string;
  open?: boolean;
  onToggle?: (open: boolean) => void;
  openOnHover?: { closeDelay: number } | boolean;
  closeOnOutsideClick?: boolean;
  style?: React.CSSProperties;
  position?: "bottom" | "top";
};

const popoverAriaAttributes = (open: boolean): React.AriaAttributes => ({
  "aria-haspopup": true,
  "aria-expanded": open,
});

export const Popover = ({
  trigger,
  children,
  open: openProp,
  onToggle,
  openOnHover = false,
  style,
  className,
  closeOnOutsideClick,
  position = "bottom",
}: Props) => {
  const [open, setOpen] = React.useState(openProp ?? false);
  const ref = React.useRef<HTMLElement | null>(null);
  const dropoverPosition = useDropdownPosition(ref);

  if (openProp !== undefined && open !== openProp) setOpen(openProp);

  const toggle = (newOpen: boolean) => {
    if (openProp === undefined) setOpen(newOpen);
    onToggle?.(newOpen);
  };

  useOnOutsideClick([ref.current], () => {
    if (closeOnOutsideClick) toggle(false);
  });
  useOnGlobalEscPress(() => toggle(false));

  return (
    <HoverContainer
      trigger={trigger}
      open={open}
      openOnHover={openOnHover}
      toggle={toggle}
      ref={(el) => {
        ref.current = el;
      }}
      style={style}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={className ?? "absolute z-20"}
        style={{
          position: "absolute",
          ...(position === "top"
            ? {
                bottom: "calc(100% + 0.5rem)",
                top: "auto",
              }
            : {
                top: "calc(100% + 0.5rem)",
                bottom: "auto",
              }),
          ...dropoverPosition,
          ...style,
        }}
      >
        {children}
      </div>
    </HoverContainer>
  );
};

const HoverContainer = React.forwardRef<
  HTMLDivElement,
  {
    trigger: PopoverTrigger;
    open: boolean;
    toggle: (open: boolean) => void;
    openOnHover?: { closeDelay: number } | boolean;
  } & React.ComponentProps<"div">
>(({ children, trigger, open, toggle, openOnHover = false }, ref) => {
  const dropdownUID = React.useId();
  const closeDelayTimeoutRef = React.useRef<number | null>(null);
  const toggleRef = useRefToLatest(toggle);
  const closeDelay = typeof openOnHover === "object" ? openOnHover.closeDelay : 400;

  const clearCloseDelayTimeout = () => {
    if (closeDelayTimeoutRef.current) window.clearTimeout(closeDelayTimeoutRef.current);
  };
  const openPopover = () => {
    clearCloseDelayTimeout();
    if (!open) toggle(true);
  };
  const closeAfterDelay = () => {
    clearCloseDelayTimeout();
    closeDelayTimeoutRef.current = window.setTimeout(() => toggleRef.current(false), closeDelay);
  };
  React.useEffect(() => {
    clearCloseDelayTimeout();
    return clearCloseDelayTimeout;
  }, [open]);

  return (
    <div
      ref={ref}
      className="relative inline-block"
      onClick={() => toggle(!open)}
      {...(openOnHover && {
        onMouseEnter: openPopover,
        onMouseLeave: closeAfterDelay,
      })}
    >
      {trigger({
        ...popoverAriaAttributes(open),
        "aria-controls": dropdownUID,
      })}
      <div id={dropdownUID} hidden={!open}>
        {children}
      </div>
    </div>
  );
});

HoverContainer.displayName = "HoverContainer";

const useDropdownPosition = (ref: React.RefObject<HTMLElement | null>) => {
  const [space, setSpace] = React.useState(0);
  const [maxWidth, setMaxWidth] = React.useState(0);
  React.useEffect(() => {
    const calculateSpace = () => {
      if (!ref.current?.parentElement) return;
      let scrollContainer = ref.current.parentElement;
      while (getComputedStyle(scrollContainer).overflow === "visible" && scrollContainer.parentElement !== null) {
        scrollContainer = scrollContainer.parentElement;
      }
      setSpace(
        scrollContainer.clientWidth -
          (ref.current.getBoundingClientRect().left - scrollContainer.getBoundingClientRect().left),
      );
      setMaxWidth(scrollContainer.clientWidth);
    };
    calculateSpace();
    window.addEventListener("resize", calculateSpace);

    return () => window.removeEventListener("resize", calculateSpace);
  });

  return {
    transform: `translateX(min(${space}px - 100%, 0px))`,
    maxWidth: `${maxWidth - 32}px`,
  };
};

export default Popover;
