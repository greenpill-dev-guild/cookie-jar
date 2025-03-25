import { JarDetails } from "@/components/jar-details"

export default function JarPage({ params }: { params: { id: string } }) {
  return (
    <main className="section-container py-8 cream-bg">
      <JarDetails id={params.id} />
    </main>
  )
}

