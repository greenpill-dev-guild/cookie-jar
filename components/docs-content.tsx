export function DocsContent() {
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none">
      <h1>Cookie Jar Documentation</h1>
      <p>
        Welcome to the Cookie Jar documentation. This guide will help you understand how to use the Cookie Jar platform
        to create, manage, and interact with shared token pools.
      </p>

      <h2>What is Cookie Jar?</h2>
      <p>
        Cookie Jar is a platform for creating controlled token pools with customizable access rules, withdrawal limits,
        and transparent tracking. It allows teams, communities, and organizations to manage shared funds in a
        transparent and accountable way.
      </p>

      <h2>Key Features</h2>
      <ul>
        <li>
          <strong>Dual Access Control:</strong> Choose between whitelist or NFT-gated access to control who can withdraw
          from your jar.
        </li>
        <li>
          <strong>Configurable Withdrawals:</strong> Set fixed or variable withdrawal amounts with customizable cooldown
          periods.
        </li>
        <li>
          <strong>Purpose Tracking:</strong> Require users to explain withdrawals with on-chain transparency for
          accountability.
        </li>
        <li>
          <strong>Multi-Asset Support:</strong> Support for ETH and any ERC20 token with a simple fee structure.
        </li>
        <li>
          <strong>Multi-Admin:</strong> Assign multiple administrators to manage your jar with flexible permissions.
        </li>
      </ul>

      <h2>Getting Started</h2>
      <p>
        To get started with Cookie Jar, you'll need to connect your wallet and create your first jar. Follow these
        steps:
      </p>

      <ol>
        <li>Connect your wallet to the Cookie Jar platform</li>
        <li>Navigate to the "Create Jar" page</li>
        <li>Configure your jar settings</li>
        <li>Deploy your jar to your chosen network</li>
        <li>Deposit funds into your jar</li>
        <li>Share your jar with your team or community</li>
      </ol>

      <h2>Supported Networks</h2>
      <p>Cookie Jar is available on the following networks:</p>

      <ul>
        <li>Base</li>
        <li>Optimism</li>
        <li>Gnosis Chain</li>
        <li>Sepolia (Testnet)</li>
        <li>Arbitrum</li>
      </ul>

      <h2>Smart Contract Architecture</h2>
      <p>Cookie Jar consists of two main smart contracts:</p>

      <ul>
        <li>
          <strong>CookieJar:</strong> The main contract that implements all the jar functionality, including deposits,
          withdrawals, and access control.
        </li>
        <li>
          <strong>CookieJarFactory:</strong> A factory contract for creating new CookieJar instances and maintaining a
          registry of all created jars.
        </li>
      </ul>

      <p>For more detailed information, please explore the specific sections in the documentation sidebar.</p>
    </div>
  )
}

