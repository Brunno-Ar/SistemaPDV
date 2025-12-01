"use client";

import { motion } from "framer-motion";
import {
  Atom,
  Code2,
  Database,
  Globe,
  Layers,
  Cpu,
  Server,
  Zap
} from "lucide-react";

const LOGOS = [
  { icon: Atom, name: "Atom" },
  { icon: Code2, name: "Code" },
  { icon: Database, name: "Data" },
  { icon: Globe, name: "Global" },
  { icon: Layers, name: "Stack" },
  { icon: Cpu, name: "Tech" },
  { icon: Server, name: "Cloud" },
  { icon: Zap, name: "Fast" },
];

export function MarqueeSection() {
  return (
    <section className="py-12 bg-white border-y border-zinc-100 overflow-hidden">
      <div className="flex w-full">
        <motion.div
          initial={{ x: 0 }}
          animate={{ x: "-50%" }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
          className="flex flex-shrink-0 gap-16 md:gap-32 items-center px-8 md:px-16"
        >
          {[...LOGOS, ...LOGOS, ...LOGOS].map((logo, index) => (
            <div
              key={index}
              className="flex items-center gap-2 group opacity-40 hover:opacity-100 transition-opacity duration-300 grayscale hover:grayscale-0"
            >
              <logo.icon className="w-8 h-8 md:w-10 md:h-10 text-zinc-800 group-hover:text-[#137fec] transition-colors" />
              <span className="text-lg font-semibold text-zinc-800 hidden md:block">
                {logo.name}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
