"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Joyride, { CallBackProps, STATUS, Step, ACTIONS } from "react-joyride";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { TOUR_RESET_EVENT } from "@/lib/events";

const TOUR_COMPLETED_KEY = "flowpdv_tour_completed";
const TOUR_SHOWN_THIS_SESSION_KEY = "flowpdv_tour_shown_session";

// ============================================================
// DEFINIÇÃO DOS STEPS POR ROLE
// ============================================================

function getAdminSteps(): Step[] {
  return [
    // ── BOAS-VINDAS ──
    {
      target: "body",
      content: (
        <div className="text-center space-y-3">
          <div className="text-4xl">🚀</div>
          <h3 className="font-bold text-xl text-blue-600">
            Bem-vindo ao FlowPDV!
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Vamos te guiar por <strong>todas as funcionalidades</strong> do
            sistema. Este tour completo vai te mostrar como gerenciar sua loja
            do início ao fim.
          </p>
          <p className="text-xs text-gray-400 mt-2">
            ⏱️ Duração estimada: 3 minutos
          </p>
        </div>
      ),
      placement: "center",
      disableBeacon: true,
    },

    // ── DASHBOARD ──
    {
      target: "body",
      content: (
        <div className="space-y-3">
          <h3 className="font-bold text-lg text-blue-600">
            📊 Dashboard — Seu Painel de Controle
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Esta é a <strong>primeira tela</strong> que você vê ao entrar. Aqui
            estão seus principais indicadores:
          </p>
          <ul className="text-sm text-gray-600 space-y-1 list-disc pl-4">
            <li>
              <strong>Faturamento do dia</strong> — quanto sua loja vendeu hoje
            </li>
            <li>
              <strong>Vendas do dia</strong> — quantas vendas foram realizadas
            </li>
            <li>
              <strong>Ticket médio</strong> — valor médio por venda
            </li>
            <li>
              <strong>Alertas de estoque</strong> — produtos com estoque baixo
              ou lotes vencendo
            </li>
          </ul>
          <p className="text-xs text-blue-500 font-medium mt-2">
            💡 Dica: O Dashboard atualiza automaticamente a cada acesso.
          </p>
        </div>
      ),
      placement: "center",
      disableBeacon: true,
    },

    // ── CAIXA ──
    {
      target: "#menu-caixa",
      content: (
        <div className="space-y-3">
          <h3 className="font-bold text-lg text-blue-600">
            💰 Caixa — Controle Financeiro Diário
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            O módulo de <strong>Caixa</strong> é onde você controla a entrada e
            saída de dinheiro da sua loja.
          </p>
          <ul className="text-sm text-gray-600 space-y-1 list-disc pl-4">
            <li>
              <strong>Abrir Caixa</strong> — defina o valor inicial (troco)
            </li>
            <li>
              <strong>Sangrias e Reforços</strong> — registre retiradas e
              entradas manuais
            </li>
            <li>
              <strong>Fechar Caixa</strong> — compare o esperado com o real
            </li>
            <li>
              <strong>Visão Geral</strong> — veja todos os caixas da loja
              (abertos e fechados)
            </li>
          </ul>
          <p className="text-xs text-blue-500 font-medium mt-2">
            💡 Importante: Sempre feche o caixa no final do expediente para
            manter o controle financeiro.
          </p>
        </div>
      ),
      placement: "right",
      disableBeacon: true,
    },

    // ── VENDER (PDV) ──
    {
      target: "#menu-vender",
      content: (
        <div className="space-y-3">
          <h3 className="font-bold text-lg text-blue-600">
            🛍️ Vender — Ponto de Venda (PDV)
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            O <strong>coração da operação</strong>. Aqui é onde as vendas
            acontecem na prática.
          </p>
          <ul className="text-sm text-gray-600 space-y-1 list-disc pl-4">
            <li>
              <strong>Busca rápida</strong> — pesquise produtos por nome ou
              código de barras
            </li>
            <li>
              <strong>Carrinho</strong> — adicione itens e ajuste quantidades
            </li>
            <li>
              <strong>Formas de pagamento</strong> — PIX, Dinheiro, Cartão de
              Crédito e Débito
            </li>
            <li>
              <strong>Finalizar venda</strong> — conclua a venda e o estoque é
              atualizado automaticamente
            </li>
          </ul>
          <p className="text-xs text-blue-500 font-medium mt-2">
            💡 Atalho: Pressione F2 para abrir a busca rápida de produtos a
            qualquer momento.
          </p>
        </div>
      ),
      placement: "right",
      disableBeacon: true,
    },

    // ── ESTOQUE ──
    {
      target: "#menu-estoque",
      content: (
        <div className="space-y-3">
          <h3 className="font-bold text-lg text-blue-600">
            📦 Estoque — Gestão de Produtos
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Aqui você <strong>cadastra, edita e organiza</strong> todos os
            produtos da sua loja.
          </p>
          <ul className="text-sm text-gray-600 space-y-1 list-disc pl-4">
            <li>
              <strong>Cadastrar produto</strong> — nome, preço de custo, preço
              de venda, SKU, categoria
            </li>
            <li>
              <strong>Margem de lucro</strong> — o sistema calcula
              automaticamente sua margem de contribuição
            </li>
            <li>
              <strong>Estoque mínimo</strong> — defina alertas para quando o
              produto estiver acabando
            </li>
            <li>
              <strong>Categorias</strong> — organize seus produtos por
              categorias (Bebidas, Limpeza, etc.)
            </li>
            <li>
              <strong>Filtros avançados</strong> — busque por nome, status ou
              categoria
            </li>
          </ul>
          <p className="text-xs text-blue-500 font-medium mt-2">
            💡 Primeiro passo: Cadastre pelo menos um produto para desbloquear o
            PDV.
          </p>
        </div>
      ),
      placement: "right",
      disableBeacon: true,
    },

    // ── LOTES ──
    {
      target: "body",
      content: (
        <div className="space-y-3">
          <h3 className="font-bold text-lg text-blue-600">
            📅 Lotes — Controle de Validade
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Gerencie os <strong>lotes e datas de validade</strong> dos seus
            produtos perecíveis.
          </p>
          <ul className="text-sm text-gray-600 space-y-1 list-disc pl-4">
            <li>
              <strong>Cadastrar lotes</strong> — adicione lotes com quantidade e
              data de validade
            </li>
            <li>
              <strong>Alertas automáticos</strong> — notificações de lotes
              próximos do vencimento
            </li>
            <li>
              <strong>Visualização clara</strong> — veja quais lotes vencem
              primeiro (FIFO)
            </li>
            <li>
              <strong>Descartar lotes</strong> — registre lotes vencidos ou
              perdidos
            </li>
          </ul>
          <p className="text-xs text-blue-500 font-medium mt-2">
            💡 Perfeito para mercados, farmácias e qualquer negócio com produtos
            perecíveis.
          </p>
        </div>
      ),
      placement: "center",
      disableBeacon: true,
    },

    // ── MOVIMENTAÇÕES ──
    {
      target: "#menu-movimentacoes",
      content: (
        <div className="space-y-3">
          <h3 className="font-bold text-lg text-blue-600">
            🔄 Movimentações — Histórico de Estoque
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Rastreie <strong>todas as entradas e saídas</strong> do seu estoque.
          </p>
          <ul className="text-sm text-gray-600 space-y-1 list-disc pl-4">
            <li>
              <strong>Entradas</strong> — compras de fornecedores, devoluções de
              clientes
            </li>
            <li>
              <strong>Saídas</strong> — vendas, perdas, avarias
            </li>
            <li>
              <strong>Ajustes</strong> — correções de inventário manual
            </li>
            <li>
              <strong>Histórico completo</strong> — cada movimentação é
              registrada com data, hora e responsável
            </li>
          </ul>
          <p className="text-xs text-blue-500 font-medium mt-2">
            💡 Use para auditorias e para identificar perdas ou divergências no
            estoque.
          </p>
        </div>
      ),
      placement: "right",
      disableBeacon: true,
    },

    // ── EQUIPE ──
    {
      target: "#menu-equipe",
      content: (
        <div className="space-y-3">
          <h3 className="font-bold text-lg text-blue-600">
            👥 Equipe — Gestão de Funcionários
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Gerencie sua equipe e defina <strong>permissões de acesso</strong>{" "}
            para cada colaborador.
          </p>
          <ul className="text-sm text-gray-600 space-y-1 list-disc pl-4">
            <li>
              <strong>Adicionar funcionário</strong> — crie contas com nome,
              email e senha
            </li>
            <li>
              <strong>Definir o papel</strong> — Caixa (só vende), Gerente
              (vende + gerencia estoque)
            </li>
            <li>
              <strong>Meta de vendas</strong> — defina metas mensais para cada
              funcionário
            </li>
            <li>
              <strong>Desativar conta</strong> — bloqueie o acesso de
              funcionários que saíram
            </li>
          </ul>
          <p className="text-xs text-blue-500 font-medium mt-2">
            💡 Cada funcionário tem login próprio e só vê o que você permitir.
          </p>
        </div>
      ),
      placement: "right",
      disableBeacon: true,
    },

    // ── RELATÓRIOS ──
    {
      target: "#menu-relatorios",
      content: (
        <div className="space-y-3">
          <h3 className="font-bold text-lg text-blue-600">
            📈 Relatórios — Inteligência do Negócio
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Seu centro de <strong>inteligência</strong>. Tome decisões baseadas
            em dados reais.
          </p>
          <ul className="text-sm text-gray-600 space-y-1 list-disc pl-4">
            <li>
              <strong>Faturamento por período</strong> — filtre por dia, semana,
              mês ou intervalo personalizado
            </li>
            <li>
              <strong>Gráficos de vendas</strong> — visualize tendências e
              padrões
            </li>
            <li>
              <strong>Produtos mais vendidos</strong> — descubra seus campeões
              de venda
            </li>
            <li>
              <strong>Formas de pagamento</strong> — veja que métodos seus
              clientes preferem
            </li>
            <li>
              <strong>Histórico detalhado</strong> — lista completa de todas as
              vendas com valores
            </li>
          </ul>
          <p className="text-xs text-blue-500 font-medium mt-2">
            💡 Exporte relatórios para ter controle total mesmo fora do sistema.
          </p>
        </div>
      ),
      placement: "right",
      disableBeacon: true,
    },

    // ── INDICAÇÕES ──
    {
      target: "#menu-indicacoes",
      content: (
        <div className="space-y-3">
          <h3 className="font-bold text-lg text-blue-600">
            🎁 Indicações — Indique e Ganhe
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Ganhe <strong>1 mês grátis</strong> para cada indicação que assinar
            o FlowPDV!
          </p>
          <ul className="text-sm text-gray-600 space-y-1 list-disc pl-4">
            <li>
              <strong>Link exclusivo</strong> — compartilhe seu link
              personalizado
            </li>
            <li>
              <strong>Funil de conversão</strong> — acompanhe cliques →
              cadastros → assinaturas
            </li>
            <li>
              <strong>Recompensa automática</strong> — quando o indicado paga, o
              mês grátis é aplicado automaticamente
            </li>
            <li>
              <strong>Histórico</strong> — veja todas as suas indicações e seus
              status
            </li>
          </ul>
          <p className="text-xs text-blue-500 font-medium mt-2">
            💡 Compartilhe com outros comerciantes! Quanto mais indicar, mais
            meses grátis!
          </p>
        </div>
      ),
      placement: "right",
      disableBeacon: true,
    },

    // ── ASSINATURA ──
    {
      target: "body",
      content: (
        <div className="space-y-3">
          <h3 className="font-bold text-lg text-blue-600">
            💳 Assinatura — Seu Plano
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Gerencie sua <strong>assinatura e pagamentos</strong> do FlowPDV.
          </p>
          <ul className="text-sm text-gray-600 space-y-1 list-disc pl-4">
            <li>
              <strong>Status do plano</strong> — veja se está ativo, pendente ou
              em teste
            </li>
            <li>
              <strong>Próximo vencimento</strong> — saiba quando sua próxima
              cobrança vai chegar
            </li>
            <li>
              <strong>Histórico de pagamentos</strong> — todas as faturas pagas
              e pendentes
            </li>
            <li>
              <strong>Atualizar cartão</strong> — troque o cartão de crédito
              cadastrado
            </li>
          </ul>
          <p className="text-xs text-blue-500 font-medium mt-2">
            💡 Mantenha sua assinatura em dia para evitar bloqueios no sistema.
          </p>
        </div>
      ),
      placement: "center",
      disableBeacon: true,
    },

    // ── ANOTAÇÕES ──
    {
      target: "body",
      content: (
        <div className="space-y-3">
          <h3 className="font-bold text-lg text-blue-600">
            📝 Anotações — Bloco de Notas
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Um <strong>bloco de notas digital</strong> simples e rápido para o
            dia a dia da loja.
          </p>
          <ul className="text-sm text-gray-600 space-y-1 list-disc pl-4">
            <li>
              <strong>Criar anotações</strong> — anote lembretes, pedidos de
              fornecedores, recados
            </li>
            <li>
              <strong>Organizar</strong> — marque como importante ou feito
            </li>
            <li>
              <strong>Pesquisar</strong> — encontre anotações antigas
              rapidamente
            </li>
          </ul>
          <p className="text-xs text-blue-500 font-medium mt-2">
            💡 Perfeito para lembrar de ligar pro fornecedor ou anotar um pedido
            especial!
          </p>
        </div>
      ),
      placement: "center",
      disableBeacon: true,
    },

    // ── CONFIGURAÇÕES ──
    {
      target: "body",
      content: (
        <div className="space-y-3">
          <h3 className="font-bold text-lg text-blue-600">
            ⚙️ Configurações — Personalize o Sistema
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Ajuste o FlowPDV para <strong>funcionar do seu jeito</strong>.
          </p>
          <ul className="text-sm text-gray-600 space-y-1 list-disc pl-4">
            <li>
              <strong>Tema</strong> — alterne entre modo claro e escuro
            </li>
            <li>
              <strong>Instalar App</strong> — instale o FlowPDV como aplicativo
              no seu celular ou computador
            </li>
            <li>
              <strong>Senha de Autorização</strong> — defina uma senha especial
              para autorizar operações sensíveis
            </li>
            <li>
              <strong>Alterar Senha</strong> — mude a senha da sua conta a
              qualquer momento
            </li>
            <li>
              <strong>Reiniciar Tour</strong> — reveja este tutorial quando
              quiser
            </li>
          </ul>
        </div>
      ),
      placement: "center",
      disableBeacon: true,
    },

    // ── FINALIZAÇÃO ──
    {
      target: "body",
      content: (
        <div className="text-center space-y-4">
          <div className="text-4xl">🎉</div>
          <h3 className="font-bold text-xl text-blue-600">Tudo Pronto!</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Você agora conhece <strong>todas as funcionalidades</strong> do
            FlowPDV. Para começar a vender:
          </p>
          <div className="bg-blue-50 rounded-lg p-3 text-left space-y-2">
            <p className="text-sm text-blue-700 font-medium">
              ✅ 1. Cadastre seus produtos no <strong>Estoque</strong>
            </p>
            <p className="text-sm text-blue-700 font-medium">
              ✅ 2. Abra o <strong>Caixa</strong> e defina o troco
            </p>
            <p className="text-sm text-blue-700 font-medium">
              ✅ 3. Vá até <strong>Vender</strong> e faça sua primeira venda!
            </p>
          </div>
          <p className="text-xs text-gray-400">
            Acesse <strong>Configurações</strong> para reiniciar o tour quando
            quiser.
          </p>
        </div>
      ),
      placement: "center",
      disableBeacon: true,
    },
  ];
}

function getGerenteSteps(): Step[] {
  return [
    // ── BOAS-VINDAS ──
    {
      target: "body",
      content: (
        <div className="text-center space-y-3">
          <div className="text-4xl">🚀</div>
          <h3 className="font-bold text-xl text-blue-600">
            Bem-vindo ao FlowPDV, Gerente!
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Vamos te guiar por <strong>todas as ferramentas</strong> que você
            tem acesso para gerenciar a loja com eficiência.
          </p>
          <p className="text-xs text-gray-400 mt-2">
            ⏱️ Duração estimada: 2 minutos
          </p>
        </div>
      ),
      placement: "center",
      disableBeacon: true,
    },

    // ── DASHBOARD ──
    {
      target: "body",
      content: (
        <div className="space-y-3">
          <h3 className="font-bold text-lg text-blue-600">
            📊 Dashboard — Seu Painel
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Sua <strong>visão geral</strong> de como a loja está performando
            hoje.
          </p>
          <ul className="text-sm text-gray-600 space-y-1 list-disc pl-4">
            <li>
              <strong>Faturamento</strong> — quanto a loja vendeu hoje
            </li>
            <li>
              <strong>Vendas do dia</strong> — quantas vendas foram fechadas
            </li>
            <li>
              <strong>Alertas de estoque</strong> — produtos que precisam de
              reposição
            </li>
          </ul>
        </div>
      ),
      placement: "center",
      disableBeacon: true,
    },

    // ── VENDER ──
    {
      target: "#menu-vender",
      content: (
        <div className="space-y-3">
          <h3 className="font-bold text-lg text-blue-600">
            🛍️ Vender — Ponto de Venda
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Opere o <strong>caixa diretamente</strong> ou acompanhe as vendas
            dos funcionários.
          </p>
          <ul className="text-sm text-gray-600 space-y-1 list-disc pl-4">
            <li>Busque produtos por nome ou código</li>
            <li>Monte o carrinho e finalize a venda</li>
            <li>Escolha a forma de pagamento (PIX, Dinheiro, Cartão)</li>
          </ul>
          <p className="text-xs text-blue-500 font-medium mt-2">
            💡 Atalho: F2 abre a busca rápida de produtos.
          </p>
        </div>
      ),
      placement: "right",
      disableBeacon: true,
    },

    // ── ESTOQUE ──
    {
      target: "#menu-estoque",
      content: (
        <div className="space-y-3">
          <h3 className="font-bold text-lg text-blue-600">
            📦 Estoque — Gestão de Produtos
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            <strong>Cadastre, edite e organize</strong> os produtos da loja.
          </p>
          <ul className="text-sm text-gray-600 space-y-1 list-disc pl-4">
            <li>Cadastre produtos com preço de custo e venda</li>
            <li>Defina estoque mínimo para alertas automáticos</li>
            <li>Crie categorias para organizar os produtos</li>
            <li>Gerencie lotes e validade de perecíveis</li>
          </ul>
        </div>
      ),
      placement: "right",
      disableBeacon: true,
    },

    // ── LOTES ──
    {
      target: "body",
      content: (
        <div className="space-y-3">
          <h3 className="font-bold text-lg text-blue-600">
            📅 Lotes — Controle de Validade
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Gerencie <strong>lotes e datas de validade</strong> dos produtos
            perecíveis. Receba alertas antes do vencimento.
          </p>
        </div>
      ),
      placement: "center",
      disableBeacon: true,
    },

    // ── MOVIMENTAÇÕES ──
    {
      target: "#menu-movimentacoes",
      content: (
        <div className="space-y-3">
          <h3 className="font-bold text-lg text-blue-600">
            🔄 Movimentações — Histórico de Estoque
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Rastreie as <strong>entradas e saídas</strong> de estoque: vendas,
            compras, ajustes e perdas. Cada movimentação registra data, hora e
            responsável.
          </p>
        </div>
      ),
      placement: "right",
      disableBeacon: true,
    },

    // ── ANOTAÇÕES ──
    {
      target: "body",
      content: (
        <div className="space-y-3">
          <h3 className="font-bold text-lg text-blue-600">
            📝 Anotações — Bloco de Notas
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Anote lembretes, pedidos de fornecedores e recados importantes do
            comércio no <strong>bloco de notas digital</strong>.
          </p>
        </div>
      ),
      placement: "center",
      disableBeacon: true,
    },

    // ── CONFIGURAÇÕES ──
    {
      target: "body",
      content: (
        <div className="space-y-3">
          <h3 className="font-bold text-lg text-blue-600">⚙️ Configurações</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Altere o tema (claro/escuro), instale o app no celular, mude sua
            senha e reinicie este tour.
          </p>
        </div>
      ),
      placement: "center",
      disableBeacon: true,
    },

    // ── FINALIZAÇÃO ──
    {
      target: "body",
      content: (
        <div className="text-center space-y-4">
          <div className="text-4xl">🎉</div>
          <h3 className="font-bold text-xl text-blue-600">
            Tudo Pronto, Gerente!
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Você agora conhece todas as ferramentas de gerência. Seu próximo
            passo:
          </p>
          <div className="bg-blue-50 rounded-lg p-3 text-left space-y-2">
            <p className="text-sm text-blue-700 font-medium">
              ✅ 1. Confira o <strong>Estoque</strong> e os produtos cadastrados
            </p>
            <p className="text-sm text-blue-700 font-medium">
              ✅ 2. Acesse <strong>Movimentações</strong> para ver o fluxo do
              dia
            </p>
            <p className="text-sm text-blue-700 font-medium">
              ✅ 3. Vá até <strong>Vender</strong> para operar ou supervisionar
            </p>
          </div>
          <p className="text-xs text-gray-400">
            Reinicie o tour em <strong>Configurações</strong> quando quiser.
          </p>
        </div>
      ),
      placement: "center",
      disableBeacon: true,
    },
  ];
}

function getFuncionarioSteps(): Step[] {
  return [
    // ── BOAS-VINDAS ──
    {
      target: "body",
      content: (
        <div className="text-center space-y-3">
          <div className="text-4xl">🚀</div>
          <h3 className="font-bold text-xl text-blue-600">
            Bem-vindo ao FlowPDV!
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Vamos te mostrar tudo que você precisa para{" "}
            <strong>operar o caixa</strong> e acompanhar suas vendas.
          </p>
          <p className="text-xs text-gray-400 mt-2">
            ⏱️ Duração estimada: 1 minuto
          </p>
        </div>
      ),
      placement: "center",
      disableBeacon: true,
    },

    // ── DASHBOARD ──
    {
      target: "body",
      content: (
        <div className="space-y-3">
          <h3 className="font-bold text-lg text-blue-600">
            📊 Sua Área — Dashboard
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Esta é a sua <strong>área pessoal</strong>. Aqui você vê:
          </p>
          <ul className="text-sm text-gray-600 space-y-1 list-disc pl-4">
            <li>
              <strong>Suas vendas do mês</strong> — quanto você vendeu
            </li>
            <li>
              <strong>Meta mensal</strong> — seu progresso em relação à meta
              definida pelo admin
            </li>
            <li>
              <strong>Histórico</strong> — suas últimas vendas com valores
            </li>
            <li>
              <strong>Mural de Avisos</strong> — comunicados da empresa
            </li>
          </ul>
        </div>
      ),
      placement: "center",
      disableBeacon: true,
    },

    // ── VENDER ──
    {
      target: "#menu-vender",
      content: (
        <div className="space-y-3">
          <h3 className="font-bold text-lg text-blue-600">
            🛍️ Vender — Seu Caixa
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Aqui é onde você <strong>opera o caixa</strong> no dia a dia.
          </p>
          <ul className="text-sm text-gray-600 space-y-1 list-disc pl-4">
            <li>
              <strong>Abrir caixa</strong> — comece o dia informando o valor de
              troco
            </li>
            <li>
              <strong>Buscar produto</strong> — pesquise por nome ou leia o
              código de barras
            </li>
            <li>
              <strong>Montar carrinho</strong> — adicione itens e ajuste
              quantidades
            </li>
            <li>
              <strong>Escolher pagamento</strong> — PIX, Dinheiro, Cartão de
              Crédito ou Débito
            </li>
            <li>
              <strong>Finalizar venda</strong> — confirme e a venda é registrada
              automaticamente
            </li>
            <li>
              <strong>Fechar caixa</strong> — conte o dinheiro e feche no final
              do expediente
            </li>
          </ul>
          <p className="text-xs text-blue-500 font-medium mt-2">
            💡 Atalho: Pressione F2 para buscar produtos rapidamente.
          </p>
        </div>
      ),
      placement: "right",
      disableBeacon: true,
    },

    // ── MINHA CONTA ──
    {
      target: "#menu-minha-conta",
      content: (
        <div className="space-y-3">
          <h3 className="font-bold text-lg text-blue-600">
            👤 Minha Conta — Seus Dados
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Gerencie suas <strong>informações pessoais</strong> e acompanhe seu
            desempenho.
          </p>
          <ul className="text-sm text-gray-600 space-y-1 list-disc pl-4">
            <li>
              <strong>Suas vendas</strong> — valores e histórico completo
            </li>
            <li>
              <strong>Meta vs Realizado</strong> — veja a barra de progresso da
              sua meta
            </li>
            <li>
              <strong>Mural de avisos</strong> — fique por dentro dos recados da
              empresa
            </li>
          </ul>
        </div>
      ),
      placement: "right",
      disableBeacon: true,
    },

    // ── ANOTAÇÕES ──
    {
      target: "body",
      content: (
        <div className="space-y-3">
          <h3 className="font-bold text-lg text-blue-600">📝 Anotações</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Use o <strong>bloco de notas</strong> para anotar lembretes, pedidos
            especiais de clientes ou qualquer informação importante do seu dia.
          </p>
        </div>
      ),
      placement: "center",
      disableBeacon: true,
    },

    // ── CONFIGURAÇÕES ──
    {
      target: "body",
      content: (
        <div className="space-y-3">
          <h3 className="font-bold text-lg text-blue-600">⚙️ Configurações</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Alterne entre <strong>modo claro e escuro</strong>, instale o app no
            celular e altere sua senha.
          </p>
        </div>
      ),
      placement: "center",
      disableBeacon: true,
    },

    // ── FINALIZAÇÃO ──
    {
      target: "body",
      content: (
        <div className="text-center space-y-4">
          <div className="text-4xl">🎉</div>
          <h3 className="font-bold text-xl text-blue-600">Tudo Pronto!</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Agora é com você! Para começar:
          </p>
          <div className="bg-blue-50 rounded-lg p-3 text-left space-y-2">
            <p className="text-sm text-blue-700 font-medium">
              ✅ 1. Vá até <strong>Vender</strong> e abra seu caixa
            </p>
            <p className="text-sm text-blue-700 font-medium">
              ✅ 2. Faça sua primeira venda!
            </p>
            <p className="text-sm text-blue-700 font-medium">
              ✅ 3. Acompanhe suas vendas em <strong>Minha Conta</strong>
            </p>
          </div>
          <p className="text-xs text-gray-400">
            Reinicie o tour em <strong>Configurações</strong> quando quiser.
          </p>
        </div>
      ),
      placement: "center",
      disableBeacon: true,
    },
  ];
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export function OnboardingTour() {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const { data: session, update, status: sessionStatus } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const hasInitialized = useRef(false);

  const role = session?.user?.role || "funcionario";
  const userId = session?.user?.id;
  const tourCompletedFromSession = session?.user?.tourCompleted;

  const publicPages = [
    "/login",
    "/forgot-password",
    "/register",
    "/signup",
    "/bloqueado",
  ];
  const isPublicPage = publicPages.some((page) => pathname?.startsWith(page));

  const wasShownThisSession = useCallback(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(TOUR_SHOWN_THIS_SESSION_KEY) === "true";
  }, []);

  const markShownThisSession = useCallback(() => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(TOUR_SHOWN_THIS_SESSION_KEY, "true");
  }, []);

  const clearShownThisSession = useCallback(() => {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem(TOUR_SHOWN_THIS_SESSION_KEY);
  }, []);

  const markTourCompletedInStorage = useCallback(() => {
    if (typeof window === "undefined" || !userId) return;
    localStorage.setItem(`${TOUR_COMPLETED_KEY}_${userId}`, "true");
  }, [userId]);

  const isTourCompletedInStorage = useCallback(() => {
    if (typeof window === "undefined" || !userId) return false;
    return localStorage.getItem(`${TOUR_COMPLETED_KEY}_${userId}`) === "true";
  }, [userId]);

  const resetTourInStorage = useCallback(() => {
    if (typeof window === "undefined" || !userId) return;
    localStorage.removeItem(`${TOUR_COMPLETED_KEY}_${userId}`);
  }, [userId]);

  const getDashboardPath = useCallback(() => {
    if (role === "admin") return "/admin";
    if (role === "gerente") return "/gerente";
    return "/dashboard";
  }, [role]);

  const forceSidebarOpen = useCallback((open: boolean) => {
    const sidebar = document.querySelector(
      ".hidden.lg\\:flex .h-full",
    ) as HTMLElement;
    if (!sidebar) return;

    if (open) {
      sidebar.style.width = "300px";
      sidebar.style.pointerEvents = "none";
      sidebar.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    } else {
      sidebar.style.width = "";
      sidebar.style.pointerEvents = "";
      sidebar.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    }
  }, []);

  useEffect(() => {
    if (run) {
      const timer = setTimeout(() => forceSidebarOpen(true), 200);
      return () => clearTimeout(timer);
    } else {
      forceSidebarOpen(false);
    }
  }, [run, forceSidebarOpen]);

  useEffect(() => {
    const handleTourReset = () => {
      hasInitialized.current = false;
      resetTourInStorage();
      clearShownThisSession();

      const dashPath = getDashboardPath();
      const isOnDashboard = pathname === dashPath;

      if (!isOnDashboard) {
        router.push(dashPath);
      }

      setTimeout(
        () => {
          markShownThisSession();
          setStepIndex(0);
          setRun(true);
        },
        isOnDashboard ? 800 : 1500,
      );
    };

    window.addEventListener(TOUR_RESET_EVENT, handleTourReset);
    return () => window.removeEventListener(TOUR_RESET_EVENT, handleTourReset);
  }, [
    resetTourInStorage,
    clearShownThisSession,
    markShownThisSession,
    getDashboardPath,
    pathname,
    router,
  ]);

  useEffect(() => {
    if (isPublicPage) {
      setRun(false);
      return;
    }

    if (sessionStatus === "loading") return;

    if (sessionStatus !== "authenticated" || !session?.user) {
      setRun(false);
      return;
    }

    if (role === "master") {
      setRun(false);
      return;
    }

    if (wasShownThisSession()) {
      setRun(false);
      return;
    }

    if (tourCompletedFromSession === true) {
      setRun(false);
      return;
    }

    if (isTourCompletedInStorage()) {
      setRun(false);
      return;
    }

    if (!tourCompletedFromSession && !hasInitialized.current) {
      hasInitialized.current = true;

      const dashPath = getDashboardPath();
      if (pathname !== dashPath) {
        router.push(dashPath);
      }

      const timer = setTimeout(() => {
        markShownThisSession();
        setStepIndex(0);
        setRun(true);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [
    tourCompletedFromSession,
    role,
    sessionStatus,
    session?.user,
    isPublicPage,
    wasShownThisSession,
    isTourCompletedInStorage,
    markShownThisSession,
    getDashboardPath,
    pathname,
    router,
  ]);

  if (isPublicPage || sessionStatus !== "authenticated" || !session?.user) {
    return null;
  }

  const handleJoyrideCallback = async (data: CallBackProps) => {
    const { status, action, index, type } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (type === "step:after" && action === ACTIONS.NEXT) {
      setStepIndex(index + 1);
    } else if (type === "step:after" && action === ACTIONS.PREV) {
      setStepIndex(index - 1);
    }

    if (finishedStatuses.includes(status)) {
      setRun(false);
      setStepIndex(0);
      hasInitialized.current = true;

      markTourCompletedInStorage();

      try {
        await fetch("/api/user/complete-tour", {
          method: "POST",
        });
        await update({ tourCompleted: true });
      } catch (error) {
        console.error("Failed to complete tour", error);
      }
    }
  };

  let steps: Step[] = [];

  if (role === "admin") {
    steps = getAdminSteps();
  } else if (role === "gerente") {
    steps = getGerenteSteps();
  } else if (role === "caixa" || role === "funcionario") {
    steps = getFuncionarioSteps();
  }

  if (!steps.length) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      showSkipButton
      showProgress
      scrollToFirstStep={false}
      disableScrollParentFix={true}
      spotlightClicks={false}
      disableOverlayClose={true}
      callback={handleJoyrideCallback}
      floaterProps={{
        disableAnimation: true,
      }}
      styles={{
        options: {
          primaryColor: "#137fec",
          zIndex: 10000,
          arrowColor: "#fff",
          backgroundColor: "#fff",
          overlayColor: "rgba(0, 0, 0, 0.5)",
          textColor: "#333",
          width: 420,
        },
        overlay: {
          zIndex: 9999,
        },
        spotlight: {
          borderRadius: "12px",
        },
        tooltip: {
          borderRadius: "16px",
          boxShadow:
            "0 20px 40px -5px rgba(0, 0, 0, 0.15), 0 10px 15px -5px rgba(0, 0, 0, 0.1)",
          padding: "24px",
          maxWidth: "440px",
        },
        tooltipContainer: {
          textAlign: "left",
        },
        tooltipContent: {
          padding: "8px 0",
        },
        buttonNext: {
          backgroundColor: "#137fec",
          borderRadius: "10px",
          padding: "10px 24px",
          fontWeight: 600,
          fontSize: "14px",
        },
        buttonBack: {
          color: "#666",
          marginRight: "10px",
          fontWeight: 500,
        },
        buttonSkip: {
          color: "#999",
          fontSize: "14px",
        },
      }}
      locale={{
        back: "Voltar",
        close: "Fechar",
        last: "Concluir",
        next: "Próximo",
        skip: "Pular tour",
      }}
    />
  );
}
