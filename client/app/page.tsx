import { LandingHero } from "@/components/page/home/landing-hero"
import { Footer } from "@/components/page/home/footer"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden -mx-4 md:-mx-6 lg:-mx-8 -my-4">
      <LandingHero />
      <Footer />
    </div>
  )
}
