"use client";

import { useUser } from "@clerk/nextjs";
import { BookOpenIcon, InboxIcon, QuestionMarkCircleIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { getBaseUrl } from "@/components/constants";
import { Button } from "@/components/ui/button";

const GitHubIcon = ({ className }: { className?: string }) => {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />{" "}
    </svg>
  );
};

const LoginButtons = ({ githubStars }: { githubStars: number }) => {
  const { isSignedIn } = useUser();

  // Classes to ensure light appearance on dark backgrounds
  const lightButtonClasses = "text-white bg-white/20 focus:bg-white/10 focus:text-white/20";

  return (
    <div className="flex space-x-2">
      <Link href="/help">
        <Button variant="subtle" className={lightButtonClasses}>
          <span className="flex items-center">
            <QuestionMarkCircleIcon className="h-5 w-5 mr-2" />
            Help
          </span>
        </Button>
      </Link>
      <Link href={`${getBaseUrl()}/docs`} target="_blank">
        <Button variant="subtle" className={lightButtonClasses}>
          <span className="flex items-center">
            <BookOpenIcon className="h-5 w-5 mr-2" />
            Docs
          </span>
        </Button>
      </Link>
      <Link href="https://github.com/antiwork/helper" target="_blank">
        <Button variant="subtle" className={lightButtonClasses}>
          <span className="flex items-center">
            <GitHubIcon className="h-5 w-5 mr-2" />
            {githubStars ? githubStars.toLocaleString() : "..."}
          </span>
        </Button>
      </Link>
      {isSignedIn ? (
        <Link href="/mailboxes">
          <Button variant="subtle" className={lightButtonClasses}>
            <span className="flex items-center">
              <InboxIcon className="h-5 w-5 mr-2" />
              Go to mailbox
            </span>
          </Button>
        </Link>
      ) : (
        <Link href="/mailboxes">
          <Button variant="subtle" className={lightButtonClasses}>
            Start using Helper →
          </Button>
        </Link>
      )}
    </div>
  );
};

export const MarketingHeader = ({ bgColor = "#3D0C11" }: { bgColor?: string }) => {
  const [githubStars, setGitHubStars] = useState(0);

  useEffect(() => {
    const fetchGitHubStars = async () => {
      const response = await fetch("https://api.github.com/repos/antiwork/helper", {
        next: { revalidate: 3600 },
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      setGitHubStars(data.stargazers_count);
    };

    fetchGitHubStars();
  }, []);

  return (
    <header className="sticky top-0 z-50" style={{ backgroundColor: bgColor }}>
      <nav className="flex flex-col md:flex-row items-center md:justify-between p-4 mx-4 space-y-4 md:space-y-0">
        <div className="relative w-[100px] h-[32px] mx-auto md:mx-0">
          <Link href="/">
            <Image src="/logo-white.svg" priority alt="Helper" width={100} height={32} />
          </Link>
        </div>
        <div className="flex space-x-2 mx-auto md:mx-0">
          <LoginButtons githubStars={githubStars} />
        </div>
      </nav>
    </header>
  );
};
