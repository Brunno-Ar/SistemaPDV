"use client";

import { forwardRef } from "react";
import { CartItem, PaymentItem } from "@/hooks/use-pos";

interface ReceiptPrintProps {
  empresaNome: string;
  operadorNome: string;
  items: CartItem[];
  total: number;
  payments: PaymentItem[];
  valorRecebido?: number | null;
  troco?: number | null;
  orderId: number;
}

const PAYMENT_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "PIX",
  debito: "Débito",
  credito: "Crédito",
};

const ReceiptPrint = forwardRef<HTMLDivElement, ReceiptPrintProps>(
  (
    {
      empresaNome,
      operadorNome,
      items,
      total,
      payments,
      valorRecebido,
      troco,
      orderId,
    },
    ref,
  ) => {
    const now = new Date();
    const dataFormatada = now.toLocaleDateString("pt-BR");
    const horaFormatada = now.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(value);
    };

    return (
      <div ref={ref} className="receipt-print-area">
        <div className="receipt-header">
          <h1>{empresaNome || "Minha Loja"}</h1>
          <p className="receipt-subtitle">Recibo de Conferência</p>
          <p className="receipt-subtitle">
            {dataFormatada} às {horaFormatada}
          </p>
        </div>

        <div className="receipt-divider" />

        <div className="receipt-meta">
          <div className="receipt-meta-row">
            <span>Pedido:</span>
            <span>#VND-{orderId}</span>
          </div>
          <div className="receipt-meta-row">
            <span>Operador:</span>
            <span>{operadorNome || "—"}</span>
          </div>
        </div>

        <div className="receipt-divider-double" />

        <table className="receipt-items">
          <thead>
            <tr>
              <th className="receipt-th-left">Item</th>
              <th className="receipt-th-center">Qtd</th>
              <th className="receipt-th-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx}>
                <td className="receipt-td-left">
                  <div className="receipt-product-name">{item.product.nome}</div>
                  <div className="receipt-product-detail">
                    {formatCurrency(item.precoUnitarioNoMomento)} un.
                    {item.descontoAplicado > 0 && (
                      <span className="receipt-discount">
                        Desc: -{formatCurrency(item.descontoAplicado)}
                      </span>
                    )}
                  </div>
                </td>
                <td className="receipt-td-center">{item.quantidade}</td>
                <td className="receipt-td-right">
                  {formatCurrency(item.subtotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="receipt-divider" />

        <div className="receipt-totals">
          <div className="receipt-total-row">
            <span>Itens:</span>
            <span>{items.reduce((acc, i) => acc + i.quantidade, 0)}</span>
          </div>
          <div className="receipt-total-row receipt-total-main">
            <span>TOTAL:</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        <div className="receipt-divider" />

        <div className="receipt-payments">
          <p className="receipt-section-title">Pagamento</p>
          {payments.map((p, idx) => (
            <div key={idx} className="receipt-payment-row">
              <span>{PAYMENT_LABELS[p.method] || p.method}</span>
              <span>{formatCurrency(p.amount)}</span>
            </div>
          ))}
          {troco !== null && troco !== undefined && troco > 0 && (
            <>
              <div className="receipt-payment-row">
                <span>Recebido:</span>
                <span>{formatCurrency(valorRecebido || 0)}</span>
              </div>
              <div className="receipt-payment-row receipt-troco">
                <span>Troco:</span>
                <span>{formatCurrency(troco)}</span>
              </div>
            </>
          )}
        </div>

        <div className="receipt-divider-double" />

        <div className="receipt-footer">
          <p>Obrigado pela preferência!</p>
          <p className="receipt-footer-note">
            Documento não fiscal - Recibo de conferência
          </p>
          <p className="receipt-footer-note">flowpdv.com</p>
        </div>
      </div>
    );
  },
);

ReceiptPrint.displayName = "ReceiptPrint";

export default ReceiptPrint;
