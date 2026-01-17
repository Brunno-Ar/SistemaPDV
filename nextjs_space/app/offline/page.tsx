import { WifiOff } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center dark:bg-zinc-900">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
        <WifiOff className="h-10 w-10 text-red-600 dark:text-red-500" />
      </div>
      <h1 className="mt-6 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
        Você está offline
      </h1>
      <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
        Parece que sua conexão com a internet caiu ou está instável.
        <br />
        Verifique sua conexão e tente novamente.
      </p>
      <div className="mt-8">
        <Button onClick={() => window.location.reload()} variant="default">
          Tentar novamente
        </Button>
      </div>
    </div>
  );
}
