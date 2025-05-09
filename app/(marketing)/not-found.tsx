"use client";

import { useUser } from "@clerk/nextjs";
import { BookOpen, Inbox, Shuffle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
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

  return (
    <div className="flex space-x-2">
      <Link href={`${getBaseUrl()}/docs`} target="_blank">
        <Button variant="subtle">
          <span className="flex items-center">
            <BookOpen className="h-5 w-5 mr-2" />
            Docs
          </span>
        </Button>
      </Link>
      <Link href="https://github.com/antiwork/helper" target="_blank">
        <Button variant="subtle">
          <span className="flex items-center">
            <GitHubIcon className="h-5 w-5 mr-2" />
            {githubStars.toLocaleString()}
          </span>
        </Button>
      </Link>
      {isSignedIn && (
        <Link href="/mailboxes">
          <Button variant="subtle">
            <span className="flex items-center">
              <Inbox className="h-5 w-5 mr-2" />
              Go to mailbox
            </span>
          </Button>
        </Link>
      )}
    </div>
  );
};

export default function NotFound() {
  const [footerBgColor, setFooterBgColor] = useState("#000000");
  const [footerTextColor, setFooterTextColor] = useState("#FFFFFF");
  const [githubStars, setGitHubStars] = useState(0);

  const generateRandomColors = useCallback(() => {
    const generateRandomColor = () =>
      `#${Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0")}`;

    const getContrastRatio = (color1: string, color2: string) => {
      const luminance = (color: string) => {
        const rgb = parseInt(color.slice(1), 16);
        const r = (rgb >> 16) & 0xff;
        const g = (rgb >> 8) & 0xff;
        const b = (rgb >> 0) & 0xff;
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const l1 = luminance(color1);
      const l2 = luminance(color2);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    };

    let bgColor, textColor;
    do {
      bgColor = generateRandomColor();
      textColor = generateRandomColor();
    } while (getContrastRatio(bgColor, textColor) < 4.5);

    setFooterBgColor(bgColor);
    setFooterTextColor(textColor);
  }, []);

  useEffect(() => {
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };

    setVH();
    window.addEventListener("resize", setVH);

    return () => window.removeEventListener("resize", setVH);
  }, []);

  useEffect(() => {
    const fetchGitHubStars = async () => {
      const response = await fetch("https://api.github.com/repos/antiwork/helper", {
        next: { revalidate: 3600 }, // Cache for 1 hour
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
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#3D0C11" }}>
      <header className="sticky top-0 z-50">
        <nav className="flex flex-col md:flex-row items-center md:justify-between p-4 mx-4 space-y-4 md:space-y-0">
          <div className="relative w-[100px] h-[32px] mx-auto md:mx-0">
            <Image
              src="/logo-white.svg"
              priority
              alt="Helper"
              width={100}
              height={32}
              className="absolute top-0 left-0 transition-opacity duration-300 ease-in-out opacity-100"
            />
          </div>
          <div className="flex space-x-2 mx-auto md:mx-0">
            <LoginButtons githubStars={githubStars} />
          </div>
        </nav>
      </header>

      <main className="grow flex flex-col items-center justify-center p-6 md:p-12">
        <div className="text-center max-w-3xl mx-auto">
          <div className="flex justify-center mb-8">
            <Image src="/logo_icon.svg" alt="Helper" width={96} height={96} className="md:w-128 md:h-128" />
          </div>
          <h1 className="font-sundry-narrow-bold text-4xl md:text-6xl lg:text-8xl font-bold mb-6 text-secondary dark:text-foreground">
            Page not found
          </h1>
          <p className="text-lg md:text-xl mb-12 text-secondary dark:text-foreground sundry-narrow-medium">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Link href="/">
            <Button variant="bright" size="lg" className="relative overflow-hidden group">
              <span className="relative z-10">Go home</span>
              <div className="absolute inset-0 w-[200%] transition-transform duration-1000 bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-[100%] group-hover:translate-x-[100%]" />
            </Button>
          </Link>
        </div>
      </main>

      <footer
        className="w-full h-[10vh] px-12 transition-colors duration-300 flex items-center"
        style={{ backgroundColor: footerBgColor }}
      >
        <div className=" flex justify-between items-center w-full">
          <div className="flex items-center">
            <div className="flex flex-col items-start">
              <a href="https://helper.ai/" target="_blank" rel="noopener noreferrer">
                <Image
                  src="/logo.svg"
                  alt="Helper"
                  width={100}
                  height={32}
                  className="transition-opacity duration-300 ease-in-out opacity-100"
                />
              </a>
            </div>
          </div>
          <div className="flex items-center">
            <Button
              onClick={generateRandomColors}
              className="transition-colors duration-300"
              iconOnly
              style={{ backgroundColor: footerTextColor, color: footerBgColor }}
            >
              <Shuffle className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
