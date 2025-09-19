"use client"

import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2, AlertCircle } from "lucide-react"

interface StatusCardsProps {
  newJarPreview: {
    address: string
    name: string
    currency: string
  } | null
  formErrors: string[]
  isFormError: boolean
  ETH_ADDRESS: string
}

export const StatusCards: React.FC<StatusCardsProps> = ({
  newJarPreview,
  formErrors,
  isFormError,
  ETH_ADDRESS
}) => {
  return (
    <>
      {/* New Jar Preview Card */}
      {newJarPreview && (
        <Card className="mt-4 border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="text-green-600" size={24} />
              <div className="flex-1">
                <p className="font-medium text-green-800">
                  🎉 {newJarPreview.name} created successfully!
                </p>
                <p className="text-sm text-green-600 mt-1">
                  <strong>Address:</strong> {newJarPreview.address.slice(0, 8)}...{newJarPreview.address.slice(-6)}
                </p>
                <p className="text-sm text-green-600">
                  <strong>Currency:</strong> {newJarPreview.currency === ETH_ADDRESS ? 'ETH' : 'ERC20'}
                </p>
                <p className="text-xs text-green-600 mt-2">
                  Redirecting to your new jar...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {isFormError && formErrors.length > 0 && (
        <Card className="mt-4 border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-900 mb-2">Please fix the following errors:</h3>
                <ul className="list-disc list-inside space-y-1 text-red-700">
                  {formErrors.map((error, index) => (
                    <li key={index} className="text-sm">{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}
