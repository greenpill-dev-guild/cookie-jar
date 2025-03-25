import Image from "next/image"
import Link from "next/link"
import { AnimatedButton } from "@/components/animated-button"

export function NetworkSupport() {
  const networks = [
    {
      name: "Base",
      logo: "/placeholder.svg?height=80&width=80",
      description: "Fast, low-cost transactions with Ethereum security.",
    },
    {
      name: "Optimism",
      logo: "/placeholder.svg?height=80&width=80",
      description: "Scalable Ethereum with optimistic rollups.",
    },
    {
      name: "Gnosis Chain",
      logo: "/placeholder.svg?height=80&width=80",
      description: "Stable, community-driven Ethereum sidechain.",
    },
    {
      name: "Sepolia",
      logo: "/placeholder.svg?height=80&width=80",
      description: "Ethereum testnet for development and testing.",
    },
    {
      name: "Arbitrum",
      logo: "/placeholder.svg?height=80&width=80",
      description: "Scaling solution with low fees and high throughput.",
    },
  ]

  return (
    <section className="cream-bg relative w-full">
      <div className="section-container py-24 w-full">
        <h2 className="text-center mb-8 text-[#4a3520]">SUPPORTED NETWORKS</h2>
        <p className="text-center text-xl text-[#4a3520] mb-16 max-w-4xl mx-auto">
          Cookie Jar is available on multiple L2 networks, making it accessible and cost-effective for various use
          cases.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
          {networks.map((network, index) => (
            <div key={index} className="feature-card flex flex-col items-center text-center">
              <div className="relative mb-4 w-24 h-24 flex items-center justify-center">
                {/* Orange circle border around the network logo */}
                <div className="absolute inset-0 rounded-full border-4 border-[#ff5e14]"></div>
                <div className="relative w-20 h-20 overflow-hidden rounded-full bg-white">
                  <Image
                    src={network.logo || "/placeholder.svg"}
                    alt={network.name}
                    width={80}
                    height={80}
                    className="rounded-full"
                  />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-[#4a3520]">{network.name}</h3>
              <p className="text-[#4a3520]">{network.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Call to Action */}
      <div className="page-section bg-white w-full">
        <div className="section-container w-full">
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="mb-8 text-[#4a3520]">READY TO GET STARTED?</h2>
            <p className="text-xl text-[#4a3520] mb-12">
              Create your first cookie jar today and start managing shared resources with transparency and control.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
              <Link href="/jars">
                <AnimatedButton text="EXPLORE JARS" />
              </Link>
              <Link href="/create" className="secondary-cta">
                CREATE A JAR
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

