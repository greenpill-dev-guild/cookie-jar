import { CreateJarForm } from "@/components/create-jar-form"

export default function CreateJarPage() {
  return (
    <main className="container max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Create a Cookie Jar</h1>
      <p className="text-muted-foreground mb-8">
        Set up a new cookie jar with customized access controls and withdrawal rules.
      </p>
      <CreateJarForm />
    </main>
  )
}

