'use client';

import { Check, Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAllowlistStatus } from '@/hooks/jar/useJarAllowlistStatus';

interface JarStatusBadgeProps {
  jarAddress: string;
}

export function JarStatusBadge({ jarAddress }: JarStatusBadgeProps) {
  const { isAllowlisted } = useAllowlistStatus(jarAddress);
  // Temporarily disable role check to avoid TypeScript deep instantiation error
  // TODO: Fix the generated hook type inference issue
  const isAdmin = false; // useReadCookieJarHasRole complex type issue

  // Flexible container that prevents layout shift while handling overflow
  return (
    <div className="flex justify-end min-w-0 flex-shrink-0">
      {isAdmin ? (
        <Badge
          variant="default"
          className="bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-200 dark:border-yellow-800 text-xs flex items-center gap-1 truncate"
        >
          <Crown className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">Admin</span>
        </Badge>
      ) : isAllowlisted ? (
        <Badge
          variant="default"
          className="bg-green-100 text-green-800 border-green-300 dark:bg-green-900/20 dark:text-green-200 dark:border-green-800 text-xs flex items-center gap-1 truncate max-w-[80px]"
        >
          <Check className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">Allowlisted</span>
        </Badge>
      ) : null}
    </div>
  );
}
