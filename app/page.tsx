import { LandingHero } from "@/components/landing-hero"
import { Features } from "@/components/features"
import { NetworkSupport } from "@/components/network-support"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <LandingHero />
      <Features />
      <NetworkSupport />
      <Footer />
    </main>
  )
}

