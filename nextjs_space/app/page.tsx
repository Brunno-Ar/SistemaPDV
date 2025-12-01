import { Navbar } from "./(landing)/_components/Navbar";
import { Hero } from "./(landing)/_components/Hero";
import { Marquee } from "./(landing)/_components/Marquee";
import { BentoGrid } from "./(landing)/_components/BentoGrid";
import { AudienceSection } from "./(landing)/_components/AudienceSection";
import { FooterCTA } from "./(landing)/_components/FooterCTA";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white selection:bg-blue-100 selection:text-blue-900">
      <Navbar />
      <Hero />
      <Marquee />
      <BentoGrid />
      <AudienceSection />
      <FooterCTA />
    </main>
  );
}
