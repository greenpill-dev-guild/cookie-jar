interface CreateJarHeaderProps {
  isV2Contract: boolean;
}

export function CreateJarHeader({ isV2Contract }: CreateJarHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl md:text-3xl font-bold text-[hsl(var(--cj-dark-brown))]">
          Create Cookie Jar
        </h1>
        <div
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            isV2Contract
              ? 'bg-blue-100 text-blue-800'
              : 'bg-orange-100 text-orange-800'
          }`}
        >
          {isV2Contract ? '🚀 v2 Contract' : '📦 v1 Contract'}
        </div>
      </div>
      <p className="text-[hsl(var(--cj-medium-brown))]">
        Set up your new cookie jar
        {!isV2Contract && (
          <span className="ml-2 text-sm text-orange-600">
            • Allowlist access only
          </span>
        )}
      </p>
    </div>
  );
}
