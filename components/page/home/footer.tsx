import Link from "next/link"
import Image from "next/image"
import { SocialMediaButtons } from "@/components/page/home/social-media-buttons"

export function Footer() {
  return (
    <footer className="border-t cream-bg">
      <div className="section-container py-12 px-6 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-5">
            <Link href="/" className="flex items-center gap-3">
              <Image src="/logo.png" alt="Cookie Jar Logo" width={48} height={48} />
              <span className="text-2xl font-bold text-[#4a3520]">Cookie Jar V3</span>
            </Link>
            <p className="mt-4 text-lg text-[#4a3520]">
              A platform for creating and managing shared token pools with customizable access rules.
            </p>
          </div>

          <div className="md:col-span-2">
            <h3 className="font-semibold text-xl mb-4 text-[#4a3520]">Product</h3>
            <ul className="space-y-3 text-lg">
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

          <div className="md:col-span-3">
            <h3 className="font-semibold text-xl mb-4 text-[#4a3520]">Resources</h3>
            <ul className="space-y-3 text-lg">
              <li>
                <Link href="/faq" className="text-[#4a3520] hover:text-primary transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/tutorials" className="text-[#4a3520] hover:text-primary transition-colors">
                  Tutorials
                </Link>
              </li>
              <li>
                <Link href="/support" className="text-[#4a3520] hover:text-primary transition-colors">
                  Support
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2 flex flex-col items-center">
            <h3 className="font-semibold text-xl mb-4 text-[#4a3520]">Connect</h3>
            <SocialMediaButtons />
          </div>
        </div>

        <div className="mt-12 pt-8 border-t text-center text-lg text-[#4a3520]">
          <p>© {new Date().getFullYear()} Cookie Jar V3. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
