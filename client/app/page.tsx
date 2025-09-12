import { LandingHero } from "@/components/page/home/landing-hero"
import { Features } from "@/components/page/home/features"
import { NetworkSupport } from "@/components/page/home/network-support"
import { Footer } from "@/components/page/home/footer"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <LandingHero />
      <Footer />
    </main>
  )
}
