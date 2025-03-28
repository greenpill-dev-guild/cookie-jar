import { JarsHeader } from "@/components/jars-header"
import { JarsList } from "@/components/jars-list"

export default function JarsPage() {
  return (
    <div className="cream-bg min-h-screen">
      <JarsHeader />
      <JarsList />
    </div>
  )
}

