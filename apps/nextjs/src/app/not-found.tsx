"use client";

import { ArrowLeft, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
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

      <main className="flex-grow flex flex-col items-center justify-center p-6 md:p-12">
        <div className="text-center max-w-3xl mx-auto">
          <div className="flex justify-center mb-8">
            <div className="bg-[#C2D44B] rounded-full p-6">
              <MapPin className="w-24 h-24 md:w-32 md:h-32 text-[#3D0C11]" />
            </div>
          </div>
          <h1 className="font-sundry-narrow-bold text-4xl md:text-6xl lg:text-8xl font-bold mb-6 text-white">
            Page not found
          </h1>
          <p className="text-lg md:text-xl mb-12 text-white">
            The page you're looking for doesn't exist or has been moved
          </p>
          <Link href="/">
            <Button variant="bright" size="lg" className="relative overflow-hidden group">
              <ArrowLeft className="mr-2 h-5 w-5" />
              <span className="relative z-10">Go back home</span>
              <div className="absolute inset-0 w-[200%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[100%] group-hover:translate-x-[100%]" />
            </Button>
          </Link>
        </div>
      </main>

      <footer className="w-full h-[10vh] px-12 bg-[#C2D44B] flex items-center">
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
            <p className="text-sm text-[#3D0C11]">© {new Date().getFullYear()} Helper.ai</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
