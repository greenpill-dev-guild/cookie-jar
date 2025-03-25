"use client"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useJarCreation } from "@/hooks/use-jar-creation"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { useAccount } from "wagmi"
import { CustomConnectButton } from "@/components/custom-connect-button"
import { Checkbox } from "@/components/ui/checkbox"

// Form schema
const formSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters" }),
  description: z.string().min(10, { message: "Description must be at least 10 characters" }),
  network: z.string(),
  accessType: z.string(),
  maxWithdrawalAmount: z.string().min(1, { message: "Max withdrawal amount is required" }),
  cooldownPeriod: z.string().min(1, { message: "Cooldown period is required" }),
  cooldownUnit: z.string(),
  requirePurpose: z.boolean(),
  fixedWithdrawalAmount: z.boolean(),
  emergencyWithdrawalEnabled: z.boolean(),
  whitelistAddresses: z.string().optional(),
  nftAddress: z.string().optional(),
  tokenId: z.string().optional(),
  isERC1155: z.boolean().optional(),
  minBalance: z.string().optional(),
})

export function CreateJarForm() {
  const { isConnected, address } = useAccount()
  const { isCreating, createJar } = useJarCreation()
  const { toast } = useToast()
  const router = useRouter()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      network: "base",
      accessType: "whitelist",
      maxWithdrawalAmount: "",
      cooldownPeriod: "1",
      cooldownUnit: "day",
      requirePurpose: true,
      fixedWithdrawalAmount: false,
      emergencyWithdrawalEnabled: true,
      whitelistAddresses: "",
      nftAddress: "",
      tokenId: "0",
      isERC1155: false,
      minBalance: "1",
    },
  })

  const accessType = form.watch("accessType")
  const networkValue = form.watch("network")

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!isConnected || !address) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to create a cookie jar",
        variant: "destructive",
      })
      return
    }

    // Convert cooldown period to seconds
    let cooldownInSeconds = Number.parseInt(values.cooldownPeriod)
    switch (values.cooldownUnit) {
      case "minute":
        cooldownInSeconds *= 60
        break
      case "hour":
        cooldownInSeconds *= 3600
        break
      case "day":
        cooldownInSeconds *= 86400
        break
      case "week":
        cooldownInSeconds *= 604800
        break
    }

    // Process whitelist addresses if applicable
    let whitelistAddresses: string[] | undefined
    if (values.accessType === "whitelist" && values.whitelistAddresses) {
      whitelistAddresses = values.whitelistAddresses
        .split(",")
        .map((addr) => addr.trim())
        .filter((addr) => addr.length > 0)
    }

    // Process NFT config if applicable
    let nftConfig:
      | {
          nftAddress: string
          tokenId: string
          isERC1155: boolean
          minBalance: string
        }
      | undefined

    if (values.accessType === "nft" && values.nftAddress) {
      nftConfig = {
        nftAddress: values.nftAddress,
        tokenId: values.tokenId || "0",
        isERC1155: values.isERC1155 || false,
        minBalance: values.minBalance || "1",
      }
    }

    // Create the jar
    const jarAddress = await createJar(
      values.name,
      values.description,
      values.network,
      values.maxWithdrawalAmount,
      cooldownInSeconds,
      values.requirePurpose,
      values.fixedWithdrawalAmount,
      values.emergencyWithdrawalEnabled,
      values.accessType === "whitelist",
      whitelistAddresses,
      nftConfig,
    )

    if (jarAddress) {
      // Redirect to the new jar page
      router.push(`/jars/${jarAddress}`)
    }
  }

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connect Wallet</CardTitle>
          <CardDescription>You need to connect your wallet to create a cookie jar</CardDescription>
        </CardHeader>
        <CardFooter>
          <CustomConnectButton />
        </CardFooter>
      </Card>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card className="group">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Provide basic details about your cookie jar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jar Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Team Expenses" {...field} className="focus:ring-primary" />
                  </FormControl>
                  <FormDescription>A descriptive name for your cookie jar</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Shared pool for team expenses and reimbursements"
                      {...field}
                      className="focus:ring-primary"
                    />
                  </FormControl>
                  <FormDescription>Explain the purpose and usage of this jar</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="network"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Network</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="focus:ring-primary">
                        <SelectValue placeholder="Select network" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="base">Base</SelectItem>
                      <SelectItem value="optimism">Optimism</SelectItem>
                      <SelectItem value="gnosis">Gnosis Chain</SelectItem>
                      <SelectItem value="sepolia">Sepolia (Testnet)</SelectItem>
                      <SelectItem value="arbitrum">Arbitrum</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>The blockchain network where your jar will be deployed</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Access Control</CardTitle>
            <CardDescription>Define who can withdraw from your cookie jar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="accessType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Access Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="focus:ring-primary">
                        <SelectValue placeholder="Select access type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="whitelist">Whitelist</SelectItem>
                      <SelectItem value="nft">NFT Gated</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>Choose how to control who can withdraw from your jar</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {accessType === "whitelist" && (
              <FormField
                control={form.control}
                name="whitelistAddresses"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Whitelist Addresses</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="0x1234..., 0x5678..., 0xabcd..."
                        {...field}
                        className="focus:ring-primary min-h-[120px]"
                      />
                    </FormControl>
                    <FormDescription>
                      Enter comma-separated Ethereum addresses to whitelist (optional, you can add more later)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {accessType === "nft" && (
              <>
                <FormField
                  control={form.control}
                  name="nftAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>NFT Contract Address</FormLabel>
                      <FormControl>
                        <Input placeholder="0x1234..." {...field} className="focus:ring-primary" />
                      </FormControl>
                      <FormDescription>The address of the NFT contract</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="tokenId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Token ID</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0 for any token"
                            {...field}
                            className="focus:ring-primary"
                          />
                        </FormControl>
                        <FormDescription>Specific token ID or 0 for any token in the collection</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="minBalance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum Balance</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="1" {...field} className="focus:ring-primary" />
                        </FormControl>
                        <FormDescription>Minimum number of tokens required for access</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="isERC1155"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>ERC-1155 NFT</FormLabel>
                        <FormDescription>
                          Check this if the NFT contract follows the ERC-1155 standard (multi-token)
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Withdrawal Rules</CardTitle>
            <CardDescription>Configure how withdrawals work for your cookie jar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="maxWithdrawalAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maximum Withdrawal Amount</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0.1" {...field} className="focus:ring-primary" />
                  </FormControl>
                  <FormDescription>
                    The maximum amount that can be withdrawn in a single transaction (in ETH or tokens)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cooldownPeriod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cooldown Period</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="1" {...field} className="focus:ring-primary" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cooldownUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="focus:ring-primary">
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="minute">Minutes</SelectItem>
                        <SelectItem value="hour">Hours</SelectItem>
                        <SelectItem value="day">Days</SelectItem>
                        <SelectItem value="week">Weeks</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormDescription>Time that must pass between withdrawals for each user</FormDescription>

            <FormField
              control={form.control}
              name="requirePurpose"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Require Purpose</FormLabel>
                    <FormDescription>Users must provide a reason when withdrawing funds</FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fixedWithdrawalAmount"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Fixed Withdrawal Amount</FormLabel>
                    <FormDescription>Users can only withdraw exactly the maximum amount (not less)</FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="emergencyWithdrawalEnabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Enable Emergency Withdrawal</FormLabel>
                    <FormDescription>Allow admins to withdraw all funds in case of emergency</FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={isCreating} variant="cookie">
          {isCreating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Cookie Jar...
            </>
          ) : (
            "Create Cookie Jar"
          )}
        </Button>
      </form>
    </Form>
  )
}

