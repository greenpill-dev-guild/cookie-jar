"use client"

import { CreateJarForm } from "@/components/create-jar-form"
import { CreatePageHeader } from "@/components/create-page-header"
import { WalletAuthLayer } from "@/components/wallet-auth-layer"

export default function CreatePage() {
  return (
    <WalletAuthLayer>
      <div className="container max-w-5xl py-8">
        <CreatePageHeader />
        <CreateJarForm />
      </div>
    </WalletAuthLayer>
  )
}

