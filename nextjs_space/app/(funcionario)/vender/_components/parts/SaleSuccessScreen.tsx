"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Package, CreditCard, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

interface ConfettiProps {
  isActive?: boolean;
  duration?: number;
  autoPlay?: boolean;
  zIndex?: number;
  loop?: boolean;
}

const Confetti = ({
  isActive: externalIsActive,
  duration = 6000,
  autoPlay = false,
  zIndex = 50,
  loop = false,
}: ConfettiProps) => {
  const [isActive, setIsActive] = useState(autoPlay);

  useEffect(() => {
    if (externalIsActive !== undefined) {
      setIsActive(externalIsActive);
    }
  }, [externalIsActive]);

  useEffect(() => {
    let timeoutId: number;

    if (isActive && !loop && duration > 0) {
      timeoutId = window.setTimeout(() => {
        setIsActive(false);
      }, duration);
    }

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [isActive, duration, loop]);

  if (!isActive) return null;

  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-yellow-500",
    "bg-red-500",
    "bg-purple-500",
    "bg-pink-500",
  ];

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex }}
    >
      {[...Array(50)].map((_, i) => {
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        const randomX = Math.random() * 100;
        const randomDelay = Math.random() * 0.5;
        const randomDuration = 2 + Math.random() * 2;
        const randomRotation = Math.random() * 360;

        return (
          <motion.div
            key={i}
            className={`absolute w-3 h-3 ${randomColor} rounded-sm`}
            initial={{
              top: "-10%",
              left: `${randomX}%`,
              opacity: 1,
              rotate: 0,
            }}
            animate={{
              top: "110%",
              opacity: 0,
              rotate: randomRotation,
            }}
            transition={{
              duration: randomDuration,
              delay: randomDelay,
              ease: "easeIn",
              repeat: loop ? Infinity : 0,
            }}
          />
        );
      })}
    </div>
  );
};

const ShiningText = ({ text }: { text: string }) => {
  return (
    <motion.h1
      className="bg-[linear-gradient(110deg,#404040,35%,#fff,50%,#404040,75%,#404040)] bg-[length:200%_100%] bg-clip-text text-base font-regular text-transparent"
      initial={{ backgroundPosition: "200% 0" }}
      animate={{ backgroundPosition: "-200% 0" }}
      transition={{
        repeat: Infinity,
        duration: 2,
        ease: "linear",
      }}
    >
      {text}
    </motion.h1>
  );
};

interface SaleCompletedScreenProps {
  total: number;
  paymentMethod: string;
  onNewSale: () => void;
  valorRecebido?: number | null;
  troco?: number | null;
}

const SaleCompletedScreen = ({
  total,
  paymentMethod,
  onNewSale,
  valorRecebido,
  troco,
}: SaleCompletedScreenProps) => {
  const [orderId] = useState(() => Math.floor(Math.random() * 10000));
  const [showConfetti, setShowConfetti] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    setShowConfetti(true);
    setTimeout(() => setShowContent(true), 300);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onNewSale();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onNewSale]);

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-950 dark:via-emerald-950 dark:to-teal-950 flex items-center justify-center p-4 overflow-y-auto">
      <Confetti
        isActive={showConfetti}
        duration={5000}
        loop={false}
        zIndex={100}
      />

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-lg w-full my-auto"
      >
        <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden border border-green-100 dark:border-green-900/30">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-center relative overflow-hidden">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="inline-block"
            >
              <div className="bg-white dark:bg-zinc-900 rounded-full p-3 mb-4 inline-block">
                <CheckCircle2 className="w-12 h-12 text-green-500" />
              </div>
            </motion.div>

            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-2xl sm:text-3xl font-bold text-white mb-2"
            >
              Venda Concluída!
            </motion.h1>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-green-100 text-base sm:text-lg"
            >
              Parabéns pela sua venda!
            </motion.p>

            {/* Decorative elements */}
            <motion.div
              animate={{
                rotate: 360,
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: "linear",
              }}
              className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full"
            />
            <motion.div
              animate={{
                rotate: -360,
              }}
              transition={{
                duration: 15,
                repeat: Infinity,
                ease: "linear",
              }}
              className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full"
            />
          </div>

          {/* Content Section */}
          {showContent && (
            <div className="p-5 sm:p-6">
              {/* Order Details */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-zinc-800 dark:to-zinc-900 rounded-2xl p-4 mb-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full">
                      <Package className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Número do Pedido
                      </p>
                      <p className="text-base font-bold text-gray-800 dark:text-gray-100">
                        #VND-{orderId}
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right pl-10 sm:pl-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Total
                    </p>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                      R$ {total.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-zinc-700 pt-4">
                  <div className="flex items-center gap-3 mb-3">
                    <CreditCard className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Método de Pagamento
                      </p>
                      <p className="font-semibold text-sm text-gray-800 dark:text-gray-100 capitalize">
                        {paymentMethod}
                      </p>
                    </div>
                  </div>

                  {paymentMethod === "dinheiro" &&
                    valorRecebido !== null &&
                    valorRecebido !== undefined && (
                      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-dashed border-gray-200 dark:border-zinc-700">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Valor Recebido
                          </p>
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            R$ {valorRecebido.toFixed(2)}
                          </p>
                        </div>
                        {troco !== null && troco !== undefined && (
                          <div className="text-right">
                            <p className="text-xs text-blue-500 font-medium">
                              Troco
                            </p>
                            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                              R$ {troco.toFixed(2)}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                </div>
              </motion.div>

              {/* Success Messages */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="space-y-3 mb-6"
              >
                <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-900/30">
                  <Sparkles className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-sm text-green-900 dark:text-green-100">
                      Sucesso Absoluto!
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-300">
                      Venda registrada e estoque atualizado.
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Action Buttons */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.9 }}
                className="flex gap-3"
              >
                <button
                  onClick={onNewSale}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm sm:text-base"
                >
                  Nova Venda (ESC)
                </button>
              </motion.div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default SaleCompletedScreen;
