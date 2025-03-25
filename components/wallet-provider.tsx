"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { ethers } from "ethers"
import { useToast } from "@/components/ui/use-toast"

type WalletContextType = {
  address: string | null
  chainId: number | null
  provider: ethers.BrowserProvider | null
  signer: ethers.JsonRpcSigner | null
  isConnecting: boolean
  isConnected: boolean
  connect: () => Promise<void>
  disconnect: () => void
  switchNetwork: (chainId: number) => Promise<void>
}

const WalletContext = createContext<WalletContextType>({
  address: null,
  chainId: null,
  provider: null,
  signer: null,
  isConnecting: false,
  isConnected: false,
  connect: async () => {},
  disconnect: () => {},
  switchNetwork: async () => {},
})

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const { toast } = useToast()

  // Network configurations
  const networks = {
    base: {
      chainId: 8453,
      name: "Base",
      rpcUrl: "https://mainnet.base.org",
    },
    optimism: {
      chainId: 10,
      name: "Optimism",
      rpcUrl: "https://mainnet.optimism.io",
    },
    gnosis: {
      chainId: 100,
      name: "Gnosis Chain",
      rpcUrl: "https://rpc.gnosischain.com",
    },
    sepolia: {
      chainId: 11155111,
      name: "Sepolia",
      rpcUrl: "https://rpc.sepolia.org",
    },
    arbitrum: {
      chainId: 42161,
      name: "Arbitrum One",
      rpcUrl: "https://arb1.arbitrum.io/rpc",
    },
  }

  const connect = async () => {
    if (!window.ethereum) {
      toast({
        title: "No wallet detected",
        description: "Please install MetaMask or another Ethereum wallet",
        variant: "destructive",
      })
      return
    }

    try {
      setIsConnecting(true)
      const provider = new ethers.BrowserProvider(window.ethereum)
      const accounts = await provider.send("eth_requestAccounts", [])
      const signer = await provider.getSigner()
      const network = await provider.getNetwork()

      setProvider(provider)
      setSigner(signer)
      setAddress(accounts[0])
      setChainId(Number(network.chainId))
      setIsConnected(true)

      toast({
        title: "Wallet connected",
        description: `Connected to ${accounts[0].substring(0, 6)}...${accounts[0].substring(38)}`,
      })
    } catch (error) {
      console.error("Connection error:", error)
      toast({
        title: "Connection failed",
        description: "Failed to connect to wallet",
        variant: "destructive",
      })
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnect = () => {
    setAddress(null)
    setChainId(null)
    setProvider(null)
    setSigner(null)
    setIsConnected(false)

    toast({
      title: "Wallet disconnected",
      description: "Your wallet has been disconnected",
    })
  }

  const switchNetwork = async (targetChainId: number) => {
    if (!window.ethereum) return

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      })
    } catch (error: any) {
      // If the chain hasn't been added to MetaMask
      if (error.code === 4902) {
        const network = Object.values(networks).find((n) => n.chainId === targetChainId)
        if (!network) return

        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: `0x${targetChainId.toString(16)}`,
                chainName: network.name,
                rpcUrls: [network.rpcUrl],
              },
            ],
          })
        } catch (addError) {
          console.error("Error adding chain:", addError)
        }
      }
    }
  }

  // Listen for account changes
  useEffect(() => {
    if (!window.ethereum) return

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect()
      } else if (accounts[0] !== address) {
        setAddress(accounts[0])
      }
    }

    const handleChainChanged = (chainId: string) => {
      setChainId(Number.parseInt(chainId, 16))
    }

    window.ethereum.on("accountsChanged", handleAccountsChanged)
    window.ethereum.on("chainChanged", handleChainChanged)

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged)
      window.ethereum.removeListener("chainChanged", handleChainChanged)
    }
  }, [address])

  return (
    <WalletContext.Provider
      value={{
        address,
        chainId,
        provider,
        signer,
        isConnecting,
        isConnected,
        connect,
        disconnect,
        switchNetwork,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export const useWallet = () => useContext(WalletContext)

