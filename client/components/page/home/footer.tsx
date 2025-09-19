"use client"

import Link from "next/link"

export function Footer() {
  return (
    <footer className="cj-bg-main py-16 md:py-20 mt-32">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <h2 className="text-2xl font-bold text-[#4a3520] mb-4">Cookie Jar</h2>
            <p className="text-[#4a3520] max-w-md leading-relaxed">
              Share resources with customizable access rules, withdrawal limits, and transparent tracking. 
              Built for communities, teams, and organizations.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="font-semibold text-xl mb-4 text-[#4a3520]">Navigate</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/" className="text-[#4a3520] hover:text-primary transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/jars" className="text-[#4a3520] hover:text-primary transition-colors">
                  Explore Jars
                </Link>
              </li>
              <li>
                <Link href="/create" className="text-[#4a3520] hover:text-primary transition-colors">
                  Create Jar
                </Link>
              </li>
              <li>
                <Link href="/docs" className="text-[#4a3520] hover:text-primary transition-colors">
                  Documentation
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold text-xl mb-4 text-[#4a3520]">Resources</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/profile" className="text-[#4a3520] hover:text-primary transition-colors">
                  Profile
                </Link>
              </li>
              <li>
                <a 
                  href="https://github.com/greenpill-dev-guild/cookie-jar" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-[#4a3520] hover:text-primary transition-colors"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-[#4a3520]/20 flex flex-col md:flex-row items-center justify-between">
          <p className="text-[#4a3520] text-sm">
            © {new Date().getFullYear()} Cookie Jar. Built by Greenpill Dev Guild.
          </p>
          <p className="text-[#4a3520] text-sm mt-4 md:mt-0">
            Decentralized resource sharing for communities.
          </p>
        </div>
      </div>
    </footer>
  )
}