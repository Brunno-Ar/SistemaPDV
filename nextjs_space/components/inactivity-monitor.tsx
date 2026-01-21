"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useLogout } from "@/hooks/use-logout";

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutos
const WARNING_TIME = 2 * 60 * 1000; // 2 minutos antes de deslogar
const CHECK_INTERVAL = 60 * 1000; // Verificar a cada 1 minuto

export function InactivityMonitor() {
  const { data: session } = useSession() || {};
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

  const { performLogoutWithClosing, isLoggingOut } = useLogout();

  // Ref para evitar re-renders desnecessários e implementar debounce
  const lastActivityRef = useRef(Date.now());
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Atualizar última atividade (com debounce de 5 segundos)
  const updateActivity = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;

    // Debounce: só atualiza o state a cada 5 segundos para evitar re-renders
    if (debounceTimerRef.current) return;

    debounceTimerRef.current = setTimeout(() => {
      setLastActivity(lastActivityRef.current);
      setShowWarning(false);
      debounceTimerRef.current = null;
    }, 5000);
  }, []);

  // Eventos que indicam atividade do usuário
  useEffect(() => {
    if (!session) return;

    const events = ["mousedown", "keydown", "scroll", "touchstart", "click"];

    events.forEach((event) => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, updateActivity);
      });
      // Limpar debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [session, updateActivity]);

  // Verificar inatividade periodicamente
  useEffect(() => {
    if (!session) return;

    const checkInactivity = () => {
      const now = Date.now();
      const timeSinceActivity = now - lastActivity;
      const timeUntilLogout = INACTIVITY_TIMEOUT - timeSinceActivity;

      // Se passou do tempo de inatividade, deslogar (fecha caixa automaticamente por segurança)
      if (timeSinceActivity >= INACTIVITY_TIMEOUT) {
        performLogoutWithClosing("/login?reason=inactivity");
        return;
      }

      // Se está próximo do timeout, mostrar aviso
      if (timeUntilLogout <= WARNING_TIME && !showWarning) {
        setShowWarning(true);
      }

      // Atualizar tempo restante
      if (showWarning) {
        setTimeRemaining(Math.ceil(timeUntilLogout / 1000));
      }
    };

    const interval = setInterval(checkInactivity, CHECK_INTERVAL);
    checkInactivity(); // Verificar imediatamente

    return () => clearInterval(interval);
  }, [session, lastActivity, showWarning, performLogoutWithClosing]);

  // Continuar sessão
  const handleContinue = () => {
    updateActivity();
  };

  // Fazer logout manualmente (fecha caixa por segurança)
  const handleLogout = () => {
    performLogoutWithClosing("/login");
  };

  if (!session) return null;

  return (
    <Dialog open={showWarning} onOpenChange={setShowWarning}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            Sessão Inativa
          </DialogTitle>
          <DialogDescription className="space-y-3 pt-4">
            <p>
              Sua sessão está inativa há algum tempo e será encerrada
              automaticamente por segurança.
            </p>
            <p className="text-lg font-semibold text-gray-900">
              Tempo restante:{" "}
              <span className="text-red-600">
                {Math.floor(timeRemaining / 60)}:
                {(timeRemaining % 60).toString().padStart(2, "0")}
              </span>
            </p>
            <p className="text-sm text-gray-600">
              Clique em &quot;Continuar&quot; se ainda estiver usando o sistema.
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex-1 sm:flex-none"
          >
            {isLoggingOut ? "Saindo..." : "Sair Agora"}
          </Button>
          <Button
            onClick={handleContinue}
            className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700"
          >
            Continuar Sessão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
