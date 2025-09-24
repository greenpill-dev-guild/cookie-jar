import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search, Loader2, CheckCircle2 } from "lucide-react";
import { ProtocolConfigBase } from "../base/ProtocolConfigBase";
import { POAPProvider } from "@/lib/nft/protocols/POAPProvider";
import { useDebounce } from "@/hooks/app/useDebounce";

interface POAPEvent {
  id: string | number;
  name: string;
  description?: string;
  image_url?: string;
  start_date?: string;
  end_date?: string;
  supply?: number;
}

export interface POAPConfigProps {
  onConfigChange: (config: { eventId: string; eventName?: string }) => void;
  initialConfig?: { eventId: string; eventName?: string };
  className?: string;
}

export const POAPConfig: React.FC<POAPConfigProps> = ({
  onConfigChange,
  initialConfig,
  className,
}) => {
  const [eventId, setEventId] = useState(initialConfig?.eventId || "");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<POAPEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<POAPEvent | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Load initial event if provided
  useEffect(() => {
    if (initialConfig?.eventId && !selectedEvent) {
      setIsValidating(true);
      POAPProvider.getEventById(initialConfig.eventId)
        .then((event) => {
          if (event) {
            setSelectedEvent(event);
            setValidationError(null);
          } else {
            setValidationError("Initial POAP event not found.");
          }
        })
        .catch(() => {
          setValidationError("Failed to load initial POAP event.");
        })
        .finally(() => {
          setIsValidating(false);
        });
    }
  }, [initialConfig, selectedEvent]);

  // Search for events
  useEffect(() => {
    if (debouncedSearchTerm.length >= 3) {
      setIsSearching(true);
      setSearchResults([]);
      
      POAPProvider.searchEvents(debouncedSearchTerm)
        .then((events) => {
          setSearchResults(events.slice(0, 10)); // Limit to 10 results
        })
        .catch((err) => {
          console.error("Error searching POAP events:", err);
          setSearchResults([]);
        })
        .finally(() => {
          setIsSearching(false);
        });
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearchTerm]);

  const handleEventSelect = (event: POAPEvent) => {
    setSelectedEvent(event);
    const eventIdStr = String(event.id);
    setEventId(eventIdStr);
    setSearchTerm(""); // Clear search
    setSearchResults([]);
    setValidationError(null);
    onConfigChange({ eventId: eventIdStr, eventName: event.name });
  };

  const handleEventIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEventId = e.target.value;
    setEventId(newEventId);
    setSelectedEvent(null);
    setValidationError(null);
    
    if (newEventId) {
      onConfigChange({ eventId: newEventId });
    }
  };

  const handleValidateEventId = async () => {
    if (!eventId) {
      setValidationError("Please enter a POAP Event ID.");
      return;
    }
    
    setIsValidating(true);
    setValidationError(null);
    
    try {
      const event = await POAPProvider.getEventById(eventId);
          if (event) {
            setSelectedEvent(event);
            onConfigChange({ eventId: String(event.id), eventName: event.name });
          } else {
        setValidationError("POAP Event ID not found.");
        setSelectedEvent(null);
      }
    } catch (err) {
      setValidationError("Error validating POAP Event ID.");
      setSelectedEvent(null);
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <ProtocolConfigBase
      title="POAP Gate Configuration"
      description="Require users to hold a specific POAP to access this jar."
      icon="🎖️"
      color="bg-purple-500"
      validationError={validationError}
      isLoading={isValidating}
      className={className}
      learnMoreUrl="https://poap.xyz/"
    >
      <div className="space-y-6">
        {/* Search Events */}
        <div>
          <Label htmlFor="poap-search">Search POAP Events</Label>
          <div className="flex gap-2 mt-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                id="poap-search"
                placeholder="Search by event name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-2 border rounded-md max-h-48 overflow-y-auto">
              {searchResults.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                  onClick={() => handleEventSelect(event)}
                >
                  {event.image_url && (
                    <img
                      src={event.image_url}
                      alt={event.name}
                      className="w-10 h-10 rounded-full mr-3 object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{event.name}</p>
                    <p className="text-xs text-gray-500">ID: {event.id}</p>
                    {event.supply && (
                      <p className="text-xs text-gray-400">Supply: {event.supply}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {isSearching && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-gray-500">Searching...</span>
            </div>
          )}
        </div>

        {/* Manual Event ID Input */}
        <div className="flex items-center justify-center">
          <div className="flex-1 border-t" />
          <span className="px-3 text-sm text-gray-500 bg-white">OR</span>
          <div className="flex-1 border-t" />
        </div>

        <div>
          <Label htmlFor="poap-event-id">Manual POAP Event ID</Label>
          <div className="flex gap-2 mt-1">
            <Input
              id="poap-event-id"
              placeholder="Enter exact POAP Event ID (e.g., 12345)"
              value={eventId}
              onChange={handleEventIdChange}
              className="flex-1"
            />
            <Button
              onClick={handleValidateEventId}
              disabled={isValidating || !eventId}
              variant="outline"
            >
              {isValidating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Validate"
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Find event IDs at{" "}
            <a 
              href="https://poap.gallery/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              poap.gallery
            </a>
          </p>
        </div>

        {/* Selected Event Display */}
        {selectedEvent && (
          <div className="mt-4 p-4 border rounded-md bg-green-50 border-green-200">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div className="flex-1">
                <p className="font-medium text-green-800">
                  Selected: {selectedEvent.name}
                </p>
                <p className="text-sm text-green-700">Event ID: {selectedEvent.id}</p>
                {selectedEvent.description && (
                  <p className="text-xs text-green-600 mt-1 line-clamp-2">
                    {selectedEvent.description}
                  </p>
                )}
              </div>
              {selectedEvent.image_url && (
                <img
                  src={selectedEvent.image_url}
                  alt={selectedEvent.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              )}
            </div>
          </div>
        )}
      </div>
    </ProtocolConfigBase>
  );
};

export default POAPConfig;
