"use client"

import React from "react"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { ArrowRight, Check, Cookie, Info, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { useJarCreation } from "@/hooks/use-jar-creation"
import { useRouter } from "next/navigation"

// Validate EVM address
const isValidEVMAddress = (address: string) => {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

// Form schema with enhanced validation
const formSchema = z
  .object({
    name: z
      .string()
      .min(3, { message: "Name must be at least 3 characters" })
      .max(50, { message: "Name must be less than 50 characters" }),

    description: z
      .string()
      .min(10, { message: "Description must be at least 10 characters" })
      .max(500, { message: "Description must be less than 500 characters" }),

    accessType: z.enum(["whitelist", "nft", "open"]),

    cooldownPeriod: z.string().refine((val) => !isNaN(Number.parseInt(val)) && Number.parseInt(val) >= 0, {
      message: "Cooldown period must be a valid number of seconds",
    }),

    cooldownDays: z.coerce.number().min(0).default(0),
    cooldownHours: z.coerce.number().min(0).max(23).default(0),
    cooldownMinutes: z.coerce.number().min(0).max(59).default(0),
    cooldownSeconds: z.coerce.number().min(0).max(59).default(0),

    maxWithdrawal: z.string().refine((val) => !isNaN(Number.parseFloat(val)) && Number.parseFloat(val) > 0, {
      message: "Maximum withdrawal must be greater than 0",
    }),

    // Add a new field for whitelist input mode
    whitelistInputMode: z.enum(["individual", "bulk"]).default("individual"),

    // Add a field for whitelist address count (for individual mode)
    whitelistAddressCount: z.coerce.number().min(1).max(10).default(1),

    // Individual whitelist addresses array (for individual mode)
    individualAddresses: z
      .array(
        z.string().refine((val) => !val || isValidEVMAddress(val), {
          message: "Invalid Ethereum address format",
        }),
      )
      .default([]),

    addresses: z
      .string()
      .optional()
      .refine(
        (val) => {
          if (!val) return true
          const addresses = val.split(",").map((addr) => addr.trim())
          return addresses.every((addr) => isValidEVMAddress(addr))
        },
        {
          message:
            "Invalid Ethereum address format. Addresses must start with 0x followed by 40 hexadecimal characters.",
        },
      ),

    nftAddress: z
      .string()
      .optional()
      .refine(
        (val) => {
          if (!val) return true
          return isValidEVMAddress(val)
        },
        {
          message: "Invalid NFT contract address",
        },
      ),

    tokenId: z
      .string()
      .optional()
      .refine(
        (val) => {
          if (!val) return true
          return !isNaN(Number.parseInt(val)) && Number.parseInt(val) >= 0
        },
        {
          message: "Token ID must be a valid number",
        },
      ),

    minBalance: z
      .string()
      .optional()
      .refine(
        (val) => {
          if (!val) return true
          return !isNaN(Number.parseInt(val)) && Number.parseInt(val) > 0
        },
        {
          message: "Minimum balance must be greater than 0",
        },
      ),

    requirePurpose: z.boolean().default(true),
    fixedWithdrawalAmount: z.boolean().default(false),
    emergencyWithdrawalEnabled: z.boolean().default(true),
  })
  .refine(
    (data) => {
      // If access type is whitelist and input mode is bulk, addresses must be provided
      if (
        data.accessType === "whitelist" &&
        data.whitelistInputMode === "bulk" &&
        (!data.addresses || data.addresses.trim() === "")
      ) {
        return false
      }

      // If access type is whitelist and input mode is bulk, ensure at least 2 addresses are provided
      if (data.accessType === "whitelist" && data.whitelistInputMode === "bulk" && data.addresses) {
        const addressList = data.addresses
          .split(",")
          .map((addr) => addr.trim())
          .filter((addr) => addr !== "")
        if (addressList.length < 2) {
          return false
        }
      }

      // If access type is nft, nftAddress must be provided
      if (data.accessType === "nft" && (!data.nftAddress || !isValidEVMAddress(data.nftAddress))) {
        return false
      }
      return true
    },
    {
      message:
        "Whitelist addresses are required when using whitelist access type. For bulk entry, provide at least 2 comma-separated addresses.",
      path: ["addresses"],
    },
  )
  .refine(
    (data) => {
      // If access type is whitelist and input mode is individual, all specified addresses must be filled
      if (data.accessType === "whitelist" && data.whitelistInputMode === "individual") {
        // Make sure we have the right number of addresses and they're all valid
        return (
          data.individualAddresses.length >= data.whitelistAddressCount &&
          data.individualAddresses.slice(0, data.whitelistAddressCount).every((addr) => isValidEVMAddress(addr))
        )
      }
      return true
    },
    {
      message: "All whitelist addresses must be valid Ethereum addresses",
      path: ["individualAddresses"],
    },
  )

type FormValues = z.infer<typeof formSchema>

// Helper function to calculate total seconds from days, hours, minutes, seconds
const calculateTotalSeconds = (days: number, hours: number, minutes: number, seconds: number): number => {
  return days * 24 * 60 * 60 + hours * 60 * 60 + minutes * 60 + seconds
}

// Helper function to format seconds to human-readable format
const formatTimeComponents = (
  totalSeconds: number,
): { days: number; hours: number; minutes: number; seconds: number } => {
  const days = Math.floor(totalSeconds / (24 * 60 * 60))
  const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60))
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60)
  const seconds = totalSeconds % 60

  return { days, hours, minutes, seconds }
}

// Helper function to format time components to human-readable string
const formatTimeString = (days: number, hours: number, minutes: number, seconds: number): string => {
  const parts = []

  if (days > 0) {
    parts.push(`${days} day${days !== 1 ? "s" : ""}`)
  }

  if (hours > 0) {
    parts.push(`${hours} hour${hours !== 1 ? "s" : ""}`)
  }

  if (minutes > 0) {
    parts.push(`${minutes} minute${minutes !== 1 ? "s" : ""}`)
  }

  if (seconds > 0) {
    parts.push(`${seconds} second${seconds !== 1 ? "s" : ""}`)
  }

  if (parts.length === 0) {
    return "0 seconds"
  }

  return parts.join(", ")
}

export function CreateJarForm() {
  const [step, setStep] = useState(1)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const { toast } = useToast()
  const { isCreating, createJar } = useJarCreation()
  const router = useRouter()

  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      accessType: "whitelist",
      cooldownPeriod: "86400", // 1 day in seconds
      cooldownDays: 1,
      cooldownHours: 0,
      cooldownMinutes: 0,
      cooldownSeconds: 0,
      maxWithdrawal: "0.1",
      addresses: "",
      whitelistInputMode: "individual",
      whitelistAddressCount: 1,
      individualAddresses: [""],
      nftAddress: "",
      tokenId: "0",
      minBalance: "1",
      requirePurpose: true,
      fixedWithdrawalAmount: false,
      emergencyWithdrawalEnabled: true,
    },
    mode: "onChange", // Validate fields on change
  })

  // Update cooldown period when any time component changes
  React.useEffect(() => {
    const days = form.watch("cooldownDays") || 0
    const hours = form.watch("cooldownHours") || 0
    const minutes = form.watch("cooldownMinutes") || 0
    const seconds = form.watch("cooldownSeconds") || 0

    const totalSeconds = calculateTotalSeconds(days, hours, minutes, seconds)
    form.setValue("cooldownPeriod", totalSeconds.toString())
  }, [
    form.watch("cooldownDays"),
    form.watch("cooldownHours"),
    form.watch("cooldownMinutes"),
    form.watch("cooldownSeconds"),
    form,
  ])

  // Form submission handler
  const onSubmit = async (values: FormValues) => {
    try {
      // Prepare whitelist addresses if using whitelist
      let whitelistAddresses: string[] | undefined
      if (values.accessType === "whitelist") {
        if (values.whitelistInputMode === "bulk" && values.addresses) {
          whitelistAddresses = values.addresses
            .split(",")
            .map((addr) => addr.trim())
            .filter((addr) => isValidEVMAddress(addr))
        } else if (values.whitelistInputMode === "individual") {
          whitelistAddresses = values.individualAddresses.filter((addr) => isValidEVMAddress(addr))
        }
      }

      // Prepare NFT config if using NFT gating
      let nftConfig: { nftAddress: string; tokenId: string; isERC1155: boolean; minBalance: string } | undefined
      if (values.accessType === "nft" && values.nftAddress) {
        nftConfig = {
          nftAddress: values.nftAddress,
          tokenId: values.tokenId || "0",
          isERC1155: false, // Default to ERC721
          minBalance: values.minBalance || "1",
        }
      }

      // Create the jar
      const jarAddress = await createJar(
        values.name,
        values.description,
        values.maxWithdrawal,
        Number.parseInt(values.cooldownPeriod),
        values.requirePurpose,
        values.fixedWithdrawalAmount,
        values.emergencyWithdrawalEnabled,
        values.accessType === "whitelist", // useWhitelist
        whitelistAddresses,
        nftConfig,
      )

      if (jarAddress) {
        // Navigate to the jar page
        router.push(`/jars/${jarAddress}`)
      }
    } catch (error) {
      console.error("Error creating jar:", error)
      toast({
        title: "Error Creating Jar",
        description: "There was an error creating your cookie jar. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Step indicators
  const StepIndicator = ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => {
    return (
      <div className="flex items-center justify-center mb-8">
        {Array.from({ length: totalSteps }).map((_, index) => {
          const stepNumber = index + 1
          const isActive = stepNumber === currentStep
          const isCompleted = stepNumber < currentStep

          return (
            <div key={stepNumber} className="flex items-center">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-white font-medium transition-all duration-300",
                  isActive ? "bg-[#ff5e14] scale-110" : isCompleted ? "bg-green-500" : "bg-gray-300",
                )}
              >
                {isCompleted ? <Check className="h-5 w-5" /> : stepNumber}
              </div>

              {stepNumber < totalSteps && (
                <div className={cn("h-1 w-10 mx-1", stepNumber < currentStep ? "bg-green-500" : "bg-gray-300")} />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // Animation variants
  const variants = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 },
  }

  // Custom back button
  const BackButton = ({ onClick }: { onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      className="relative w-[120px] h-[50px] flex items-center justify-center rounded-xl overflow-hidden"
    >
      <div className="absolute inset-0 bg-[#3c2a14] rounded-xl opacity-95"></div>
      <div className="absolute inset-[1px] bg-[#1e120a] rounded-xl"></div>
      <span className="relative text-[#c29e66] font-medium z-10">Back</span>
    </button>
  )

  return (
    <div className="max-w-3xl mx-auto">
      <StepIndicator currentStep={step} totalSteps={4} />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={variants}
                transition={{ duration: 0.3 }}
                className="bg-white p-8 rounded-xl shadow-md"
              >
                <h2 className="text-2xl font-bold text-[#3c2a14] mb-6">Basic Information</h2>

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="mb-6">
                      <FormLabel className="text-[#3c2a14] text-lg">Jar Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Team Expenses"
                          className="h-14 text-lg bg-white text-[#3c2a14] border-2 focus-visible:ring-[#ff5e14]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#3c2a14] text-lg">Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the purpose of this jar..."
                          className="min-h-32 text-lg bg-white text-[#3c2a14] border-2 focus-visible:ring-[#ff5e14]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end mt-8">
                  <Button
                    type="button"
                    onClick={() => {
                      form.trigger(["name", "description"]).then((isValid: boolean) => {
                        if (isValid) setStep(2)
                      })
                    }}
                    className="bg-[#ff5e14] hover:bg-[#ff5e14]/90 text-white px-8 py-6 text-lg rounded-xl"
                  >
                    Next <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={variants}
                transition={{ duration: 0.3 }}
                className="bg-white p-8 rounded-xl shadow-md"
              >
                <h2 className="text-2xl font-bold text-[#3c2a14] mb-6">Access Control</h2>

                <FormField
                  control={form.control}
                  name="accessType"
                  render={({ field }) => (
                    <FormItem className="mb-6">
                      <FormLabel className="text-[#3c2a14] text-lg">Access Type</FormLabel>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="inline-flex items-center">
                              <Info className="h-4 w-4 text-[#ff5e14] ml-2" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Who can withdraw from this jar?</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value)
                          // Clear the related fields when changing access type
                          if (value === "whitelist") {
                            form.setValue("nftAddress", "")
                            form.setValue("tokenId", "0")
                            form.setValue("minBalance", "1")
                          } else if (value === "nft") {
                            form.setValue("addresses", "")
                          } else {
                            form.setValue("addresses", "")
                            form.setValue("nftAddress", "")
                            form.setValue("tokenId", "0")
                            form.setValue("minBalance", "1")
                          }
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-14 text-lg bg-white text-[#3c2a14] border-2 focus:ring-[#ff5e14]">
                            <SelectValue placeholder="Select access type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="whitelist">Whitelist (specific addresses)</SelectItem>
                          <SelectItem value="nft">NFT Gated (token holders)</SelectItem>
                          <SelectItem value="open">Open (anyone can withdraw)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("accessType") === "whitelist" && (
                  <>
                    <FormField
                      control={form.control}
                      name="whitelistInputMode"
                      render={({ field }) => (
                        <FormItem className="mb-4">
                          <FormLabel className="text-[#3c2a14] text-lg">Input Mode</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex flex-col space-y-2"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem
                                  value="individual"
                                  id="individual-mode"
                                  className="h-5 w-5 text-[#ff5e14] border-2 border-gray-300"
                                />
                                <label htmlFor="individual-mode" className="text-[#3c2a14] font-medium">
                                  Individual Entries
                                </label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem
                                  value="bulk"
                                  id="bulk-mode"
                                  className="h-5 w-5 text-[#ff5e14] border-2 border-gray-300"
                                />
                                <label htmlFor="bulk-mode" className="text-[#3c2a14] font-medium">
                                  Bulk Entry (Comma Separated)
                                </label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {form.watch("whitelistInputMode") === "individual" && (
                      <FormField
                        control={form.control}
                        name="whitelistAddressCount"
                        render={({ field }) => (
                          <FormItem className="mb-4">
                            <FormLabel className="text-[#3c2a14] text-lg">Number of Addresses</FormLabel>
                            <div className="flex items-center space-x-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newCount = Math.max(1, Number(field.value) - 1)
                                  field.onChange(newCount)

                                  // Update the individualAddresses array to match the new count
                                  const newAddresses = [...form.getValues("individualAddresses")]
                                  if (newAddresses.length > newCount) {
                                    newAddresses.length = newCount
                                  }
                                  form.setValue("individualAddresses", newAddresses)
                                }}
                                disabled={Number(field.value) <= 1}
                              >
                                -
                              </Button>
                              <span className="text-xl font-medium text-[#3c2a14] min-w-[30px] text-center">
                                {Number(field.value)}
                              </span>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newCount = Math.min(10, Number(field.value) + 1)
                                  field.onChange(newCount)

                                  // Update the individualAddresses array to match the new count
                                  const newAddresses = [...form.getValues("individualAddresses")]
                                  while (newAddresses.length < newCount) {
                                    newAddresses.push("")
                                  }
                                  form.setValue("individualAddresses", newAddresses)
                                }}
                                disabled={Number(field.value) >= 10}
                              >
                                +
                              </Button>
                            </div>
                            <FormDescription>Choose how many addresses you want to add (max 10)</FormDescription>
                          </FormItem>
                        )}
                      />
                    )}

                    {form.watch("whitelistInputMode") === "individual" ? (
                      <div className="space-y-4 mb-4">
                        <FormLabel className="text-[#3c2a14] text-lg">Whitelisted Addresses</FormLabel>
                        <FormDescription>
                          Each address must start with 0x followed by 40 hexadecimal characters.
                        </FormDescription>
                        {Array.from({ length: form.watch("whitelistAddressCount") }).map((_, index) => (
                          <FormField
                            key={index}
                            control={form.control}
                            name={`individualAddresses.${index}`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    placeholder={`Address ${index + 1}`}
                                    className="h-14 text-lg bg-white text-[#3c2a14] border-2 focus-visible:ring-[#ff5e14]"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    ) : (
                      <FormField
                        control={form.control}
                        name="addresses"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[#3c2a14] text-lg">Whitelisted Addresses</FormLabel>
                            <FormDescription>
                              Enter addresses separated by commas. Each address must start with 0x followed by 40
                              hexadecimal characters. You must provide at least 2 addresses.
                            </FormDescription>
                            <FormControl>
                              <Textarea
                                placeholder="0x123..., 0x456..."
                                className="min-h-32 text-lg bg-white text-[#3c2a14] border-2 focus-visible:ring-[#ff5e14]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </>
                )}

                {form.watch("accessType") === "nft" && (
                  <>
                    <FormField
                      control={form.control}
                      name="nftAddress"
                      render={({ field }) => (
                        <FormItem className="mb-4">
                          <FormLabel className="text-[#3c2a14] text-lg">NFT Contract Address</FormLabel>
                          <FormDescription>
                            Must be a valid EVM address (0x followed by 40 hexadecimal characters)
                          </FormDescription>
                          <FormControl>
                            <Input
                              placeholder="0x123..."
                              className="h-14 text-lg bg-white text-[#3c2a14] border-2 focus-visible:ring-[#ff5e14]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="tokenId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[#3c2a14] text-lg">Token ID (0 for any)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="0"
                                className="h-14 text-lg bg-white text-[#3c2a14] border-2 focus-visible:ring-[#ff5e14]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="minBalance"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[#3c2a14] text-lg">Minimum Balance</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="1"
                                className="h-14 text-lg bg-white text-[#3c2a14] border-2 focus-visible:ring-[#ff5e14]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </>
                )}

                <div className="flex justify-between mt-8">
                  <BackButton onClick={() => setStep(1)} />
                  <Button
                    type="button"
                    onClick={() => {
                      const fieldsToValidate = ["accessType"]
                      if (form.watch("accessType") === "whitelist") {
                        fieldsToValidate.push("whitelistInputMode")
                        if (form.watch("whitelistInputMode") === "bulk") {
                          fieldsToValidate.push("addresses")
                        } else {
                          fieldsToValidate.push("whitelistAddressCount")
                          // Explicitly validate all individual address fields
                          for (let i = 0; i < form.watch("whitelistAddressCount"); i++) {
                            fieldsToValidate.push(`individualAddresses.${i}`)
                          }
                        }
                      } else if (form.watch("accessType") === "nft") {
                        fieldsToValidate.push("nftAddress", "tokenId", "minBalance")
                      }

                      form.trigger(fieldsToValidate as any).then((isValid: boolean) => {
                        // Additional validation for individual addresses
                        if (
                          isValid &&
                          form.watch("accessType") === "whitelist" &&
                          form.watch("whitelistInputMode") === "individual"
                        ) {
                          const individualAddresses = form.getValues("individualAddresses")
                          const addressCount = form.getValues("whitelistAddressCount")

                          // Check if we have the right number of valid addresses
                          const validAddresses = individualAddresses.filter((addr) => isValidEVMAddress(addr))

                          if (validAddresses.length < addressCount) {
                            // Set error on the first empty/invalid address
                            for (let i = 0; i < addressCount; i++) {
                              if (!isValidEVMAddress(individualAddresses[i] || "")) {
                                form.setError(`individualAddresses.${i}`, {
                                  type: "manual",
                                  message: "Valid Ethereum address required",
                                })
                              }
                            }
                            return
                          }
                        }

                        if (isValid) setStep(3)
                      })
                    }}
                    className="bg-[#ff5e14] hover:bg-[#ff5e14]/90 text-white px-8 py-6 text-lg rounded-xl"
                  >
                    Next <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={variants}
                transition={{ duration: 0.3 }}
                className="bg-white p-8 rounded-xl shadow-md"
              >
                <h2 className="text-2xl font-bold text-[#3c2a14] mb-6">Withdrawal Rules</h2>

                <div className="mb-6">
                  <FormLabel className="text-[#3c2a14] text-lg">Cooldown Period</FormLabel>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="inline-flex items-center">
                          <Info className="h-4 w-4 text-[#ff5e14] ml-2" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Time between withdrawals</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <div className="grid grid-cols-4 gap-4 mt-2">
                    <div>
                      <FormField
                        control={form.control}
                        name="cooldownDays"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm text-gray-600">Days</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                className="h-14 text-lg bg-white text-[#3c2a14] border-2 focus-visible:ring-[#ff5e14]"
                                {...field}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div>
                      <FormField
                        control={form.control}
                        name="cooldownHours"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm text-gray-600">Hours</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                max="23"
                                className="h-14 text-lg bg-white text-[#3c2a14] border-2 focus-visible:ring-[#ff5e14]"
                                {...field}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div>
                      <FormField
                        control={form.control}
                        name="cooldownMinutes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm text-gray-600">Minutes</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                max="59"
                                className="h-14 text-lg bg-white text-[#3c2a14] border-2 focus-visible:ring-[#ff5e14]"
                                {...field}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div>
                      <FormField
                        control={form.control}
                        name="cooldownSeconds"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm text-gray-600">Seconds</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                max="59"
                                className="h-14 text-lg bg-white text-[#3c2a14] border-2 focus-visible:ring-[#ff5e14]"
                                {...field}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="flex items-center mt-2 text-sm text-gray-500">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>
                      Current cooldown:{" "}
                      {formatTimeString(
                        form.watch("cooldownDays") || 0,
                        form.watch("cooldownHours") || 0,
                        form.watch("cooldownMinutes") || 0,
                        form.watch("cooldownSeconds") || 0,
                      )}
                    </span>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="maxWithdrawal"
                  render={({ field }) => (
                    <FormItem className="mb-6">
                      <FormLabel className="text-[#3c2a14] text-lg">Maximum Withdrawal (ETH)</FormLabel>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="inline-flex items-center">
                              <Info className="h-4 w-4 text-[#ff5e14] ml-2" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Maximum amount that can be withdrawn in a single transaction</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.1"
                          className="h-14 text-lg bg-white text-[#3c2a14] border-2 focus-visible:ring-[#ff5e14]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="requirePurpose"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-[#3c2a14] text-lg">Require Purpose</FormLabel>
                          <FormDescription>Require users to provide a reason when withdrawing</FormDescription>
                        </div>
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="h-6 w-6 rounded border-gray-300 text-[#ff5e14] focus:ring-[#ff5e14]"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fixedWithdrawalAmount"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-[#3c2a14] text-lg">Fixed Withdrawal Amount</FormLabel>
                          <FormDescription>Force users to withdraw exactly the maximum amount</FormDescription>
                        </div>
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="h-6 w-6 rounded border-gray-300 text-[#ff5e14] focus:ring-[#ff5e14]"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="emergencyWithdrawalEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-[#3c2a14] text-lg">Emergency Withdrawal</FormLabel>
                          <FormDescription>Allow admins to withdraw all funds in case of emergency</FormDescription>
                        </div>
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="h-6 w-6 rounded border-gray-300 text-[#ff5e14] focus:ring-[#ff5e14]"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-between mt-8">
                  <BackButton onClick={() => setStep(2)} />
                  <Button
                    type="button"
                    onClick={() => {
                      form.trigger(["cooldownPeriod", "maxWithdrawal"]).then((isValid: boolean) => {
                        if (isValid) setStep(4)
                      })
                    }}
                    className="bg-[#ff5e14] hover:bg-[#ff5e14]/90 text-white px-8 py-6 text-lg rounded-xl"
                  >
                    Next <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={variants}
                transition={{ duration: 0.3 }}
                className="bg-white p-8 rounded-xl shadow-md"
              >
                <h2 className="text-2xl font-bold text-[#3c2a14] mb-6">Review & Create</h2>

                <div className="space-y-6">
                  <div className="bg-[#fff8f0] p-4 rounded-lg">
                    <h3 className="font-semibold text-[#3c2a14]">Jar Name</h3>
                    <p className="text-[#4a3520]">{form.getValues().name}</p>
                  </div>

                  <div className="bg-[#fff8f0] p-4 rounded-lg">
                    <h3 className="font-semibold text-[#3c2a14]">Description</h3>
                    <p className="text-[#4a3520]">{form.getValues().description}</p>
                  </div>

                  <div className="bg-[#fff8f0] p-4 rounded-lg">
                    <h3 className="font-semibold text-[#3c2a14]">Access Type</h3>
                    <p className="text-[#4a3520] capitalize">{form.getValues().accessType}</p>

                    {form.getValues().accessType === "whitelist" && (
                      <div className="mt-2">
                        <h4 className="font-medium text-[#3c2a14]">Whitelisted Addresses</h4>
                        {form.getValues().whitelistInputMode === "bulk" ? (
                          <p className="text-[#4a3520] text-sm break-all">{form.getValues().addresses}</p>
                        ) : (
                          <div className="space-y-1">
                            {form.getValues().individualAddresses.map((addr: string, index: number) => (
                              <p key={index} className="text-[#4a3520] text-sm break-all">
                                {index + 1}. {addr}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {form.getValues().accessType === "nft" && form.getValues().nftAddress && (
                      <div className="mt-2">
                        <h4 className="font-medium text-[#3c2a14]">NFT Contract</h4>
                        <p className="text-[#4a3520] text-sm break-all">{form.getValues().nftAddress}</p>
                        <p className="text-[#4a3520] text-sm">
                          Token ID: {form.getValues().tokenId || "0"} (Min Balance: {form.getValues().minBalance || "1"}
                          )
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="bg-[#fff8f0] p-4 rounded-lg">
                    <h3 className="font-semibold text-[#3c2a14]">Withdrawal Rules</h3>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div>
                        <h4 className="font-medium text-[#3c2a14]">Cooldown Period</h4>
                        <p className="text-[#4a3520]">
                          {formatTimeString(
                            form.getValues().cooldownDays || 0,
                            form.getValues().cooldownHours || 0,
                            form.getValues().cooldownMinutes || 0,
                            form.getValues().cooldownSeconds || 0,
                          )}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-medium text-[#3c2a14]">Max Withdrawal</h4>
                        <p className="text-[#4a3520]">{form.getValues().maxWithdrawal} ETH</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div>
                        <h4 className="font-medium text-[#3c2a14]">Require Purpose</h4>
                        <p className="text-[#4a3520]">{form.getValues().requirePurpose ? "Yes" : "No"}</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-[#3c2a14]">Fixed Amount</h4>
                        <p className="text-[#4a3520]">{form.getValues().fixedWithdrawalAmount ? "Yes" : "No"}</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-[#3c2a14]">Emergency Withdrawal</h4>
                        <p className="text-[#4a3520]">
                          {form.getValues().emergencyWithdrawalEnabled ? "Enabled" : "Disabled"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between mt-8">
                  <BackButton onClick={() => setStep(3)} />
                  <Button
                    type="button"
                    disabled={isCreating}
                    onClick={() => setShowConfirmation(true)}
                    className="bg-[#ff5e14] hover:bg-[#ff5e14]/90 text-white px-8 py-6 text-lg rounded-xl"
                  >
                    {isCreating ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Creating...
                      </>
                    ) : (
                      <>
                        Create Jar <Cookie className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </Form>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-[#3c2a14] bg-opacity-50 backdrop-blur-sm"
            onClick={() => setShowConfirmation(false)}
          ></div>
          <div className="relative bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold text-[#3c2a14] mb-4">Confirm Creation</h3>
            <p className="text-[#4a3520] mb-6">
              Please double-check all your inputs carefully. Once created, the jar's configuration cannot be modified in
              the future.
            </p>
            <div className="flex justify-between space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowConfirmation(false)}
                className="border-[#ff5e14] text-[#ff5e14] hover:bg-[#ff5e14]/10 hover:text-[#3c2a14] bg-[#fff8f0] flex-1"
              >
                Check Again
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setShowConfirmation(false)
                  form.handleSubmit(onSubmit)()
                }}
                className="bg-[#ff5e14] hover:bg-[#ff5e14]/90 text-white flex-1"
              >
                Create Jar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

