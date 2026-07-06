//src/app/landing/page.tsx

import { Navbar } from "@/components/landing/navbar"
import { Hero } from "@/components/landing/hero"
import { TrustStrip } from "@/components/landing/trust-strip"
import { Introduction } from "@/components/landing/introduction"
import { PainPoints } from "@/components/landing/pain-points"
import { Solution } from "@/components/landing/solution"
import { Features } from "@/components/landing/features"
import { HowItWorks } from "@/components/landing/how-it-works"
import { WhoIsFor } from "@/components/landing/who-is-for"
import { WhyChyksys } from "@/components/landing/why-chyksys"
import { Team } from "@/components/landing/team"
import { Testimonials } from "@/components/landing/testimonials"
import { Blog } from "@/components/landing/blog"
import { Resources } from "@/components/landing/resources"
import { FinalCTA } from "@/components/landing/final-cta"
import { Footer } from "@/components/landing/footer"

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <TrustStrip />
        <Introduction />
        <PainPoints />
        <Solution />
        <Features />
        <HowItWorks />
        <WhoIsFor />
        <WhyChyksys />
        <Team />
        <Testimonials />
        <FinalCTA />
        <Blog />
        <Resources />
      </main>
      <Footer />
    </div>
  )
}