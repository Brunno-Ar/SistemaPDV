import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LotManagerDialog } from "@/app/estoque/_components/lot-manager-dialog";
import { toast } from "@/hooks/use-toast";

// Mock do hook use-toast
jest.mock("@/hooks/use-toast", () => ({
  toast: jest.fn(),
}));

// Mock do componente de botão complexo
jest.mock("@/components/ui/interactive-hover-button", () => ({
  InteractiveHoverButton: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

// Mock do fetch global
global.fetch = jest.fn();

const mockProduct = {
  id: "prod-123",
  nome: "Produto Teste",
};

describe("LotManagerDialog", () => {
  const mockOnOpenChange = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders correctly when open", async () => {
    // Mock do fetch inicial de lotes
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    render(
      <LotManagerDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        product={mockProduct}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText(`Lotes: ${mockProduct.nome}`)).toBeInTheDocument();

    // Botão aparece após loading
    expect(await screen.findByText(/Novo Lote/i)).toBeInTheDocument();
  });

  it("calculates unit price automatically", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    render(
      <LotManagerDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        product={mockProduct}
        onSuccess={mockOnSuccess}
      />
    );

    // Abrir form de novo lote
    const newLotBtn = await screen.findByText(/Novo Lote/i);
    fireEvent.click(newLotBtn);

    const qtdInput = screen.getByPlaceholderText("Qtd");
    // Para encontrar o input de total, podemos usar o Label
    const totalInput = screen.getByLabelText("Valor Total do Lote (R$)");

    fireEvent.change(qtdInput, { target: { value: "10" } });
    fireEvent.change(totalInput, { target: { value: "100" } });

    // Custo unitário deve ser 10.00
    await waitFor(() => {
      const unitInput = screen.getByDisplayValue("10.00");
      expect(unitInput).toBeInTheDocument();
    });
  });

  it("submits new lot successfully", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      // fetch inicial lotes
      ok: true,
      json: async () => [],
    });

    render(
      <LotManagerDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        product={mockProduct}
        onSuccess={mockOnSuccess}
      />
    );

    // Abrir form
    const newLotBtn = await screen.findByText(/Novo Lote/i);
    fireEvent.click(newLotBtn);

    // Preencher dados
    fireEvent.change(screen.getByPlaceholderText("Qtd"), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText("Data de Validade"), {
      target: { value: "2025-12-31" },
    });

    // Mock do POST de criação
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "new-lot" }),
    });

    // Mock do fetch subsequente de atualização de lotes
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    // Clicar em Salvar
    const saveBtn = screen.getByText("Salvar Lote");
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/lotes",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"quantidade":10'),
        })
      );
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Sucesso" })
      );
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it("validates required fields", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    render(
      <LotManagerDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        product={mockProduct}
        onSuccess={mockOnSuccess}
      />
    );

    const newLotBtn = await screen.findByText(/Novo Lote/i);
    fireEvent.click(newLotBtn);

    // Tentar salvar vazio
    const saveBtn = screen.getByText("Salvar Lote");
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: "destructive" })
      );
    });
  });
});
