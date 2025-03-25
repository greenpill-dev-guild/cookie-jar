import { JarsList } from "@/components/jars-list"
import { JarsHeader } from "@/components/jars-header"

export default function JarsPage() {
  return (
    <main className="section-container py-8 cream-bg">
      <JarsHeader />
      <JarsList />
    </main>
  )
}

