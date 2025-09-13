import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, AlertCircle, Search, ExternalLink } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// POAP SDK integration
interface POAPEvent {
  id: string
  name: string
  description: string
  image_url?: string
  start_date?: string
  end_date?: string
  supply?: number
}

interface POAPGateConfigProps {
  onConfigChange: (config: { eventId: string; eventName?: string }) => void
  initialConfig?: { eventId: string; eventName?: string }
  className?: string
}

export const POAPGateConfig: React.FC<POAPGateConfigProps> = ({
  onConfigChange,
  initialConfig,
  className = ''
}) => {
  const [eventId, setEventId] = useState(initialConfig?.eventId || '')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<POAPEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState<POAPEvent | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')

  // Debounce search term to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500)
    
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Search POAP events when debounced search term changes
  useEffect(() => {
    if (debouncedSearchTerm.length >= 3) {
      searchPOAPEvents(debouncedSearchTerm)
    } else {
      setSearchResults([])
    }
  }, [debouncedSearchTerm])

  // Validate event ID when manually entered
  useEffect(() => {
    if (eventId && eventId !== selectedEvent?.id) {
      validateEventId(eventId)
    }
  }, [eventId, selectedEvent])

  // Notify parent when configuration changes
  useEffect(() => {
    if (eventId && selectedEvent) {
      onConfigChange({
        eventId,
        eventName: selectedEvent.name
      })
    }
  }, [eventId, selectedEvent, onConfigChange])

  const searchPOAPEvents = async (query: string) => {
    setIsSearching(true)
    try {
      // Note: This is a mock implementation
      // In a real implementation, you would use the POAP SDK:
      // import { PoapSDK } from '@poap-xyz/poap-sdk'
      // const sdk = new PoapSDK()
      // const results = await sdk.getEvents({ name: query })
      
      // Mock data for demonstration
      const mockResults: POAPEvent[] = [
        {
          id: '12345',
          name: `${query} Conference 2024`,
          description: 'Annual blockchain conference',
          image_url: 'https://example.com/poap1.png',
          start_date: '2024-01-15',
          supply: 500
        },
        {
          id: '12346', 
          name: `${query} Workshop`,
          description: 'Technical workshop on DeFi',
          image_url: 'https://example.com/poap2.png',
          start_date: '2024-02-01',
          supply: 100
        }
      ]
      
      setSearchResults(mockResults)
    } catch (error) {
      console.error('Error searching POAP events:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const validateEventId = async (id: string) => {
    if (!id || isNaN(Number(id))) {
      setValidationError('Please enter a valid numeric event ID')
      setSelectedEvent(null)
      return
    }

    setIsValidating(true)
    setValidationError(null)

    try {
      // Note: This is a mock implementation
      // In a real implementation, you would use the POAP SDK:
      // const sdk = new PoapSDK()
      // const event = await sdk.getEvent(id)
      
      // Mock validation
      const mockEvent: POAPEvent = {
        id,
        name: `Event #${id}`,
        description: 'POAP Event',
        start_date: '2024-01-01',
        supply: 1000
      }
      
      setSelectedEvent(mockEvent)
    } catch (error) {
      setValidationError('Event ID not found or invalid')
      setSelectedEvent(null)
    } finally {
      setIsValidating(false)
    }
  }

  const handleEventSelect = (event: POAPEvent) => {
    setEventId(event.id)
    setSelectedEvent(event)
    setSearchTerm('')
    setSearchResults([])
  }

  const getValidationIcon = () => {
    if (!eventId) return null
    if (isValidating) return <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
    if (selectedEvent) return <CheckCircle2 className="h-4 w-4 text-green-500" />
    if (validationError) return <AlertCircle className="h-4 w-4 text-red-500" />
    return null
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <Label className="text-[#3c2a14] text-base font-semibold">POAP Event Configuration</Label>
        <p className="text-sm text-[#8b7355] mt-1">
          Configure which POAP event badge holders can access this jar
        </p>
      </div>

      {/* Event ID Input */}
      <div className="space-y-4">
        <div>
          <Label className="text-sm text-[#3c2a14]">POAP Event ID</Label>
          <div className="relative">
            <Input
              placeholder="Enter POAP event ID"
              className="bg-white border-gray-300 text-[#3c2a14] pr-8"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              {getValidationIcon()}
            </div>
          </div>
          {validationError && (
            <p className="text-xs text-red-600 mt-1">{validationError}</p>
          )}
          {selectedEvent && !validationError && (
            <p className="text-xs text-green-600 mt-1">✓ Valid POAP event</p>
          )}
        </div>

        {/* Event Search */}
        <div>
          <Label className="text-sm text-[#3c2a14]">Or Search Events</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#8b7355]" />
            <Input
              placeholder="Search POAP events by name..."
              className="bg-white border-gray-300 text-[#3c2a14] pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <p className="text-xs text-[#8b7355] mt-1">
            Search for events by name to find the event ID
          </p>
        </div>

        {/* Search Results */}
        {isSearching && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-[#ff5e14]" />
            <span className="ml-2 text-[#8b7355]">Searching POAP events...</span>
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm text-[#3c2a14]">Search Results</Label>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {searchResults.map((event) => (
                <Card 
                  key={event.id}
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => handleEventSelect(event)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-[#3c2a14]">{event.name}</h4>
                          <Badge variant="outline">ID: {event.id}</Badge>
                        </div>
                        <p className="text-sm text-[#8b7355] mt-1">{event.description}</p>
                        {event.start_date && (
                          <p className="text-xs text-[#8b7355] mt-1">
                            Date: {new Date(event.start_date).toLocaleDateString()}
                          </p>
                        )}
                        {event.supply && (
                          <p className="text-xs text-[#8b7355]">
                            Supply: {event.supply} POAPs
                          </p>
                        )}
                      </div>
                      {event.image_url && (
                        <img
                          src={event.image_url}
                          alt={event.name}
                          className="w-12 h-12 rounded-lg object-cover ml-4"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Selected Event Display */}
        {selectedEvent && (
          <Card className="border-l-4 border-l-[#ff5e14]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Selected POAP Event</span>
                <Badge className="bg-[#ff5e14] text-white">ID: {selectedEvent.id}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <h4 className="font-medium text-[#3c2a14]">{selectedEvent.name}</h4>
                <p className="text-sm text-[#8b7355]">{selectedEvent.description}</p>
                {selectedEvent.start_date && (
                  <p className="text-xs text-[#8b7355]">
                    Event Date: {new Date(selectedEvent.start_date).toLocaleDateString()}
                  </p>
                )}
                {selectedEvent.supply && (
                  <p className="text-xs text-[#8b7355]">
                    Total POAPs: {selectedEvent.supply}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Help Text */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-[#3c2a14] mb-2">How POAP Gating Works</h4>
          <ul className="text-xs text-[#8b7355] space-y-1 list-disc list-inside">
            <li>Only holders of the specified POAP event badge can access the jar</li>
            <li>POAPs are non-transferable, so access rights cannot be traded</li>
            <li>Users will need to provide their POAP token ID when withdrawing</li>
            <li>Each POAP token ID can only be used once per withdrawal interval</li>
          </ul>
          
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-[#8b7355] font-medium">Note:</p>
            <p className="text-xs text-[#8b7355]">
              Event validation is currently done off-chain. Future versions may include on-chain 
              verification via merkle proofs or oracles.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
