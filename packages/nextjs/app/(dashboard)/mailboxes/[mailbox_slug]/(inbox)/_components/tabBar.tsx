"use client";

import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Reorder } from "motion/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SetStateAction, useEffect, useState } from "react";
import { create } from "zustand";

type Tab = {
  id: string;
  title: string;
  url: string;
};

const buildFirstTab = () => {
  const tab = newTab();
  return { tabs: [tab], activeTab: tab.id };
};

const savedState = localStorage.getItem("tabs");
const initialState: { tabs: Tab[]; activeTab: string } = savedState ? JSON.parse(savedState) : buildFirstTab();

export const useTabsState = create<{
  tabs: Tab[];
  activeTab: string | null;
  setTabs: (setter: (tabs: Tab[], activeTab: string | null) => { tabs: Tab[]; activeTab: string | null }) => void;
}>((set, get) => ({
  ...initialState,
  setTabs: (setter) => {
    const newState = setter(get().tabs, get().activeTab);
    localStorage.setItem("tabs", JSON.stringify(newState));
    set(newState);
  },
}));

export const TabBar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { tabs, activeTab, setTabs } = useTabsState();

  const savedState = localStorage.getItem("tabs");
  const { tabs: initialTabs, activeTab: initialActiveTab }: { tabs: Tab[]; activeTab: string } = savedState
    ? JSON.parse(savedState)
    : buildFirstTab();

  const [tabs, setTabsState] = useState(initialTabs);
  const setTabs = (newTabs: SetStateAction<Tab[]>, newActiveTab: SetStateAction<string | null> = (id) => id) => {
    setTabsState((tabs) => {
      const tabsState = typeof newTabs === "function" ? newTabs(tabs) : newTabs;
      setActiveTab((activeTab) => {
        const activeTabState = typeof newActiveTab === "function" ? newActiveTab(activeTab) : newActiveTab;
        localStorage.setItem("tabs", JSON.stringify({ tabs: tabsState, activeTab: activeTabState }));
        return activeTabState;
      });
      return tabsState;
    });
  };
  const [activeTab, setActiveTab] = useState<string | null>(initialActiveTab);

  useEffect(() => {
    setTabs((tabs) => tabs.map((tab) => (tab.id === activeTab ? { ...tab, url: location.href } : tab)));
  }, [pathname, searchParams, activeTab]);

  useEffect(() => {
    const updateCurrentTabTitle = () => {
      const titles = Array.from(document.querySelectorAll("title"));
      // We should fix how we deal with titles to make sure we only create one - React 19 and Next are clashing
      const title = titles.find((title) => title.textContent !== "Helper")?.textContent ?? "Helper";
      setTabs((tabs) => tabs.map((tab) => (tab.id === activeTab ? { ...tab, title } : tab)));
    };

    const titleObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          const addedTitles = Array.from(mutation.addedNodes).filter((node) => node.nodeName === "TITLE");
          if (addedTitles.length > 0) {
            addedTitles.forEach((titleNode) => {
              titleObserver.observe(titleNode, {
                childList: true,
                characterData: true,
                subtree: true,
              });
            });
            updateCurrentTabTitle();
          }
        }

        if (
          mutation.type === "characterData" &&
          mutation.target.nodeName === "#text" &&
          mutation.target.parentNode?.nodeName === "TITLE"
        ) {
          updateCurrentTabTitle();
        }
      });
    });

    document.querySelectorAll("title").forEach((titleElement) => {
      titleObserver.observe(titleElement, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    });

    titleObserver.observe(document.querySelector("head")!, {
      childList: true,
      subtree: true,
    });

    return () => titleObserver.disconnect();
  }, []);

  return (
    <div className="absolute top-0 left-0 right-0 h-10 bg-background flex">
      <div className="absolute inset-x-0 bottom-0 border-b" />
      <Reorder.Group
        axis="x"
        values={tabs}
        layoutScroll
        style={{ overflowX: "scroll", display: "flex" }}
        onReorder={(newTabs) => {
          setTabs(newTabs);
        }}
      >
        {tabs.map((tab) => (
          <Reorder.Item key={tab.id} value={tab}>
            <div
              data-no-drag
              key={tab.id}
              className="relative h-full w-56 flex items-center pl-4 pr-2 border-r border-b bg-background cursor-pointer"
              onClick={() => {
                setTabs(tabs, tab.id);
                router.push(tab.url);
              }}
            >
              {activeTab === tab.id && <div className="absolute inset-x-0 bottom-0 h-0.5 bg-bright" />}
              <span className="text-sm flex-1 truncate">{tab.title || <em>Loading ...</em>}</span>
              <button
                className="ml-2 p-1 rounded transition-colors hover:bg-muted"
                onClick={(e) => {
                  e.stopPropagation();
                  const newTabs = tabs.filter((t) => t.id !== tab.id);
                  if (newTabs[0]) {
                    setTabs(newTabs, activeTab === tab.id ? newTabs[0].id : activeTab);
                  } else {
                    const { tabs: firstTab, activeTab: newActiveTab } = buildFirstTab();
                    setTabs(firstTab, newActiveTab);
                  }
                }}
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </Reorder.Item>
        ))}
      </Reorder.Group>
      <button
        className="self-center ml-1 p-2 rounded transition-colors hover:bg-muted"
        onClick={() => {
          const tab = newTab();
          setTabs([...tabs, tab], tab.id);
        }}
      >
        <PlusIcon className="w-4 h-4" />
      </button>
    </div>
  );
};

const newTab = () => {
  return { id: crypto.randomUUID(), title: document.title, url: location.href };
};
