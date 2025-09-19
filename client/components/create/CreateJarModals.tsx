"use client"

import React from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LoadingOverlay } from "@/components/design/LoadingOverlay"
import { MemoizedCustomConnectButton } from "@/components/wallet/CustomConnectButton"

interface CreateJarModalsProps {
  showWalletModal: boolean
  setShowWalletModal: (show: boolean) => void
  setPendingSubmission: (pending: boolean) => void
  isCreating: boolean
  isWaitingForTx: boolean
}

export const CreateJarModals: React.FC<CreateJarModalsProps> = ({
  showWalletModal,
  setShowWalletModal,
  setPendingSubmission,
  isCreating,
  isWaitingForTx
}) => {
  return (
    <>
      {/* Wallet Connection Modal */}
      {showWalletModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-[hsl(var(--cj-dark-brown))]">Connect Your Wallet</CardTitle>
              <p className="text-[hsl(var(--cj-medium-brown))]">
                You're all set! Now connect your wallet to create this Cookie Jar on the blockchain.
              </p>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <MemoizedCustomConnectButton className="w-full" />
              <Button
                variant="outline"
                onClick={() => {
                  setShowWalletModal(false)
                  setPendingSubmission(false)
                }}
                className="w-full"
              >
                Cancel
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loading Overlay */}
      {(isCreating || isWaitingForTx) && (
        <LoadingOverlay 
          isOpen={isCreating || isWaitingForTx}
          message={
            isWaitingForTx 
              ? "Waiting for transaction confirmation..." 
              : "Creating your cookie jar..."
          }
        />
      )}
    </>
  )
}
