"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useWallet } from "@/components/wallet-provider"
import { useCookieJars } from "@/hooks/use-cookie-jars"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { AnimatedButton } from "@/components/animated-button"
import { Clock, Cookie, Shield } from "lucide-react"

export function JarsList() {
  const { isConnected } = useWallet()
  const { jars, loading, error, fetchJars } = useCookieJars()

  // Format time period from seconds to human-readable format
  const formatTimePeriod = (seconds: string) => {
    const sec = Number.parseInt(seconds)
    if (sec < 60) return `${sec} seconds`
    if (sec < 3600) return `${Math.floor(sec / 60)} minutes`
    if (sec < 86400) return `${Math.floor(sec / 3600)} hours`
    return `${Math.floor(sec / 86400)} days`
  }

  // Refresh jars when connection status changes
  useEffect(() => {
    if (isConnected) {
      fetchJars()
    }
  }, [isConnected, fetchJars])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="feature-card">
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-6 w-full mb-6" />
            <div className="space-y-4">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <div className="flex justify-between">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-6 w-1/3" />
              </div>
            </div>
            <div className="mt-6">
              <Skeleton className="h-14 w-full rounded-full" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-24 bg-white rounded-2xl shadow-xl p-12">
        <Cookie className="h-16 w-16 mx-auto text-primary mb-6" />
        <h3 className="text-3xl font-semibold mb-4">ERROR LOADING COOKIE JARS</h3>
        <p className="text-xl text-muted-foreground mb-8">{error}</p>
        <AnimatedButton text="TRY AGAIN" onClick={fetchJars} />
      </div>
    )
  }

  if (jars.length === 0) {
    return (
      <div className="text-center py-24 bg-white rounded-2xl shadow-xl p-12">
        <Cookie className="h-16 w-16 mx-auto text-primary mb-6" />
        <h3 className="text-3xl font-semibold mb-4">NO COOKIE JARS FOUND</h3>
        <p className="text-xl text-muted-foreground mb-8">
          {isConnected
            ? "There are no cookie jars available with the current filters."
            : "Connect your wallet to see cookie jars on your network."}
        </p>
        <Link href="/create">
          <AnimatedButton text="CREATE A COOKIE JAR" />
        </Link>
      </div>
    )
  }

  // Filter out blacklisted jars for regular users (they would still be visible to fee collector in admin panel)
  const filteredJars = jars.filter((jar) => !jar.isBlacklisted)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {filteredJars.map((jar) => (
        <div key={jar.id} className="feature-card flex flex-col h-full">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-2xl font-bold">{jar.name}</h3>
            <Badge
              variant={jar.network === "Sepolia" ? "outline" : "default"}
              className="text-lg px-4 py-1 bg-primary/10 text-primary border-none"
            >
              {jar.network}
            </Badge>
          </div>
          <p className="text-lg text-muted-foreground mb-6">{jar.description}</p>

          <div className="flex-grow space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-lg text-muted-foreground">
                <Shield className="h-5 w-5 mr-2 text-primary" />
                <span>{jar.accessType}</span>
              </div>
              <div className="flex items-center text-lg text-muted-foreground">
                <Clock className="h-5 w-5 mr-2 text-primary" />
                <span>{formatTimePeriod(jar.cooldownPeriod)} cooldown</span>
              </div>
            </div>
            <div className="flex items-center justify-between font-medium text-xl">
              <div>Balance:</div>
              <div className="text-primary">
                {jar.balance} {jar.token}
              </div>
            </div>
            <div className="flex items-center justify-between text-lg">
              <div className="text-muted-foreground">Max withdrawal:</div>
              <div>
                {jar.maxWithdrawal} {jar.token}
              </div>
            </div>
          </div>

          <div className="mt-8">
            <Link href={`/jars/${jar.id}`}>
              <div className="btn-conteiner w-full">
                <a className="btn-content w-full justify-center">
                  <span className="btn-title">{jar.isEligible ? "VIEW & WITHDRAW" : "VIEW DETAILS"}</span>
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
              </div>
            </Link>
          </div>
        </div>
      ))}
    </div>
  )
}

