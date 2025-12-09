import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Sparkles } from "@/components/Sparkles";
import { ThemeToggle } from "@/components/theme-toggle";
import { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
  sideContent?: ReactNode;
  showThemeToggle?: boolean;
  formPosition?: "left" | "right";
}

export function AuthLayout({
  children,
  sideContent,
  showThemeToggle = true,
  formPosition = "left", // Default to left to match DOM order, but we can override
}: AuthLayoutProps) {
  return (
    <div
      className={`min-h-screen w-full flex bg-white dark:bg-zinc-950 text-gray-900 dark:text-white overflow-hidden ${
        formPosition === "right" ? "lg:flex-row-reverse" : ""
      }`}
    >
      {/* Mobile Logo */}
      <div className="absolute top-8 left-8 lg:hidden z-20">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
            <span className="text-white font-bold text-xl">F</span>
          </div>
          <span className="text-xl font-bold tracking-tight">Flow PDV</span>
        </Link>
      </div>

      {/* Mobile Theme Toggle */}
      {showThemeToggle && (
        <div className="absolute top-8 right-8 lg:hidden z-20">
          <ThemeToggle />
        </div>
      )}

      {/* Form Side */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 lg:p-24 relative z-10 overflow-y-auto max-h-screen">
        {children}
      </div>

      {/* Visual Side */}
      <div className="hidden lg:flex w-1/2 bg-white dark:bg-black relative overflow-hidden items-center justify-center">
        <div className="absolute top-8 left-8 z-20">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="text-white font-bold text-xl">F</span>
            </div>
            <span className="text-xl font-bold tracking-tight">Flow PDV</span>
          </Link>
        </div>
        {showThemeToggle && (
          <div className="absolute top-8 right-8 z-20">
            <ThemeToggle />
          </div>
        )}
        <div className="absolute inset-0 z-0">
          <Sparkles />
        </div>

        <div className="relative z-10 max-w-lg text-center p-12 pointer-events-none">
          {sideContent ? (
            sideContent
          ) : (
            <>
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.8 }}
              >
                <h2 className="text-5xl font-bold mb-6 text-gray-900 dark:text-white tracking-tight">
                  Gerencie seu varejo com{" "}
                  <span className="text-blue-600">inteligência.</span>
                </h2>
                <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
                  Junte-se a milhares de lojistas que transformaram suas
                  operações com o Flow PDV.
                </p>
              </motion.div>

              {/* Abstract UI Elements */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, duration: 0.8 }}
                className="mt-12 relative h-64 w-full bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden p-6"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                    <ArrowRight className="rotate-[-45deg]" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Receita Total
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      R$ 124.500,00
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="h-2 bg-gray-100 dark:bg-zinc-800 rounded-full w-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "70%" }}
                      transition={{ delay: 0.8, duration: 1 }}
                      className="h-full bg-blue-600 rounded-full"
                    />
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-zinc-800 rounded-full w-3/4 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "50%" }}
                      transition={{ delay: 1, duration: 1 }}
                      className="h-full bg-purple-500 rounded-full"
                    />
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-zinc-800 rounded-full w-1/2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "80%" }}
                      transition={{ delay: 1.2, duration: 1 }}
                      className="h-full bg-green-500 rounded-full"
                    />
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
