import { Shield, Clock, Users, Coins, FileText, Settings } from "lucide-react"

export function Features() {
  const features = [
    {
      icon: <Shield className="h-12 w-12 text-primary" />,
      title: "Dual Access Control",
      description: "Choose between whitelist or NFT-gated access to control who can withdraw from your jar.",
    },
    {
      icon: <Clock className="h-12 w-12 text-primary" />,
      title: "Configurable Withdrawals",
      description: "Set fixed or variable withdrawal amounts with customizable cooldown periods.",
    },
    {
      icon: <FileText className="h-12 w-12 text-primary" />,
      title: "Purpose Tracking",
      description: "Require users to explain withdrawals with on-chain transparency for accountability.",
    },
    {
      icon: <Coins className="h-12 w-12 text-primary" />,
      title: "Multi-Asset Support",
      description: "Support for ETH and any ERC20 token with a simple fee structure.",
    },
    {
      icon: <Users className="h-12 w-12 text-primary" />,
      title: "Multi-Admin",
      description: "Assign multiple administrators to manage your jar with flexible permissions.",
    },
    {
      icon: <Settings className="h-12 w-12 text-primary" />,
      title: "Customizable Settings",
      description: "Easily configure jar settings to match your specific use case and requirements.",
    },
  ]

  return (
    <section className="page-section cream-bg w-full">
      <div className="section-container w-full">
        <h2 className="text-center mb-16 text-[#4a3520]">KEY FEATURES</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="mb-6">{feature.icon}</div>
              <h3 className="text-2xl font-semibold mb-4 text-[#4a3520]">{feature.title}</h3>
              <p className="text-lg text-[#4a3520]">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
