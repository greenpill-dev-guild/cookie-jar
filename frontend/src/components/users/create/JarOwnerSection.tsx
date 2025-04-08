// src/components/CookieJar/JarOwnerSection.tsx
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface JarOwnerSectionProps {
  jarOwnerAddress: `0x${string}`;
  setJarOwnerAddress: (address: `0x${string}`) => void;
}

export const JarOwnerSection: React.FC<JarOwnerSectionProps> = ({ 
  jarOwnerAddress, 
  setJarOwnerAddress 
}) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="jarOwner">Jar Owner Address</Label>
      <Input
        id="jarOwner"
        placeholder="0x..."
        onChange={(e) => {
          const value = e.target.value;
          if (value.startsWith("0x") && value.length === 42) {
            setJarOwnerAddress(value as `0x${string}`);
          } else {
            console.error("Invalid Ethereum address");
          }
        }}
        required
      />
      <p className="text-sm text-muted-foreground">
        The address that will have owner/admin rights for this cookie jar
      </p>
    </div>
  );
};