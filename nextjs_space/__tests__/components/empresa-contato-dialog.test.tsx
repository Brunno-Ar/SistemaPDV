import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EmpresaContatoDialog } from "@/app/master/empresas/_components/parts/EmpresaContatoDialog";

// Mock do hook use-toast
jest.mock("@/hooks/use-toast", () => ({
  toast: jest.fn(),
}));

// Mock do fetch global
global.fetch = jest.fn();

describe("EmpresaContatoDialog (interface)", () => {
  const empresa = {
    id: "emp-1",
    nome: "Adega FreeStyle Drinks",
    cpfCnpj: "11.222.333/0001-81",
    telefone: "(11) 3333-4444",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        message: "Dados cadastrais atualizados com sucesso",
        empresa: {
          id: "emp-1",
          nome: "Adega FreeStyle Drinks",
          cpfCnpj: "11222333000181",
          telefone: "11987654321",
        },
      }),
    });
  });

  it("renderiza o diálogo com os dados da empresa", () => {
    render(
      <EmpresaContatoDialog
        open={true}
        onOpenChange={() => {}}
        empresa={empresa}
        onAtualizar={jest.fn()}
      />
    );

    expect(screen.getByText("Editar Contato da Empresa")).toBeInTheDocument();
    expect(screen.getByLabelText(/Documento \(CPF \/ CNPJ\)/)).toHaveValue(
      "11.222.333/0001-81"
    );
    expect(screen.getByLabelText(/Telefone \/ WhatsApp/)).toHaveValue(
      "(11) 3333-4444"
    );
  });

  it("submete CPF e telefone e chama PATCH /api/master/empresas", async () => {
    render(
      <EmpresaContatoDialog
        open={true}
        onOpenChange={() => {}}
        empresa={empresa}
        onAtualizar={jest.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText(/Documento \(CPF \/ CNPJ\)/), {
      target: { value: "529.982.247-25" },
    });
    fireEvent.change(screen.getByLabelText(/Telefone \/ WhatsApp/), {
      target: { value: "(11) 98765-4321" },
    });

    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/master/empresas",
        expect.objectContaining({
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            empresaId: "emp-1",
            cpfCnpj: "52998224725",
            telefone: "11987654321",
          }),
        })
      );
    });
  });

  it("exibe erro de validação para CPF inválido sem chamar a API", async () => {
    render(
      <EmpresaContatoDialog
        open={true}
        onOpenChange={() => {}}
        empresa={empresa}
        onAtualizar={jest.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText(/Documento \(CPF \/ CNPJ\)/), {
      target: { value: "111.111.111-11" },
    });

    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("CPF inválido");
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("exibe erro de validação para telefone com tamanho inválido sem chamar a API", async () => {
    render(
      <EmpresaContatoDialog
        open={true}
        onOpenChange={() => {}}
        empresa={empresa}
        onAtualizar={jest.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText(/Telefone \/ WhatsApp/), {
      target: { value: "119999" },
    });

    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Telefone deve ter 10 ou 11 dígitos"
      );
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("chama onAtualizar após sucesso", async () => {
    const onAtualizar = jest.fn();
    render(
      <EmpresaContatoDialog
        open={true}
        onOpenChange={() => {}}
        empresa={empresa}
        onAtualizar={onAtualizar}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => {
      expect(onAtualizar).toHaveBeenCalled();
    });
  });
});
