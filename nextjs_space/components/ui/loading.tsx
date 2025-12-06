"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingProps {
  className?: string;
}

/**
 * Loading Spinner simples
 */
export function LoadingSpinner({ className }: LoadingProps) {
  return (
    <Loader2 className={cn("h-6 w-6 animate-spin text-primary", className)} />
  );
}

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
      <LoadingSpinner className="h-8 w-8" />
    </div>
  );
}

/**
 * Skeleton para cards de dashboard
 */
export function DashboardCardSkeleton() {
  return (
    <Card className="bg-white dark:bg-zinc-900 border-none shadow-sm rounded-xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-[100px]" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-[120px] mb-2" />
        <Skeleton className="h-3 w-[80px]" />
      </CardContent>
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

/**
 * Skeleton para tabelas
 */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 py-3 border-b">
        <Skeleton className="h-4 w-[150px]" />
        <Skeleton className="h-4 w-[100px]" />
        <Skeleton className="h-4 w-[80px]" />
        <Skeleton className="h-4 w-[120px] ml-auto" />
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-3 items-center">
          <Skeleton className="h-4 w-[150px]" />
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-4 w-[80px]" />
          <Skeleton className="h-8 w-[120px] ml-auto" />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton para lista de produtos
 */
export function ProductListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <Skeleton className="h-32 w-full" />
          <CardContent className="p-3 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Skeleton para formulários
 */
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <Skeleton className="h-10 w-[120px] mt-4" />
    </div>
  );
}

/**
 * Skeleton para charts
 */
export function ChartSkeleton({ className }: LoadingProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <Skeleton className="h-4 w-[150px]" />
      <Skeleton className="h-[200px] w-full rounded-lg" />
    </div>
  );
}

/**
 * Loading overlay para ações em progresso
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
        "fixed inset-0 bg-black/50 flex items-center justify-center z-50",
        className
      )}
    >
      <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 flex flex-col items-center gap-4 shadow-xl">
        <LoadingSpinner className="h-8 w-8" />
        <p className="text-gray-700 dark:text-gray-300 font-medium">
          {message}
        </p>
      </div>
    </div>
  );
}
