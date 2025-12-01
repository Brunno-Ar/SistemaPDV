import { Navbar } from "./(landing)/_components/Navbar";
import { HeroSection } from "./(landing)/_components/HeroSection";
import { MarqueeSection } from "./(landing)/_components/MarqueeSection";
import { BentoGridSection } from "./(landing)/_components/BentoGridSection";
import { SegmentationSection } from "./(landing)/_components/SegmentationSection";
import { FinalCTASection } from "./(landing)/_components/FinalCTASection";
import Link from "next/link";
import { Store } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-zinc-900 selection:bg-blue-100 selection:text-blue-900">
      <Navbar />

      <main>
        <HeroSection />
        <MarqueeSection />
        <BentoGridSection />
        <SegmentationSection />
        <FinalCTASection />
      </main>

      {/* Simplified Footer */}
      <footer className="bg-white border-t border-zinc-100 py-12">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-[#137fec] to-blue-500">
              <Store className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-zinc-900">FlowPDV</span>
          </div>

          <p className="text-sm text-zinc-500">
            © {new Date().getFullYear()} FlowPDV. Todos os direitos reservados.
          </p>

          <div className="flex gap-6 text-sm font-medium text-zinc-600">
             <Link href="#" className="hover:text-[#137fec]">Termos</Link>
             <Link href="#" className="hover:text-[#137fec]">Privacidade</Link>
             <Link href="#" className="hover:text-[#137fec]">Contato</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
