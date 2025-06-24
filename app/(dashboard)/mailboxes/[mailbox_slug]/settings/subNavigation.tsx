import cx from "classnames";
import { useParams, useRouter } from "next/navigation";
import { parseAsStringEnum, useQueryState } from "nuqs";
import React, { useEffect, useRef, useState } from "react";
import { useBreakpoint } from "@/components/useBreakpoint";

type NavigationItem = {
  label: string;
  content: React.ReactNode;
  id: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

type SubNavigationProps = {
  items: NavigationItem[];
  footer?: React.ReactNode;
};

const SubNavigation: React.FC<SubNavigationProps> = ({ items, footer }) => {
  const params = useParams<{ mailbox_slug: string; tab: string }>();
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const { isBelowMd } = useBreakpoint("md");
  useEffect(() => setIsMobile(isBelowMd), [isBelowMd]);

  const selectedItem = items.find((item) => item.id === params.tab);

  if (isMobile) {
    return (
      <div className="w-full">
        <div
          className="overflow-x-auto"
          ref={scrollRef}
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          <div className="flex whitespace-nowrap pb-1">
            {items.map((item) => {
              const Icon = item.icon;
              const isSelected = item.id === params.tab;
              return (
                <button
                  key={item.id}
                  onClick={() => router.push(`/${item.id}`)}
                  className={cx(
                    "flex items-center px-4 py-3 text-sm transition-colors duration-150 ease-in-out",
                    "max-w-[200px] cursor-pointer",
                    isSelected
                      ? "border-b-2 border-bright bg-secondary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon
                    className={cx("mr-2 h-5 w-5 shrink-0", isSelected ? "text-primary-500" : "text-muted-foreground")}
                  />
                  <span className={cx("truncate", isSelected ? "text-foreground" : "")}>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="grow overflow-y-auto bg-background px-4 pb-4">{selectedItem?.content}</div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="flex w-56 flex-col border-r border-border">
        <div className="flex-1 overflow-y-auto">
          {items.map((item, index) => {
            const Icon = item.icon;
            const isSelected = item.id === selectedItem?.id;
            return (
              <span
                key={index}
                onClick={(e) => {
                  e.preventDefault();
                  router.push(`/mailboxes/${params.mailbox_slug}/settings/${item.id}`);
                }}
                className={cx(
                  "flex h-12 items-center px-4 text-sm transition-colors duration-150 ease-in-out",
                  "overflow-hidden cursor-pointer",
                  isSelected ? "bg-secondary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon
                  className={cx("mr-3 h-5 w-5 shrink-0", isSelected ? "text-primary-500" : "text-muted-foreground")}
                />
                <span className={cx("truncate", isSelected ? "text-foreground" : "")}>{item.label}</span>
              </span>
            );
          })}
        </div>
        {footer}
      </div>
      <div className="flex-1 overflow-auto p-6">{selectedItem?.content}</div>
    </div>
  );
};

export default SubNavigation;
