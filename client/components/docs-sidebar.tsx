"use client"

import type React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface DocsSidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function DocsSidebar({ className, ...props }: DocsSidebarProps) {
  const pathname = usePathname()

  const items = [
    {
      title: "Getting Started",
      items: [
        {
          title: "Introduction",
          href: "/docs",
          active: pathname === "/docs",
        },
        {
          title: "Installation",
          href: "/docs/installation",
          active: pathname === "/docs/installation",
        },
      ],
    },
    {
      title: "Core Concepts",
      items: [
        {
          title: "Cookie Jars",
          href: "/docs/cookie-jars",
          active: pathname === "/docs/cookie-jars",
        },
        {
          title: "Access Control",
          href: "/docs/access-control",
          active: pathname === "/docs/access-control",
        },
        {
          title: "Withdrawal Rules",
          href: "/docs/withdrawal-rules",
          active: pathname === "/docs/withdrawal-rules",
        },
      ],
    },
    {
      title: "Guides",
      items: [
        {
          title: "Creating a Jar",
          href: "/docs/creating-a-jar",
          active: pathname === "/docs/creating-a-jar",
        },
        {
          title: "Managing a Jar",
          href: "/docs/managing-a-jar",
          active: pathname === "/docs/managing-a-jar",
        },
        {
          title: "Withdrawing Funds",
          href: "/docs/withdrawing-funds",
          active: pathname === "/docs/withdrawing-funds",
        },
      ],
    },
    {
      title: "API Reference",
      items: [
        {
          title: "Smart Contracts",
          href: "/docs/smart-contracts",
          active: pathname === "/docs/smart-contracts",
        },
        {
          title: "JavaScript SDK",
          href: "/docs/javascript-sdk",
          active: pathname === "/docs/javascript-sdk",
        },
      ],
    },
  ]

  return (
    <div className="w-full py-8 pr-4 lg:py-10">
      <div className="space-y-6">
        {items.map((item) => (
          <div key={item.title} className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">{item.title}</h4>
            {item.items.map((subItem) => (
              <Button
                key={subItem.href}
                variant="ghost"
                size="sm"
                className={cn(
                  "w-full justify-start font-normal",
                  subItem.active ? "bg-muted font-medium" : "font-normal",
                )}
                asChild
              >
                <Link href={subItem.href}>{subItem.title}</Link>
              </Button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

