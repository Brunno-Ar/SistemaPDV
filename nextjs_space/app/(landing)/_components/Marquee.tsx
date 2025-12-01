"use client";

import { motion } from "framer-motion";

const COMPANIES = [
  "TechRetail",
  "ModaFlow",
  "SuperMarket X",
  "Café & Co",
  "BurgerHouse",
  "ElectroStore",
  "BeautySpace",
  "PetLife",
];

export const Marquee = () => {
  return (
    <section className="py-10 bg-white dark:bg-zinc-950 border-y border-gray-300 dark:border-zinc-900 overflow-hidden">
      <div className="container mx-auto px-6 mb-6 text-center">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider">
          Confiança de mais de 500+ empresas
        </p>
      </div>

      <div className="relative flex overflow-x-hidden group">
        <motion.div
          className="flex whitespace-nowrap gap-16 py-4"
          animate={{ x: "-50%" }}
          transition={{
            repeat: Infinity,
            ease: "linear",
            duration: 20,
          }}
        >
          {[...COMPANIES, ...COMPANIES, ...COMPANIES].map((company, idx) => (
            <div
              key={`${company}-${idx}`}
              className="text-2xl font-bold text-gray-400 dark:text-zinc-700 flex items-center gap-2"
            >
              {/* Placeholder Logo Icon */}
              <div className="w-8 h-8 rounded bg-gray-300 dark:bg-zinc-800"></div>
              {company}
            </div>
          ))}
        </motion.div>

        {/* Gradient Fade Edges */}
        <div className="absolute top-0 left-0 w-32 h-full bg-gradient-to-r from-white dark:from-zinc-950 to-transparent z-10"></div>
        <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-white dark:from-zinc-950 to-transparent z-10"></div>
      </div>
    </section>
  );
};
