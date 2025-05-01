"use client";

import {
  AcademicCapIcon,
  ArchiveBoxIcon,
  ArrowRightIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  ExclamationCircleIcon,
  MagnifyingGlassIcon,
  PuzzlePieceIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { MarketingHeader } from "../MarketingHeader";

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState("");
  const [githubStars, setGithubStars] = useState<number | null>(null);

  useEffect(() => {
    fetch("https://api.github.com/repos/antiwork/helper")
      .then((res) => res.json())
      .then((data) => {
        setGithubStars(data.stargazers_count || 0);
      })
      .catch(() => {
        setGithubStars(0);
      });
  }, []);

  const categories = [
    {
      title: "Getting Started",
      icon: AcademicCapIcon,
      articles: [
        { title: "What is Helper?", slug: "what-is-helper" },
        { title: "Setting up your account", slug: "account-setup" },
        { title: "Creating your first mailbox", slug: "first-mailbox" },
      ],
    },
    {
      title: "Knowledge Bank",
      icon: ArchiveBoxIcon,
      articles: [
        { title: "Building your knowledge base", slug: "building-knowledge-base" },
        { title: "Importing existing documentation", slug: "importing-documentation" },
        { title: "Organizing knowledge categories", slug: "organizing-categories" },
      ],
    },
    {
      title: "Customer Interactions",
      icon: ChatBubbleLeftRightIcon,
      articles: [
        { title: "Message reactions", slug: "message-reactions" },
        { title: "Shorthand replies", slug: "shorthand-replies" },
        { title: "Managing customer conversations", slug: "managing-conversations" },
      ],
    },
    {
      title: "Integrations",
      icon: PuzzlePieceIcon,
      articles: [
        { title: "Slack integration", slug: "slack-integration" },
        { title: "Slack notifications", slug: "slack-notifications" },
        { title: "Connecting with other tools", slug: "connecting-tools" },
      ],
    },
    {
      title: "Analytics",
      icon: ChartBarIcon,
      articles: [
        { title: "Response time metrics", slug: "response-time-metrics" },
        { title: "Customer satisfaction tracking", slug: "satisfaction-tracking" },
        { title: "Performance dashboards", slug: "performance-dashboards" },
      ],
    },
  ];

  const filteredCategories = searchQuery
    ? categories
        .map((category) => ({
          ...category,
          articles: category.articles.filter((article) =>
            article.title.toLowerCase().includes(searchQuery.toLowerCase()),
          ),
        }))
        .filter((category) => category.articles.length > 0)
    : categories;

  return (
    <div className="flex flex-col min-h-screen bg-[#2B0808] text-white">
      <MarketingHeader bgColor="#2B0808" />
      <div className="border-b border-white/10"></div>

      <div className="container mx-auto px-4 py-16 flex-grow">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold mb-8 text-center">Help Center</h1>
          <p className="text-xl text-center mb-12 text-gray-300">
            Find answers to your questions about Helper features and functionality
          </p>

          <div className="relative mb-16">
            <div className="flex items-center border-2 border-white/20 rounded-lg overflow-hidden bg-[#412020]">
              <div className="pl-4">
                <MagnifyingGlassIcon className="h-6 w-6 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search for help articles..."
                className="w-full py-4 px-4 bg-transparent text-white placeholder-gray-400 focus:outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {filteredCategories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredCategories.map((category, index) => {
                const CategoryIcon = category.icon;
                return (
                  <div
                    key={index}
                    className="bg-[#412020] rounded-xl p-6 border border-white/20 hover:border-amber-500 transition-colors"
                  >
                    <div className="flex items-center mb-4">
                      <div className="w-10 h-10 mr-3 flex items-center justify-center bg-white/10 rounded-lg">
                        <CategoryIcon className="h-6 w-6 text-amber-400" />
                      </div>
                      <h2 className="text-xl font-semibold">{category.title}</h2>
                    </div>
                    <ul className="space-y-3">
                      {category.articles.map((article, articleIndex) => (
                        <li key={articleIndex}>
                          <Link
                            href={`/help/${article.slug}`}
                            className="flex items-center text-gray-300 hover:text-amber-400 transition-colors"
                          >
                            <ArrowRightIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                            <span>{article.title}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-[#412020] rounded-xl border border-white/20">
              <ExclamationCircleIcon className="h-16 w-16 mx-auto mb-6 text-amber-400" />
              <h3 className="text-2xl font-medium mb-4">No results found</h3>
              <p className="text-gray-400 mb-8">
                We couldn't find any articles matching your search. Try using different keywords.
              </p>
              <button
                onClick={() => setSearchQuery("")}
                className="bg-amber-500 hover:bg-amber-600 text-black font-medium px-6 py-3 rounded-md transition-colors"
              >
                Clear search
              </button>
            </div>
          )}

          <div className="mt-20 bg-[#412020] rounded-xl p-8 border border-white/20">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="mb-6 md:mb-0 md:mr-8">
                <h2 className="text-2xl font-bold mb-2">Can't find what you're looking for?</h2>
                <p className="text-gray-300">Our support team is ready to help with any questions you might have.</p>
              </div>
              <Link
                href="/contact"
                className="bg-amber-500 hover:bg-amber-600 text-black font-medium px-6 py-3 rounded-md whitespace-nowrap transition-colors"
              >
                Contact Support
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
