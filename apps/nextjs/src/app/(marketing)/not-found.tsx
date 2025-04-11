"use client";

import { ArrowLeft, Compass, Shuffle } from "lucide-react";
import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const [backgroundColor, setBackgroundColor] = useState("#3D0C11");
  const [textColor, setTextColor] = useState("#FFFFFF");

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

    let bgColor, txtColor;
    do {
      bgColor = generateRandomColor();
      txtColor = generateRandomColor();
    } while (getContrastRatio(bgColor, txtColor) < 4.5);

    setBackgroundColor(bgColor);
    setTextColor(txtColor);
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
    document.documentElement.style.backgroundColor = backgroundColor;
    document.body.style.backgroundColor = backgroundColor;
  }, [backgroundColor]);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor, color: textColor }}>
      <header className="sticky top-0 z-50">
        <nav className="flex flex-col md:flex-row items-center md:justify-between p-4 mx-4 space-y-4 md:space-y-0">
          <div className="relative w-[100px] h-[32px] mx-auto md:mx-0">
            <svg width="200" height="40" viewBox="0 0 500 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M57 91L41.4115 47.5L72.5885 47.5L57 91Z" fill={textColor} />
              <path d="M25 91L9.41154 47.5L40.5885 47.5L25 91Z" fill={textColor} />
            </svg>
          </div>
        </nav>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center p-6 md:p-12">
        <div className="text-center max-w-3xl mx-auto">
          <div className="flex justify-center mb-8">
            <Compass className="w-24 h-24 md:w-32 md:h-32" />
          </div>
          <h1 className="font-sundry-narrow-bold text-4xl md:text-6xl lg:text-8xl font-bold mb-6">page not found</h1>
          <p className="text-lg md:text-xl mb-12">the page you're looking for doesn't exist or has been moved</p>
          <Link href="/">
            <Button
              variant="default"
              size="lg"
              className="relative overflow-hidden group"
              style={{ backgroundColor: textColor, color: backgroundColor }}
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              <span className="relative z-10">go back home</span>
            </Button>
          </Link>
        </div>
      </main>

      <footer
        className="w-full h-[10vh] px-12 transition-colors duration-300 flex items-center"
        style={{ backgroundColor }}
      >
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center">
            <div className="flex flex-col items-start">
              <a href="https://antiwork.com/" target="_blank" rel="noopener noreferrer">
                <svg width="200" height="40" viewBox="0 0 500 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M57 91L41.4115 47.5L72.5885 47.5L57 91Z" fill={textColor} />
                  <path d="M25 91L9.41154 47.5L40.5885 47.5L25 91Z" fill={textColor} />
                </svg>
              </a>
            </div>
          </div>
          <div className="flex items-center">
            <Button
              onClick={generateRandomColors}
              className="transition-colors duration-300"
              iconOnly
              style={{ backgroundColor: textColor, color: backgroundColor }}
            >
              <Shuffle className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
