import React from "react";
import { render, screen } from "@testing-library/react";
import { ProductCard } from "../../app/(funcionario)/vender/_components/parts/ProductCard";
import { Product } from "@/hooks/use-pos";
import "@testing-library/jest-dom";

// Mock do next/image para podermos inspecionar as props passadas
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ unoptimized, src, ...props }: any) => {
    return (
      <img
        src={src}
        data-test-unoptimized={unoptimized ? "true" : "false"}
        {...props}
      />
    );
  },
}));

describe("ProductCard Image URL Logic", () => {
  const mockProduct: Product = {
    id: "1",
    nome: "Teste Produto",
    precoVenda: 10.0,
    estoqueAtual: 5,
    sku: "SKU123",
    imagemUrl:
      "https://banco-imagens-sistema-pdv.s3.sa-east-1.amazonaws.com/folder/image.png",
  } as unknown as Product;

  const mockOnClick = jest.fn();

  it("deve remover o domínio AWS da URL da imagem", () => {
    render(
      <ProductCard
        product={mockProduct}
        onClick={mockOnClick}
        isLastAdded={false}
      />,
    );

    const img = screen.getByRole("img");
    // A URL esperada deve ser apenas o caminho relativo
    expect(img).toHaveAttribute("src", "/folder/image.png");
    // Verifica se unoptimized está sendo repassado
    expect(img).toHaveAttribute("data-test-unoptimized", "true");
  });

  it("deve manter a URL inalterada se não corresponder ao domínio AWS específico", () => {
    const otherProduct = {
      ...mockProduct,
      imagemUrl: "https://outrosite.com/imagem.png",
    } as unknown as Product;

    render(
      <ProductCard
        product={otherProduct}
        onClick={mockOnClick}
        isLastAdded={false}
      />,
    );

    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://outrosite.com/imagem.png");
  });

  it("deve lidar com imagemUrl vazia ou nula", () => {
    const noImageProduct = {
      ...mockProduct,
      imagemUrl: null,
    } as unknown as Product;

    render(
      <ProductCard
        product={noImageProduct}
        onClick={mockOnClick}
        isLastAdded={false}
      />,
    );

    // Quando não tem imagem, o componente renderiza um ícone Package, então não deve ter img
    const img = screen.queryByRole("img");
    expect(img).not.toBeInTheDocument();
  });
});
