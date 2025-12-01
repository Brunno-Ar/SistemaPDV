"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useMotionValueEvent, useScroll, motion } from "framer-motion";
import { Store } from "lucide-react";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";

export function Navbar() {
  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 50);
  });

  return (
    <motion.header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/80 backdrop-blur-md border-b border-zinc-200 py-3 shadow-sm"
          : "bg-transparent py-5"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[#137fec] to-blue-500 shadow-lg transition-transform group-hover:scale-105">
              <Store className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-zinc-900">
              FlowPDV
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="#features"
              className="text-sm font-medium text-zinc-600 hover:text-[#137fec] transition-colors"
            >
              Funcionalidades
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-zinc-600 hover:text-[#137fec] transition-colors"
            >
              Entrar
            </Link>
            <Link href="/signup">
              <InteractiveHoverButton className="w-32 bg-[#137fec] border-[#137fec] text-white hover:bg-[#137fec]/90">
                Começar
              </InteractiveHoverButton>
            </Link>
          </nav>

          {/* Mobile Menu Button (Placeholder for now) */}
          <div className="md:hidden">
            <Link href="/signup">
               <span className="text-sm font-semibold text-[#137fec]">Começar</span>
            </Link>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
