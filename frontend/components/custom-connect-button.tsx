"use client"

import { useState } from "react"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useAccount, useSignMessage, useChainId, useDisconnect } from "wagmi"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

// Terms and conditions message that users will sign
const TERMS_MESSAGE = `Welcome to Cookie Jar V3!

By signing this message, you agree to our Terms of Service and Privacy Policy:

1. You are responsible for securing your wallet and private keys
2. You understand the risks associated with blockchain transactions
3. You agree to use the platform in compliance with applicable laws
4. You acknowledge that smart contracts may contain bugs or vulnerabilities
5. You understand that transactions on the blockchain are irreversible

Date: ${new Date().toISOString().split("T")[0]}
`

export function CustomConnectButton() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { signMessageAsync } = useSignMessage()
  const { disconnect } = useDisconnect()
  const [showTerms, setShowTerms] = useState(false)
  const [isSigningTerms, setIsSigningTerms] = useState(false)
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false)

  // Check if user has already accepted terms (could be stored in localStorage)
  const checkTermsAccepted = () => {
    const accepted = localStorage.getItem(`terms-accepted-${address}`)
    return !!accepted
  }

  // Store that user has accepted terms
  const storeTermsAccepted = () => {
    if (address) {
      localStorage.setItem(`terms-accepted-${address}`, "true")
    }
  }

  // Handle wallet connection
  const handleConnect = async () => {
    if (isConnected && !hasAcceptedTerms && !checkTermsAccepted()) {
      setShowTerms(true)
    }
  }

  // Handle terms acceptance
  const handleAcceptTerms = async () => {
    if (!address || !chainId) return

    try {
      setIsSigningTerms(true)

      // Create the message with nonce, address and chain ID
      const nonce = Date.now().toString()
      const message = `${TERMS_MESSAGE}\n\nWallet: ${address}\nChain ID: ${chainId}\nNonce: ${nonce}`

      // Request signature from the user
      const signature = await signMessageAsync({ message })

      // Store that user has accepted terms
      storeTermsAccepted()
      setHasAcceptedTerms(true)
      setShowTerms(false)

      console.log("User signed terms and conditions", { message, signature })
    } catch (error) {
      console.error("Error during terms signing", error)
      // If user rejected the signature, disconnect the wallet
      disconnect()
    } finally {
      setIsSigningTerms(false)
    }
  }

  // Handle terms rejection
  const handleRejectTerms = () => {
    setShowTerms(false)
    disconnect()
  }

  return (
    <>
      <ConnectButton.Custom>
        {({ account, chain, openAccountModal, openChainModal, openConnectModal, authenticationStatus, mounted }) => {
          const ready = mounted && authenticationStatus !== "loading"
          const connected =
            ready && account && chain && (!authenticationStatus || authenticationStatus === "authenticated")

          // If connected but hasn't accepted terms, show terms dialog
          if (connected && !hasAcceptedTerms && !checkTermsAccepted()) {
            setTimeout(() => setShowTerms(true), 500)
          }

          return (
            <div
              {...(!ready && {
                "aria-hidden": true,
                style: {
                  opacity: 0,
                  pointerEvents: "none",
                  userSelect: "none",
                },
              })}
            >
              {(() => {
                if (!connected) {
                  return (
                    <button onClick={openConnectModal} type="button" className="btn-conteiner">
                      <a className="btn-content btn-content-small">
                        <span className="btn-title">CONNECT WALLET</span>
                        <span className="icon-arrow">
                          <svg
                            width="66px"
                            height="43px"
                            viewBox="0 0 66 43"
                            version="1.1"
                            xmlns="http://www.w3.org/2000/svg"
                            xmlnsXlink="http://www.w3.org/1999/xlink"
                          >
                            <g id="arrow" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                              <path
                                id="arrow-icon-one"
                                d="M40.1543933,3.89485454 L43.9763149,0.139296592 C44.1708311,-0.0518420739 44.4826329,-0.0518571125 44.6771675,0.139262789 L65.6916134,20.7848311 C66.0855801,21.1718824 66.0911863,21.8050225 65.704135,22.1989893 C65.7000188,22.2031791 65.6958657,22.2073326 65.6916762,22.2114492 L44.677098,42.8607841 C44.4825957,43.0519059 44.1708242,43.0519358 43.9762853,42.8608513 L40.1545186,39.1069479 C39.9575152,38.9134427 39.9546793,38.5968729 40.1481845,38.3998695 C40.1502893,38.3977268 40.1524132,38.395603 40.1545562,38.3934985 L56.9937789,21.8567812 C57.1908028,21.6632968 57.193672,21.3467273 57.0001876,21.1497035 C56.9980647,21.1475418 56.9959223,21.1453995 56.9937605,21.1432767 L40.1545208,4.60825197 C39.9574869,4.41477773 39.9546013,4.09820839 40.1480756,3.90117456 C40.1501626,3.89904911 40.1522686,3.89694235 40.1543933,3.89485454 Z"
                                fill="#FFFFFF"
                              ></path>
                              <path
                                id="arrow-icon-two"
                                d="M20.1543933,3.89485454 L23.9763149,0.139296592 C24.1708311,-0.0518420739 24.4826329,-0.0518571125 24.6771675,0.139262789 L45.6916134,20.7848311 C46.0855801,21.1718824 46.0911863,21.8050225 45.704135,22.1989893 C45.7000188,22.2031791 45.6958657,22.2073326 45.6916762,22.2114492 L24.677098,42.8607841 C24.4825957,43.0519059 24.1708242,43.0519358 23.9762853,42.8608513 L20.1545186,39.1069479 C19.9575152,38.9134427 19.9546793,38.5968729 20.1481845,38.3998695 C20.1502893,38.3977268 20.1524132,38.395603 20.1545562,38.3934985 L36.9937789,21.8567812 C37.1908028,21.6632968 37.193672,21.3467273 37.0001876,21.1497035 C36.9980647,21.1475418 36.9959223,21.1453995 36.9937605,21.1432767 L20.1545208,4.60825197 C19.9574869,4.41477773 19.9546013,4.09820839 20.1480756,3.90117456 C20.1501626,3.89904911 20.1522686,3.89694235 20.1543933,3.89485454 Z"
                                fill="#FFFFFF"
                              ></path>
                              <path
                                id="arrow-icon-three"
                                d="M0.154393339,3.89485454 L3.97631488,0.139296592 C4.17083111,-0.0518420739 4.48263286,-0.0518571125 4.67716753,0.139262789 L25.6916134,20.7848311 C26.0855801,21.1718824 26.0911863,21.8050225 25.704135,22.1989893 C25.7000188,22.2031791 25.6958657,22.2073326 25.6916762,22.2114492 L4.67709797,42.8607841 C4.48259567,43.0519059 4.17082418,43.0519358 3.97628526,42.8608513 L0.154518591,39.1069479 C-0.0424848215,38.9134427 -0.0453206733,38.5968729 0.148184538,38.3998695 C0.150289256,38.3977268 0.152413239,38.395603 0.154556228,38.3934985 L16.9937789,21.8567812 C17.1908028,21.6632968 17.193672,21.3467273 17.0001876,21.1497035 C16.9980647,21.1475418 16.9959223,21.1453995 16.9937605,21.1432767 L0.15452076,4.60825197 C-0.0425130651,4.41477773 -0.0453986756,4.09820839 0.148075568,3.90117456 C0.150162624,3.89904911 0.152268631,3.89694235 0.154393339,3.89485454 Z"
                                fill="#FFFFFF"
                              ></path>
                            </g>
                          </svg>
                        </span>
                      </a>
                    </button>
                  )
                }

                if (chain.unsupported) {
                  return (
                    <button onClick={openChainModal} type="button">
                      Wrong network
                    </button>
                  )
                }

                return (
                  <div style={{ display: "flex", gap: 12 }}>
                    <button
                      onClick={openChainModal}
                      style={{ display: "flex", alignItems: "center" }}
                      type="button"
                      className="text-[#4a3520] font-medium"
                    >
                      {chain.hasIcon && (
                        <div
                          style={{
                            background: chain.iconBackground,
                            width: 12,
                            height: 12,
                            borderRadius: 999,
                            overflow: "hidden",
                            marginRight: 4,
                          }}
                        >
                          {chain.iconUrl && (
                            <img
                              alt={chain.name ?? "Chain icon"}
                              src={chain.iconUrl || "/placeholder.svg"}
                              style={{ width: 12, height: 12 }}
                            />
                          )}
                        </div>
                      )}
                      {chain.name}
                    </button>

                    <button onClick={openAccountModal} type="button" className="text-[#4a3520] font-medium">
                      {account.displayName}
                      {account.displayBalance ? ` (${account.displayBalance})` : ""}
                    </button>
                  </div>
                )
              })()}
            </div>
          )
        }}
      </ConnectButton.Custom>

      {/* Terms and Conditions Dialog */}
      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Terms and Conditions</DialogTitle>
            <DialogDescription>Please read and accept our terms and conditions to continue.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto p-4 border rounded-md my-4">
            <pre className="whitespace-pre-wrap font-sans text-sm">{TERMS_MESSAGE}</pre>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2">
            <Button variant="outline" onClick={handleRejectTerms}>
              Decline
            </Button>
            <Button variant="cookie" onClick={handleAcceptTerms} disabled={isSigningTerms}>
              {isSigningTerms ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing...
                </>
              ) : (
                "Accept & Sign"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

