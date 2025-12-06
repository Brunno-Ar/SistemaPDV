"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { motion, useAnimation } from "framer-motion";

interface LoadingProps {
  className?: string;
}

// ============================================
// CLASSIC LOADER - Spinner com cores do sistema
// ============================================

/**
 * Spinner clássico animado com as cores do sistema
 * Use para indicar loading em botões, inputs, ou áreas pequenas
 */
export function ClassicLoader({ className }: LoadingProps) {
  return (
    <div
      className={cn(
        "flex h-10 w-10 animate-spin items-center justify-center rounded-full border-4 border-primary border-t-transparent",
        className
      )}
    />
  );
}

/**
 * Alias para ClassicLoader
 */
export const LoadingSpinner = ClassicLoader;

/**
 * Loading centralizado para páginas inteiras
 */
export function PageLoading({ className }: LoadingProps) {
  return (
    <div
      className={cn(
        "flex justify-center items-center min-h-[400px]",
        className
      )}
    >
      <ClassicLoader className="h-12 w-12" />
    </div>
  );
}

// ============================================
// ANIMATED LOADING SKELETON - Skeleton com animação
// ============================================

interface GridConfig {
  numCards: number;
  cols: number;
  xBase: number;
  yBase: number;
  xStep: number;
  yStep: number;
}

/**
 * Skeleton animado com ícone de busca que percorre os cards
 * Use para telas de listagem (produtos, relatórios, etc)
 */
export function AnimatedLoadingSkeleton({ className }: LoadingProps) {
  const [windowWidth, setWindowWidth] = useState(0);
  const controls = useAnimation();

  const getGridConfig = (width: number): GridConfig => {
    const numCards = 6;
    const cols = width >= 1024 ? 3 : width >= 640 ? 2 : 1;
    return {
      numCards,
      cols,
      xBase: 40,
      yBase: 60,
      xStep: 210,
      yStep: 230,
    };
  };

  const generateSearchPath = (config: GridConfig) => {
    const { numCards, cols, xBase, yBase, xStep, yStep } = config;
    const rows = Math.ceil(numCards / cols);
    const allPositions = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (row * cols + col < numCards) {
          allPositions.push({
            x: xBase + col * xStep,
            y: yBase + row * yStep,
          });
        }
      }
    }

    const numRandomCards = 4;
    const shuffledPositions = allPositions
      .sort(() => Math.random() - 0.5)
      .slice(0, numRandomCards);

    shuffledPositions.push(shuffledPositions[0]);

    return {
      x: shuffledPositions.map((pos) => pos.x),
      y: shuffledPositions.map((pos) => pos.y),
      scale: Array(shuffledPositions.length).fill(1.2),
      transition: {
        duration: shuffledPositions.length * 2,
        repeat: Infinity,
        ease: [0.4, 0, 0.2, 1],
        times: shuffledPositions.map(
          (_, i) => i / (shuffledPositions.length - 1)
        ),
      },
    };
  };

  useEffect(() => {
    setWindowWidth(window.innerWidth);
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const config = getGridConfig(windowWidth);
    controls.start(generateSearchPath(config));
  }, [windowWidth, controls]);

  const frameVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } },
  };

  const cardVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: (i: number) => ({
      y: 0,
      opacity: 1,
      transition: { delay: i * 0.1, duration: 0.4 },
    }),
  };

  const glowVariants = {
    animate: {
      boxShadow: [
        "0 0 20px rgba(var(--primary-rgb), 0.2)",
        "0 0 35px rgba(var(--primary-rgb), 0.4)",
        "0 0 20px rgba(var(--primary-rgb), 0.2)",
      ],
      scale: [1, 1.1, 1],
      transition: {
        duration: 1,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  const config = getGridConfig(windowWidth);

  return (
    <motion.div
      className={cn(
        "w-full max-w-4xl mx-auto p-6 bg-white dark:bg-zinc-900 rounded-xl shadow-lg",
        className
      )}
      variants={frameVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-zinc-800 dark:to-zinc-900 p-8">
        {/* Ícone de busca animado */}
        <motion.div
          className="absolute z-10 pointer-events-none"
          animate={controls}
          style={{ left: 24, top: 24 }}
        >
          <motion.div
            className="bg-primary/20 p-3 rounded-full backdrop-blur-sm"
            variants={glowVariants}
            animate="animate"
          >
            <svg
              className="w-6 h-6 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </motion.div>
        </motion.div>

        {/* Grid de cards animados */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(config.numCards)].map((_, i) => (
            <motion.div
              key={i}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              custom={i}
              whileHover={{ scale: 1.02 }}
              className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-4"
            >
              <motion.div
                className="h-32 bg-gray-200 dark:bg-zinc-700 rounded-md mb-3"
                animate={{
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <motion.div
                className="h-3 w-3/4 bg-gray-200 dark:bg-zinc-700 rounded mb-2"
                animate={{
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
              />
              <motion.div
                className="h-3 w-1/2 bg-gray-200 dark:bg-zinc-700 rounded"
                animate={{
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// SKELETON CARDS - Para dashboards
// ============================================

/**
 * Skeleton para cards de dashboard com spinner
 */
export function DashboardCardSkeleton() {
  return (
    <Card className="bg-white dark:bg-zinc-900 border-none shadow-sm rounded-xl">
      <div className="flex items-center justify-between p-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-8 w-[120px]" />
          <Skeleton className="h-3 w-[80px]" />
        </div>
        <div className="flex items-center justify-center">
          <ClassicLoader className="h-8 w-8" />
        </div>
      </div>
    </Card>
  );
}

/**
 * Skeleton para grid de dashboard (3 cards)
 */
export function DashboardGridSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <DashboardCardSkeleton />
      <DashboardCardSkeleton />
      <DashboardCardSkeleton />
    </div>
  );
}

// ============================================
// SKELETON TABELAS
// ============================================

/**
 * Skeleton para tabelas com spinner no header
 */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {/* Header com spinner */}
      <div className="flex items-center gap-4 py-3 border-b dark:border-zinc-700">
        <ClassicLoader className="h-5 w-5" />
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Carregando dados...
        </span>
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-3 items-center animate-pulse">
          <Skeleton className="h-4 w-[150px]" />
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-4 w-[80px]" />
          <Skeleton className="h-8 w-[120px] ml-auto" />
        </div>
      ))}
    </div>
  );
}

// ============================================
// SKELETON PRODUTOS
// ============================================

/**
 * Skeleton para lista de produtos
 */
export function ProductListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {/* Header com spinner */}
      <div className="flex items-center gap-3">
        <ClassicLoader className="h-6 w-6" />
        <span className="text-gray-500 dark:text-gray-400">
          Carregando produtos...
        </span>
      </div>

      {/* Grid de produtos */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i} className="overflow-hidden animate-pulse">
            <div className="h-32 bg-gray-200 dark:bg-zinc-700" />
            <CardContent className="p-3 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-5 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============================================
// SKELETON FORMULÁRIO
// ============================================

/**
 * Skeleton para formulários
 */
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2 animate-pulse">
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <div className="flex items-center gap-2 mt-4">
        <ClassicLoader className="h-5 w-5" />
        <Skeleton className="h-10 w-[120px]" />
      </div>
    </div>
  );
}

// ============================================
// SKELETON CHARTS
// ============================================

/**
 * Skeleton para charts com spinner
 */
export function ChartSkeleton({ className }: LoadingProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-3">
        <ClassicLoader className="h-5 w-5" />
        <Skeleton className="h-4 w-[150px]" />
      </div>
      <div className="relative">
        <Skeleton className="h-[200px] w-full rounded-lg" />
        <div className="absolute inset-0 flex items-center justify-center">
          <ClassicLoader className="h-8 w-8" />
        </div>
      </div>
    </div>
  );
}

// ============================================
// LOADING OVERLAY
// ============================================

/**
 * Loading overlay para ações em progresso
 * Cobre toda a tela com um spinner centralizado
 */
export function LoadingOverlay({
  message = "Processando...",
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm",
        className
      )}
    >
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl border border-gray-200 dark:border-zinc-800">
        <ClassicLoader className="h-12 w-12" />
        <p className="text-gray-700 dark:text-gray-300 font-medium text-lg">
          {message}
        </p>
      </div>
    </div>
  );
}

// ============================================
// LOADING INLINE
// ============================================

/**
 * Loading inline pequeno para botões
 */
export function ButtonLoading({ className }: LoadingProps) {
  return <ClassicLoader className={cn("h-4 w-4 border-2", className)} />;
}

/**
 * Loading com texto
 */
export function LoadingWithText({
  text = "Carregando...",
  className,
}: {
  text?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <ClassicLoader className="h-5 w-5" />
      <span className="text-gray-600 dark:text-gray-400">{text}</span>
    </div>
  );
}
