"use client";

import { useState, useRef } from "react";
import { Copy, RefreshCw, Check, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateMemberLinkCode } from "../_actions/member-links";

interface LinkCopierProps {
  initialCode: string;
}

export function MemberLinkCopier({ initialCode }: LinkCopierProps) {
  const [codigoURL, setCodigoURL] = useState(initialCode);
  const [isCopied, setIsCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Ex: "https://seulink.com/signup?ref=loja-do-joao"
  const fullLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/signup?ref=${codigoURL}`
      : `https://meupdv.com/signup?ref=${codigoURL}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(fullLink);
    setIsCopied(true);
    toast.success("Link copiado para a área de transferência!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  async function handleSaveCustomCode() {
    setIsSaving(true);
    const result = await updateMemberLinkCode(codigoURL);
    setIsSaving(false);

    if (result && result.error) {
      toast.error(result.error);
      return;
    }

    if (result && result.success) {
      setIsEditing(false);
      toast.success("Sufixo atualizado com sucesso!");
    }
  }

  return (
    <div className="flex flex-col gap-4 max-w-xl">
      <div className="flex flex-col gap-2 relative group">
        <Label>Seu Link Exclusivo</Label>

        {isEditing ? (
          <div className="flex gap-2 items-center">
            <span className="text-sm font-medium text-gray-400 shrink-0">
              .../signup?ref=
            </span>
            <Input
              value={codigoURL}
              onChange={(e) => setCodigoURL(e.target.value)}
              className="flex-1"
              placeholder="ex: loja-do-joao"
            />
            <Button
              onClick={handleSaveCustomCode}
              disabled={isSaving || codigoURL === initialCode}
              size="sm"
            >
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCodigoURL(initialCode);
                setIsEditing(false);
              }}
            >
              Cancelar
            </Button>
          </div>
        ) : (
          <div className="flex items-center">
            <input
              type="text"
              readOnly
              value={fullLink}
              className="flex h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-neutral-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-950 dark:ring-offset-neutral-950 dark:placeholder:text-neutral-400 focus-visible:outline-none dark:text-neutral-300 rounded-r-none outline-none focus:ring-0 focus:outline-none border-r-0"
              style={{ boxShadow: "none" }}
            />
            <Button
              onClick={copyToClipboard}
              className="rounded-l-none h-10 px-4 bg-primary hover:bg-primary/90 text-primary-foreground min-w-[120px]"
            >
              {isCopied ? (
                <span className="flex items-center gap-2">
                  <Check className="h-4 w-4" /> Copiado
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Copy className="h-4 w-4" /> Copiar Link
                </span>
              )}
            </Button>
          </div>
        )}
      </div>

      {!isEditing && (
        <button
          onClick={() => setIsEditing(true)}
          className="text-xs text-blue-500 hover:text-blue-600 text-left font-medium w-fit transition-colors"
        >
          Personalizar o final do link (ex: /signup?ref=sua-loja)
        </button>
      )}

      <div className="mt-4 flex flex-col gap-3 p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/40 rounded-lg text-sm text-orange-800 dark:text-orange-300">
        <div className="flex items-center gap-2 font-semibold">
          <CheckCircle2 className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          Como Funciona as Indicações?
        </div>
        <ol className="list-decimal list-inside space-y-1 text-orange-700 dark:text-orange-400 pl-1">
          <li>Copie seu link e envie para outras lojas ou conhecidos.</li>
          <li>
            Quando a pessoa clicar no link, ela cairá na página de registro e
            esse link fica ancorado a ela.
          </li>
          <li>
            Ela fará o Trial Grátis de testes, conhecendo nossa ferramenta.
          </li>
          <li>
            Assim que ela assinar efetivamente um dos planos e o pagamento
            compensar, <b>você ganha 1 Mês totalmente Grátis</b> na sua
            mensalidade atual!
          </li>
        </ol>
      </div>
    </div>
  );
}
