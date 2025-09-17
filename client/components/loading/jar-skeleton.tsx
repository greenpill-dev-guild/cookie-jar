export function JarSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-6 bg-muted rounded w-3/4"></div>
      <div className="h-4 bg-muted rounded w-1/2"></div>
      <div className="h-4 bg-muted rounded w-2/3"></div>
      <div className="space-y-2">
        <div className="h-3 bg-muted rounded"></div>
        <div className="h-3 bg-muted rounded w-5/6"></div>
      </div>
    </div>
  );
}

export function JarGridSkeleton() {
  return (
    <div className="max-w-7xl mx-auto">
      {/* Header skeleton that matches the compact header */}
      <div className="cj-card-primary backdrop-blur-sm rounded-lg p-4 mb-6 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4 mb-4">
          <div className="h-10 bg-muted rounded flex-1 animate-pulse"></div>
          <div className="h-10 bg-muted rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-muted rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-muted rounded w-20 animate-pulse"></div>
        </div>
        <div className="pt-2 border-t border-border">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="h-4 bg-muted rounded w-32 animate-pulse"></div>
              <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
            </div>
            <div className="h-4 bg-muted rounded w-20 animate-pulse"></div>
          </div>
        </div>
      </div>
      
      {/* Grid skeleton */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="cj-card-primary rounded-lg shadow-sm border overflow-hidden">
            {/* Image placeholder */}
            <div className="w-full h-40 bg-muted animate-pulse"></div>
            {/* Content placeholder */}
            <div className="p-4">
              <JarSkeleton />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
