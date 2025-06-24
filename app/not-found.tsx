"use client";

import { ArrowLeft, Home, Shuffle } from "lucide-react";
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
      <header className="sticky top-0 z-50" style={{ backgroundColor: "rgba(61, 12, 17, 0.8)" }}>
        <div className="backdrop-blur-sm border-b border-white/10">
          <nav className="flex items-center justify-between p-3 sm:p-4 mx-auto max-w-7xl">
            <Link href="/" className="transition-opacity hover:opacity-80 active:scale-95 transition-transform">
              <div className="relative w-20 h-6 sm:w-24 sm:h-7 md:w-[100px] md:h-[32px]">
                <Image
                  src="/logo-white.svg"
                  priority
                  alt="Helper"
                  width={100}
                  height={32}
                  className="absolute top-0 left-0 transition-opacity duration-300 ease-in-out opacity-100"
                />
              </div>
            </Link>
            <Link href="/">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 sm:gap-2 min-h-10 px-3 sm:px-4 active:scale-95 transition-transform text-white hover:bg-white/10"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">Back to Helper</span>
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-16">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 via-yellow-400/10 to-orange-400/20 rounded-full blur-2xl animate-pulse" />
              <Image
                src="/logo_icon.svg"
                alt="Helper"
                width={120}
                height={120}
                className="relative z-10 w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-orange-400 via-yellow-400 to-orange-400 bg-clip-text text-transparent">
                404
              </span>
            </h1>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-white">Page not found</h2>
            <p className="text-lg sm:text-xl text-white/80 max-w-md mx-auto leading-relaxed">
              The page you're looking for doesn't exist or has been moved to a different location.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:gap-4 justify-center items-stretch sm:items-center pt-8 px-4 sm:px-0 max-w-sm sm:max-w-none mx-auto sm:flex-row">
            <Link href="/" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto gap-2 group min-h-12 sm:min-h-11 text-base font-medium active:scale-95 transition-transform bg-white text-black hover:bg-white/90"
              >
                <Home className="w-5 h-5" />
                <span>Go home</span>
                <div className="absolute inset-0 w-[200%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-[100%] group-hover:translate-x-[100%]" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="lg"
              className="w-full sm:w-auto min-h-12 sm:min-h-11 text-base font-medium active:scale-95 transition-transform text-white border border-white/20 hover:bg-white/10"
              onClick={() => window.history.back()}
            >
              Go back
            </Button>
          </div>
        </div>

        <div className="mt-12 sm:mt-16 text-center px-4">
          <p className="text-sm sm:text-base text-white/60">
            Lost? Try our{" "}
            <Link href="/" className="text-orange-400 hover:underline font-medium active:opacity-70 transition-opacity">
              homepage
            </Link>{" "}
            or{" "}
            <Link
              href="/search"
              className="text-orange-400 hover:underline font-medium active:opacity-70 transition-opacity"
            >
              search
            </Link>
          </p>
        </div>
      </main>

      <footer
        className="w-full px-4 sm:px-6 lg:px-12 py-4 sm:py-5 transition-colors duration-300 flex items-center border-t border-white/10"
        style={{ backgroundColor: footerBgColor }}
      >
        <div className="flex justify-between items-center w-full max-w-7xl mx-auto">
          <div className="flex items-center">
            <Link href="/" className="transition-opacity hover:opacity-80 active:scale-95 transition-transform">
              <Image
                src="/logo.svg"
                alt="Helper"
                width={100}
                height={32}
                className="w-16 h-5 sm:w-20 sm:h-6 md:w-24 md:h-8 lg:w-[100px] lg:h-[32px]"
              />
            </Link>
          </div>
          <div className="flex items-center">
            <Button
              onClick={generateRandomColors}
              className="transition-colors duration-300 min-h-10 min-w-10 sm:min-h-11 sm:min-w-11 active:scale-95 transition-transform"
              variant="ghost"
              size="sm"
              style={{ backgroundColor: footerTextColor, color: footerBgColor }}
            >
              <Shuffle className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
