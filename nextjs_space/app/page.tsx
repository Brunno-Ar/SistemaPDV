
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  const features = [
    {
      icon: 'point_of_sale',
      title: 'Gestão de Vendas',
      description: 'PDV ágil, controle de vendas em tempo real e gerenciamento de comissões para sua equipe.',
    },
    {
      icon: 'inventory_2',
      title: 'Controle de Estoque',
      description: 'Monitore entradas, saídas, inventário e receba alertas de estoque baixo automaticamente.',
    },
    {
      icon: 'groups',
      title: 'Gestão de Equipe',
      description: 'Defina diferentes níveis de acesso e acompanhe o desempenho individual e da equipe.',
    },
    {
      icon: 'bar_chart',
      title: 'Relatórios Inteligentes',
      description: 'Acesse dashboards visuais e insights para tomar decisões mais estratégicas.',
    },
  ];

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark">
      <header className="sticky top-0 z-50 flex justify-center bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-sm border-b border-border-light dark:border-border-dark">
        <div className="flex items-center justify-between whitespace-nowrap px-4 sm:px-10 py-3 w-full max-w-6xl">
          <div className="flex items-center gap-4">
            <div className="size-8 text-primary">
              <svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M14.25 2.25a.75.75 0 0 1 .75.75v18a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75Zm-4.5 0a.75.75 0 0 1 .75.75v18a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75Zm-4.5 0a.75.75 0 0 1 .75.75v18a.75.75 0 0 1-1.5 0V3A.75.75 0 0 1 5.25 2.25Zm13.5 0a.75.75 0 0 1 .75.75v18a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75Z"></path></svg>
            </div>
            <h2 className="text-lg font-bold tracking-[-0.015em]">Gestão Varejo</h2>
          </div>
          <nav className="hidden md:flex flex-1 justify-end gap-8">
            <div className="flex items-center gap-9">
              <a className="text-sm font-medium leading-normal hover:text-primary transition-colors" href="#">Recursos</a>
              <a className="text-sm font-medium leading-normal hover:text-primary transition-colors" href="#">Planos</a>
              <a className="text-sm font-medium leading-normal hover:text-primary transition-colors" href="#">Contato</a>
            </div>
            <div className="flex gap-2">
              <Link href="/login">
                <Button variant="ghost">Login</Button>
              </Link>
              <Link href="/signup">
                <Button>Cadastrar Empresa</Button>
              </Link>
            </div>
          </nav>
          <button className="md:hidden flex items-center justify-center size-10 rounded-lg hover:bg-primary/10 transition-colors">
            <span className="material-symbols-outlined">menu</span>
          </button>
        </div>
      </header>

      <main className="flex flex-col items-center py-5">
        <div className="flex flex-col max-w-6xl flex-1 w-full px-4 sm:px-10 space-y-16 sm:space-y-24">
          <section className="p-4">
            <div
              className="flex min-h-[480px] flex-col gap-8 rounded-xl items-start justify-end px-4 pb-10 sm:px-10 bg-cover bg-center"
              style={{backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.6) 100%), url("https://lh3.googleusercontent.com/aida-public/AB6AXuD7CvkoO7ltwuivjNt2dXEiDjaXMBZmxZAl7LVBamGl5_1nxYXELYmywwItEadNw5TVHquwUfZn5RBfI5m62SyPzFntKZH59SexjPjIpW3A0uppsO9Q0qaX3SdilPVyujc2MJo4UKzWxZo2vIwa55zjnTE68BqbuhOnqiHLtSgKIVgvfkCXVYMS8I-ysCHMsb4Yo-P-UgZctEVaVzUkafoz4PwM8a_iE22VGJl5cD_S3YcTBY8kN3CrQJZQUcKih6qb5qNRobKI5tAn")'}}
            >
              <div className="flex flex-col gap-2 text-left max-w-3xl">
                <h1 className="text-white text-4xl font-black leading-tight tracking-[-0.033em] sm:text-5xl">A Gestão do Seu Varejo, Simplificada e Inteligente</h1>
                <h2 className="text-slate-200 text-base font-normal leading-normal sm:text-lg">Centralize suas vendas, estoque e equipe em uma única plataforma e tome decisões baseadas em dados reais.</h2>
              </div>
              <Link href="/signup">
                <Button size="lg" className="h-12 px-5 text-base">Experimente por 14 dias grátis</Button>
              </Link>
            </div>
          </section>

          <section className="flex flex-col gap-10 py-10">
            <div className="flex flex-col gap-4 text-center items-center">
              <h1 className="text-text-light dark:text-text-dark tracking-tight text-[32px] font-bold leading-tight sm:text-4xl max-w-2xl">Tudo que você precisa para crescer</h1>
              <p className="text-text-light/80 dark:text-text-dark/80 text-base font-normal leading-normal max-w-3xl">Nossa plataforma oferece ferramentas completas para otimizar cada aspecto do seu negócio de varejo, desde o ponto de venda até a análise de dados.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map(feature => (
                <div key={feature.title} className="flex flex-1 gap-4 rounded-xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-6 flex-col hover:border-primary/50 hover:shadow-lg transition-all">
                  <div className="text-primary"><span className="material-symbols-outlined !text-3xl">{feature.icon}</span></div>
                  <div className="flex flex-col gap-1">
                    <h2 className="text-base font-bold leading-tight">{feature.title}</h2>
                    <p className="text-sm font-normal leading-normal text-text-light/70 dark:text-text-dark/70">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-primary/10 dark:bg-primary/20 rounded-xl p-10 sm:p-16 flex flex-col items-center justify-center text-center gap-6">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-text-light dark:text-text-dark max-w-2xl">Pronto para transformar a gestão do seu varejo?</h2>
            <p className="text-base sm:text-lg text-text-light/80 dark:text-text-dark/80 max-w-3xl">Comece hoje mesmo. Cadastre sua empresa e descubra como nossa plataforma pode impulsionar seus resultados. Sem compromisso, sem cartão de crédito.</p>
            <Link href="/signup">
                <Button size="lg" className="h-12 px-6 text-base">Cadastrar Empresa Gratuitamente</Button>
            </Link>
          </section>
        </div>
      </main>

      <footer className="flex justify-center border-t border-border-light dark:border-border-dark mt-16 sm:mt-24">
        <div className="w-full max-w-6xl px-4 sm:px-10 py-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6 text-sm text-text-light/70 dark:text-text-dark/70">
            <p>© 2024 Gestão Varejo. Todos os direitos reservados.</p>
            <div className="flex gap-4">
              <a className="hover:text-primary transition-colors" href="#">Termos de Serviço</a>
              <a className="hover:text-primary transition-colors" href="#">Política de Privacidade</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
