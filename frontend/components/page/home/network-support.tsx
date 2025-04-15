import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"

export function NetworkSupport() {
  const networks = [
    {
      name: "Base Sepolia",
      description: "Testnet for Base network",
      status: "Active",
      color: "bg-[#ff5e14]",
      logo: "/networks/base-sepolia.png",
    },
    {
      name: "Base",
      description: "Ethereum L2 scaling solution by Coinbase",
      status: "Coming Soon",
      color: "bg-blue-500",
      logo: "/networks/base.png",
    },
    {
      name: "Optimism",
      description: "Ethereum L2 with optimistic rollups",
      status: "Coming Soon",
      color: "bg-red-500",
      logo: "/networks/optimism.png",
    },
    {
      name: "Gnosis Chain",
      description: "Stable, community-owned Ethereum sidechain",
      status: "Coming Soon",
      color: "bg-green-500",
      logo: "/networks/gnosis.png",
    },
    {
      name: "Arbitrum",
      description: "Ethereum L2 with optimistic rollups",
      status: "Coming Soon",
      color: "bg-blue-700",
      logo: "/networks/arbitrum.png",
    },
  ]

  return (
    <section className="page-section cream-bg w-full">
      <div className="section-container w-full">
        <h2 className="text-center mb-16 text-[#4a3520]">SUPPORTED NETWORKS</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {networks.map((network) => (
            <Card key={network.name} className="feature-card relative overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#f5f5f5] flex items-center justify-center overflow-hidden">
                      {network.logo ? (
                        <Image
                          src={network.logo || "/placeholder.svg"}
                          alt={`${network.name} logo`}
                          width={32}
                          height={32}
                          className="object-contain"
                        />
                      ) : (
                        <div className={`w-8 h-8 rounded-full ${network.color}`}></div>
                      )}
                    </div>
                    <CardTitle className="text-xl">{network.name}</CardTitle>
                  </div>
                  <Badge
                    className={`${
                      network.status === "Active"
                        ? "bg-green-500"
                        : network.status === "Coming Soon"
                          ? "bg-amber-500"
                          : network.color
                    } text-white`}
                  >
                    {network.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">{network.description}</CardDescription>
                {network.status === "Active" && (
                  <div className="mt-4 text-sm text-green-600 font-medium">✓ Currently supported</div>
                )}
                {network.status === "Coming Soon" && (
                  <div className="mt-4 text-sm text-amber-600 font-medium">Integration in progress</div>
                )}
              </CardContent>
              {network.status === "Active" && (
                <div className="absolute top-0 right-0 w-16 h-16">
                  <div className="absolute transform rotate-45 bg-green-500 text-white text-xs font-bold py-1 right-[-35px] top-[20px] w-[140px] text-center">
                    ACTIVE
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
