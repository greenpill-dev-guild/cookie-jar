"use client"

import { CreateJarForm } from "@/components/create-jar-form"
import { CreatePageHeader } from "@/components/create-page-header"
import { CustomConnectButton } from "@/components/custom-connect-button"

export default function CreateJarPageClient() {
  return (
    <main className="min-h-screen bg-[#fff8f0]">
      <CreatePageHeader />
      <div className="container mx-auto px-4 md:px-8 pb-16">
        <div className="mb-6 flex justify-center">
          <CustomConnectButton />
        </div>
        <CreateJarForm />
      </div>
    </main>
  )
}

