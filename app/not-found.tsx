"use client";

import { Shuffle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const [footerBgColor, setFooterBgColor] = useState("#000000");
  const [footerTextColor, setFooterTextColor] = useState("#FFFFFF");

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
        </nav>
      </header>

      <main className="grow flex flex-col items-center justify-center h-screen bg-secondary-light dark:bg-secondary-dark text-center p-4">
        <div className="max-w-md">
          <div className="flex justify-center mb-8">
            <Image src="/logo_icon.svg" alt="Helper" width={96} height={96} className="md:w-128 md:h-128" />
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-8xl font-bold mb-6 text-secondary dark:text-foreground">Oops!</h1>
          <p className="text-lg md:text-xl mb-12 text-secondary dark:text-foreground">
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
        <div className="flex justify-between items-center w-full">
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
