// src/components/CookieJar/MetadataSection.tsx
import React from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface MetadataSectionProps {
  metadata: string;
  setMetadata: (value: string) => void;
}

export const MetadataSection: React.FC<MetadataSectionProps> = ({
  metadata,
  setMetadata
}) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="metadata">Metadata</Label>
      <Textarea
        id="metadata"
        placeholder="Provide a description or any additional information"
        className="min-h-24"
        value={metadata}
        onChange={(e) => setMetadata(e.target.value)}
      />
      <p className="text-sm text-muted-foreground">
        Additional information about this cookie jar
      </p>
    </div>
  );
};