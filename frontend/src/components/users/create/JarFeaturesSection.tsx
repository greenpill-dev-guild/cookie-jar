// src/components/CookieJar/JarFeaturesSection.tsx
import React from "react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface JarFeaturesSectionProps {
  strictPurpose: boolean;
  setStrictPurpose: (value: boolean) => void;
  emergencyWithdrawalEnabled: boolean;
  setEmergencyWithdrawalEnabled: (value: boolean) => void;
  oneTimeWithdrawal: boolean;
  setOneTimeWithdrawal: (value: boolean) => void;
}

export const JarFeaturesSection: React.FC<JarFeaturesSectionProps> = ({
  strictPurpose,
  setStrictPurpose,
  emergencyWithdrawalEnabled,
  setEmergencyWithdrawalEnabled,
  oneTimeWithdrawal,
  setOneTimeWithdrawal
}) => {
  return (
    <>
      {/* Strict Purpose */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="strictPurpose"
          checked={strictPurpose}
          onCheckedChange={(checked) => setStrictPurpose(checked as boolean)}
        />
        <div className="grid gap-1.5">
          <Label htmlFor="strictPurpose">Strict Purpose</Label>
          <p className="text-sm text-muted-foreground">
            Enforce strict purpose for withdrawals
          </p>
        </div>
      </div>

      {/* Emergency Withdrawal */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="emergencyWithdrawal"
          checked={emergencyWithdrawalEnabled}
          onCheckedChange={(checked) => setEmergencyWithdrawalEnabled(checked as boolean)}
        />
        <div className="grid gap-1.5">
          <Label htmlFor="emergencyWithdrawal">Emergency Withdrawal</Label>
          <p className="text-sm text-muted-foreground">
            Allow emergency withdrawals by jar owner
          </p>
        </div>
      </div>

      {/* One Time Withdrawal */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="oneTimeWithdrawal"
          checked={oneTimeWithdrawal}
          onCheckedChange={(checked) => setOneTimeWithdrawal(checked as boolean)}
        />
        <div className="grid gap-1.5">
          <Label htmlFor="oneTimeWithdrawal">One Time Withdrawal</Label>
          <p className="text-sm text-muted-foreground">
            If whitelisted users can only withdraw once.
          </p>
        </div>
      </div>
    </>
  );
};