import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import Link from "next/link";
import {
  Store,
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  Menu,
  X,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-[#f5f6f8] dark:bg-[#0f1323] font-sans text-gray-800 dark:text-gray-200">
      {/* TopNavBar */}
      <header className="sticky top-0 z-50 bg-[#f5f6f8]/80 dark:bg-[#0f1323]/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between border-b border-gray-200 dark:border-white/10">
            <div className="flex items-center gap-4">
              <Store className="text-[#3b66ff] h-8 w-8" />
              <h2 className="text-lg font-bold leading-tight tracking-[-0.015em] text-gray-900 dark:text-white">
                Sistema de Gestão
              </h2>
            </div>
            <nav className="hidden items-center gap-9 md:flex">
              <Link
                href="#recursos"
                className="text-sm font-medium leading-normal text-gray-600 hover:text-[#3b66ff] dark:text-gray-300 dark:hover:text-[#3b66ff]"
              >
                Recursos
              </Link>
              <Link
                href="#precos"
                className="text-sm font-medium leading-normal text-gray-600 hover:text-[#3b66ff] dark:text-gray-300 dark:hover:text-[#3b66ff]"
              >
                Preços
              </Link>
              <Link
                href="#contato"
                className="text-sm font-medium leading-normal text-gray-600 hover:text-[#3b66ff] dark:text-gray-300 dark:hover:text-[#3b66ff]"
              >
                Contato
              </Link>
            </nav>
            <div className="flex items-center gap-2">
              <Link href="/login">
                <InteractiveHoverButton className="w-32">
                  Login
                </InteractiveHoverButton>
              </Link>
              <Link href="/signup">
                <InteractiveHoverButton className="w-32 bg-[#3b66ff] text-white hover:bg-[#3b66ff]/90 border-[#3b66ff]">
                  Cadastrar
                </InteractiveHoverButton>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        {/* HeroSection */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
              <div className="flex flex-col gap-6 text-center lg:text-left items-center lg:items-start">
                <h1 className="text-4xl font-black leading-tight tracking-tighter text-gray-900 dark:text-white sm:text-5xl lg:text-6xl">
                  Simplifique a gestão do seu varejo e impulsione suas vendas
                </h1>
                <h2 className="max-w-xl text-base font-normal leading-normal text-gray-600 dark:text-gray-300 sm:text-lg">
                  Nossa plataforma ajuda você a aumentar as vendas e otimizar as
                  operações do seu negócio com ferramentas inteligentes e fáceis
                  de usar.
                </h2>
                <Link href="/signup">
                  <InteractiveHoverButton className="w-64 bg-[#3b66ff] text-white hover:bg-[#3b66ff]/90 border-[#3b66ff]">
                    Experimente Grátis por 14 dias
                  </InteractiveHoverButton>
                </Link>
              </div>
              <div className="w-full">
                <div
                  className="aspect-video w-full rounded-xl bg-gray-200 dark:bg-white/10 bg-cover bg-center"
                  style={{
                    backgroundImage:
                      'url("https://lh3.googleusercontent.com/aida-public/AB6AXuADl2I9gG0Y5Fixmq9EaJ7qX68X92S_bADklodU3IXWYSrUFtxDL3X1Uj44WpZFdnxMiGuqH2wQA5hjUwicv1AyD56rSWoPnwbDJVZunIrIHVJcfJWNF-po_M4MRlFXo_RHNjoEnr_OSW1fAk_exhapNVVabZoAyj4MylNc9GjKJJF5rgtdaxXHKWg41oKfsPwoNBkwQqngG-yBKafLz63IBMYg6NkRDxXpui_kouCI2c1B16d399IuFqSYuL8oiGh9gxz4Djqc")',
                  }}
                  aria-label="Stylized dashboard of the retail management system showing charts and sales data."
                ></div>
              </div>
            </div>
          </div>
        </section>

        {/* FeatureSection */}
        <section
          id="recursos"
          className="py-16 sm:py-24 bg-gray-50 dark:bg-[#0f1323]/50"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-10">
              <div className="max-w-3xl text-center mx-auto">
                <h2 className="text-3xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                  Tudo que você precisa para gerenciar sua loja
                </h2>
                <p className="mt-4 text-base font-normal leading-normal text-gray-600 dark:text-gray-300">
                  Centralize suas operações e tome decisões mais inteligentes
                  com nossos módulos integrados.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex flex-col gap-4 rounded-xl border border-gray-200 dark:border-white/10 bg-[#f5f6f8] dark:bg-[#0f1323] p-6 text-center items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#3b66ff]/10 text-[#3b66ff]">
                    <ShoppingCart className="h-8 w-8" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <h3 className="text-lg font-bold leading-tight text-gray-900 dark:text-white">
                      Gestão de Vendas
                    </h3>
                    <p className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
                      Acompanhe suas vendas em tempo real, gerencie pedidos e
                      processe pagamentos.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-4 rounded-xl border border-gray-200 dark:border-white/10 bg-[#f5f6f8] dark:bg-[#0f1323] p-6 text-center items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#3b66ff]/10 text-[#3b66ff]">
                    <Package className="h-8 w-8" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <h3 className="text-lg font-bold leading-tight text-gray-900 dark:text-white">
                      Controle de Estoque
                    </h3>
                    <p className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
                      Mantenha seu inventário atualizado, evite rupturas e
                      otimize o fluxo de produtos.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-4 rounded-xl border border-gray-200 dark:border-white/10 bg-[#f5f6f8] dark:bg-[#0f1323] p-6 text-center items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#3b66ff]/10 text-[#3b66ff]">
                    <Users className="h-8 w-8" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <h3 className="text-lg font-bold leading-tight text-gray-900 dark:text-white">
                      Administração de Equipe
                    </h3>
                    <p className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
                      Gerencie permissões, acompanhe o desempenho e organize as
                      tarefas da sua equipe.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-4 rounded-xl border border-gray-200 dark:border-white/10 bg-[#f5f6f8] dark:bg-[#0f1323] p-6 text-center items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#3b66ff]/10 text-[#3b66ff]">
                    <BarChart3 className="h-8 w-8" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <h3 className="text-lg font-bold leading-tight text-gray-900 dark:text-white">
                      Relatórios Inteligentes
                    </h3>
                    <p className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
                      Acesse insights valiosos sobre seu negócio com relatórios
                      detalhados e fáceis.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SocialProof Section */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white sm:text-3xl">
                Empresas que confiam em nossa solução
              </h2>
            </div>
            <div className="mt-10 grid grid-cols-2 items-center justify-items-center gap-x-8 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
              <img
                className="h-10 w-auto"
                alt="Transistor company logo"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAvpEmUOMArLvOc-T2waJM0YguU-ATmP1MAXChnt3UKTRzrY_qiAbpoRFUvCsDvRdsf8GTFG7VhAFM4ZxsWXHwN1RL-f0NiVDVHYpOZxQ8toEQc8_lNQIJ5FMPIi9awWawq-MXq1UHeCbFl1KOKZo_vkig2No8e15ROXajfwHtS2zv7kMaxncN35W_XPa4jpz3r5rBhyGVarx7R1JEvnZivYRHNLi3i0Jodmp-NXJ05DPVU2hIiBsp1tQ74SHxag-7kqYZcVC-s"
              />
              <img
                className="h-10 w-auto"
                alt="Reform company logo"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBCRnaddchHkHaB8gGDIIxMD65vJBor3ePOvypiqRsCid5r0lJjIy-mb_CWGwhv1PVHdeYUvVBwwTyNCCrQv1KF328I81NM_R4sZLeLPKyff3Vsq6QnsIUwqQPX3H78nbU58_O7bEoeDil5kDryMLRdWdJwMxTU6mSJkejZB7aWCaoxrzyTS2nDoznPi_8yVSA6MMNMYgFyndkDQMHEeF97s192yaKw6KV1UXXVqe3SeESAuncCDCh9ENMUoP8Ee5DOIRxSAj7H"
              />
              <img
                className="h-10 w-auto"
                alt="Tuple company logo"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBcrP2r4RW3yG03qzCW2zIiX-XiZ2s8S5F2NUh6wd2G1Xumaf0ypZRQHWa_F1bLl4ycoQTQG-C2JsX-ZfeX0L0BLZcp9Vx19s64hquNmVgzrxQ6_Sb1qg0U0EJ9oU43xmNWbbaSYCvWT54KKSLvOlu897ra85QZmHhyJ7ThWR--qY1b9MsfZgKs_yJQ0MZQ5QTzRZoPlTe5YUfIcZYdQSribs3qSpzGLPd6t3sN96pWtjGxF7kfuaUr6nlThcc_9hKxUrlclgKi"
              />
              <img
                className="h-10 w-auto"
                alt="SavvyCal company logo"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCx2zAdNJRPXUnKHDHwYl5sootvJR_dShI6oL3gvjwm1ESnTyXA46F5BGiX0gQWp5l71o_Gfy5Bae5axjoGqLHAYehshJXAFogdocKGz10Eyrc94cSd0DQ3Mm5PUC_ZPBLqOu0wQ0_OFS6DzQlbf6y52-J5yAyLuEov9cHRv16zLqkmk1Vzb-RvFe3HXMA6MDNzDOOKYK4YSuLI79a0VmyNLQrP4ns6g86CvMeOEPKJRPr8bzs43q_mJTmnZ9ZM9bMgFMjdoKav"
              />
              <img
                className="h-10 w-auto"
                alt="Statamic company logo"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuC08r7PQT6b2LeYlB2kNwe74PZEgiR5Y0x5ekTyrGMUQgh96cWLPlB7NrAEF-moo_Kcm2c-DTG7yWi83-NLkRhu_8g6AHNhR2pZN1O6KKg-f09aPAIg2XVzeyVmPhwAlpIlafffvtCb2JOcEw6_5aQTzGckhkv-GDS464oDc0mgVAzGjQAwzQUXItargCx_JExCe_T7EnUIwjBkCdF64Bg8Bja5q1zHeuVN628CWn7g0_kd9oa175HzqfVWQpf_PGtBHH7bltTj"
              />
              <img
                className="h-10 w-auto"
                alt="Laravel company logo"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuA5MxD3BFRLYn0onIsJRnWFq9U78-voPSCj0GLI3TD9Lt4nu1UJgC7cu6j_RLpniwmMHkQObTskz9hQE7O2wKOvk7PB5eyUqdmb9L6nSYVNkAnEVBXmW3ZFYinJ8_KUTXi7XYBlu3JcQmlOtpI_Mg51fri5pOdrlU9AraQKwU9UT9hmjCpwz5BxGao7o3EA5y0ux_bSSUjGaxB9RYu8P72EnfEtl1yIxjm2h22_ko2lDp30sDHIfxPbE7rNPFy7uOVWqY7j8Y5j"
              />
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="relative isolate overflow-hidden bg-[#3b66ff]/10 px-6 py-24 text-center shadow-2xl rounded-xl sm:px-16">
              <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                Pronto para transformar a gestão do seu negócio?
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-700 dark:text-gray-300">
                Comece hoje mesmo e veja como nossa plataforma pode simplificar
                suas operações e alavancar suas vendas.
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                <Link href="/signup">
                  <InteractiveHoverButton className="w-48 bg-[#3b66ff] text-white hover:bg-[#3b66ff]/90 border-[#3b66ff]">
                    Comece Agora
                  </InteractiveHoverButton>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 dark:bg-[#0f1323]/50">
        <div className="mx-auto max-w-7xl overflow-hidden px-6 py-12 lg:px-8">
          <nav
            aria-label="Footer"
            className="-mb-6 columns-2 sm:flex sm:justify-center sm:space-x-12"
          >
            <div className="pb-6">
              <Link
                href="#recursos"
                className="text-sm leading-6 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              >
                Recursos
              </Link>
            </div>
            <div className="pb-6">
              <Link
                href="#precos"
                className="text-sm leading-6 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              >
                Preços
              </Link>
            </div>
            <div className="pb-6">
              <Link
                href="#contato"
                className="text-sm leading-6 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              >
                Contato
              </Link>
            </div>
            <div className="pb-6">
              <Link
                href="#"
                className="text-sm leading-6 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              >
                Termos de Serviço
              </Link>
            </div>
            <div className="pb-6">
              <Link
                href="#"
                className="text-sm leading-6 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              >
                Política de Privacidade
              </Link>
            </div>
          </nav>
          <p className="mt-10 text-center text-xs leading-5 text-gray-500 dark:text-gray-400">
            © 2024 Sistema de Gestão. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
