"use client";

import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Reorder } from "motion/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useMediaQuery } from "react-responsive";
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
  addTab: (url?: string) => void;
  updateCurrentTab: (tab: Partial<Tab>) => void;
}>((set, get) => {
  const setTabs = (setter: (tabs: Tab[], activeTab: string | null) => { tabs: Tab[]; activeTab: string | null }) => {
    const newState = setter(get().tabs, get().activeTab);
    localStorage.setItem("tabs", JSON.stringify(newState));
    set(newState);
  };
  return {
    ...initialState,
    setTabs,
    addTab: (url?: string) => {
      const tab = newTab(url);
      setTabs((tabs) => ({ tabs: [...tabs, tab], activeTab: tab.id }));
    },
    updateCurrentTab: (tab) => {
      setTabs((tabs) => ({
        tabs: tabs.map((t) => (t.id === get().activeTab ? { ...t, ...tab } : t)),
        activeTab: get().activeTab,
      }));
    },
  };
});

export const TabBar = () => {
  const isStandalone = useMediaQuery({ query: "(display-mode: standalone)" });
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { tabs, activeTab, setTabs, updateCurrentTab, addTab } = useTabsState();

  useEffect(() => {
    updateCurrentTab({ url: location.href });
  }, [pathname, searchParams, activeTab]);

  useEffect(() => {
    const updateCurrentTabTitle = () => {
      const titles = Array.from(document.querySelectorAll("title"));
      // We should fix how we deal with titles to make sure we only create one - React 19 and Next are clashing
      updateCurrentTab({ title: titles.find((title) => title.textContent !== "Helper")?.textContent ?? "Helper" });
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

  if (!isStandalone) return null;

  return (
    <div className="absolute top-0 left-0 right-0 h-10 bg-background flex">
      <div className="absolute inset-x-0 bottom-0 border-b" />
      <Reorder.Group
        axis="x"
        values={tabs}
        layoutScroll
        style={{ overflowX: "scroll", display: "flex" }}
        onReorder={(newTabs) => {
          setTabs((_, activeTab) => ({ tabs: newTabs, activeTab }));
        }}
      >
        {tabs.map((tab) => (
          <Reorder.Item key={tab.id} value={tab}>
            <div
              data-no-drag
              key={tab.id}
              className="relative h-full w-56 flex items-center pl-4 pr-2 border-r border-b bg-background cursor-pointer"
              onClick={() => {
                setTabs((tabs) => ({ tabs, activeTab: tab.id }));
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
                    setTabs((_, activeTab) => ({
                      tabs: newTabs,
                      activeTab: activeTab === tab.id ? newTabs[0]!.id : activeTab,
                    }));
                  } else {
                    setTabs(() => buildFirstTab());
                  }
                }}
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </Reorder.Item>
        ))}
      </Reorder.Group>
      <button className="self-center ml-1 p-2 rounded transition-colors hover:bg-muted" onClick={() => addTab()}>
        <PlusIcon className="w-4 h-4" />
      </button>
    </div>
  );
};

const newTab = (url?: string) => {
  return { id: crypto.randomUUID(), title: document.title, url: url ?? location.href };
};
