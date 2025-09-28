"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Gauge, 
  Clock, 
  Zap, 
  Eye, 
  Wifi, 
  Smartphone,
  Monitor,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  RefreshCw
} from "lucide-react";
import { usePerformanceMonitor } from "@/lib/app/performance";

interface MetricCardProps {
  title: string;
  value?: number;
  threshold: number;
  unit: string;
  icon: React.ReactNode;
  description: string;
  higherIsBetter?: boolean;
}

function MetricCard({ 
  title, 
  value, 
  threshold, 
  unit, 
  icon, 
  description, 
  higherIsBetter = false 
}: MetricCardProps) {
  if (value === undefined) {
    return (
      <Card className="opacity-60">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {icon}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-muted-foreground">--</div>
          <p className="text-xs text-muted-foreground mt-1">Measuring...</p>
        </CardContent>
      </Card>
    );
  }

  const isGood = higherIsBetter ? value >= threshold : value <= threshold;
  const percentage = higherIsBetter 
    ? Math.min((value / threshold) * 100, 100)
    : Math.max((threshold - value) / threshold * 100, 0);

  return (
    <Card className={isGood ? "border-green-200" : "border-amber-200"}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="flex items-center gap-2">
          {icon}
          {isGood ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {value.toFixed(value < 1 ? 3 : 0)}{unit}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Progress 
            value={percentage} 
            className="flex-1 h-2"
          />
          <Badge variant={isGood ? "default" : "destructive"} className="text-xs">
            {isGood ? "Good" : "Needs Work"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

interface PerformanceDashboardProps {
  showInProduction?: boolean;
}

export function PerformanceDashboard({ showInProduction = false }: PerformanceDashboardProps) {
  const { metrics, checkBudget } = usePerformanceMonitor();
  const [isVisible, setIsVisible] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<{
    memory?: number;
    connection?: string;
    cpuCores?: number;
  }>({});

  // Only show in development by default
  const shouldShow = process.env.NODE_ENV === 'development' || showInProduction;

  useEffect(() => {
    if (typeof window === 'undefined' || !shouldShow) return;

    // Get device information
    const info: any = {};
    if ('deviceMemory' in navigator) {
      info.memory = (navigator as any).deviceMemory;
    }
    if ('connection' in navigator) {
      info.connection = (navigator as any).connection?.effectiveType;
    }
    if ('hardwareConcurrency' in navigator) {
      info.cpuCores = navigator.hardwareConcurrency;
    }
    setDeviceInfo(info);

    // Show dashboard on key combination (Ctrl/Cmd + Shift + P)
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'P') {
        event.preventDefault();
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shouldShow]);

  if (!shouldShow) return null;

  const budget = checkBudget();

  return (
    <>
      {/* Toggle Button (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <Button
          onClick={() => setIsVisible(!isVisible)}
          className="fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full shadow-lg"
          size="icon"
          variant="outline"
        >
          <BarChart3 className="h-5 w-5" />
        </Button>
      )}

      {/* Performance Dashboard Modal */}
      {isVisible && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Gauge className="h-6 w-6 text-blue-500" />
                  <h2 className="text-2xl font-bold">Performance Dashboard</h2>
                  <Badge variant={budget.passed ? "default" : "destructive"}>
                    {budget.passed ? "Within Budget" : `${budget.violations.length} Issues`}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.location.reload()}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsVisible(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>

              {/* Core Web Vitals */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-orange-500" />
                  Core Web Vitals
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <MetricCard
                    title="Largest Contentful Paint"
                    value={metrics.LCP}
                    threshold={2500}
                    unit="ms"
                    icon={<Eye className="h-4 w-4 text-blue-500" />}
                    description="Time until largest element is painted"
                  />
                  <MetricCard
                    title="First Input Delay"
                    value={metrics.FID}
                    threshold={100}
                    unit="ms"
                    icon={<Clock className="h-4 w-4 text-green-500" />}
                    description="Delay before first interaction"
                  />
                  <MetricCard
                    title="Cumulative Layout Shift"
                    value={metrics.CLS}
                    threshold={0.1}
                    unit=""
                    icon={<Monitor className="h-4 w-4 text-purple-500" />}
                    description="Visual stability score"
                  />
                </div>
              </div>

              {/* Additional Metrics */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  Additional Metrics
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <MetricCard
                    title="First Contentful Paint"
                    value={metrics.FCP}
                    threshold={1800}
                    unit="ms"
                    icon={<Eye className="h-4 w-4 text-indigo-500" />}
                    description="Time until first content appears"
                  />
                  <MetricCard
                    title="Time to First Byte"
                    value={metrics.TTFB}
                    threshold={800}
                    unit="ms"
                    icon={<Wifi className="h-4 w-4 text-cyan-500" />}
                    description="Server response time"
                  />
                </div>
              </div>

              {/* Device Information */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-gray-500" />
                  Device Information
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm font-medium text-muted-foreground">Memory</div>
                      <div className="text-lg font-bold">
                        {deviceInfo.memory ? `${deviceInfo.memory} GB` : 'Unknown'}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm font-medium text-muted-foreground">Connection</div>
                      <div className="text-lg font-bold">
                        {deviceInfo.connection || 'Unknown'}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm font-medium text-muted-foreground">CPU Cores</div>
                      <div className="text-lg font-bold">
                        {deviceInfo.cpuCores || 'Unknown'}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm font-medium text-muted-foreground">Page Load</div>
                      <div className="text-lg font-bold">
                        {metrics.pageLoadTime 
                          ? `${(metrics.pageLoadTime / 1000).toFixed(1)}s` 
                          : '--'}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Performance Budget Violations */}
              {!budget.passed && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-amber-600">
                    <AlertTriangle className="h-5 w-5" />
                    Performance Issues
                  </h3>
                  <div className="space-y-2">
                    {budget.violations.map((violation, index) => (
                      <div 
                        key={index}
                        className="p-3 bg-amber-50 border border-amber-200 rounded-md"
                      >
                        <div className="text-sm font-medium text-amber-800">
                          {violation}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tips */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <div className="text-sm text-blue-800">
                  <strong>Tip:</strong> Press <kbd className="px-1 py-0.5 bg-white border rounded">Ctrl/Cmd + Shift + P</kbd> to toggle this dashboard
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Lightweight performance indicator for production
 */
export function PerformanceIndicator() {
  const { checkBudget } = usePerformanceMonitor();
  const [showDetails, setShowDetails] = useState(false);
  
  if (process.env.NODE_ENV !== 'production') return null;
  
  const budget = checkBudget();
  if (budget.passed) return null;
  
  return (
    <div className="fixed top-4 right-4 z-40">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowDetails(!showDetails)}
        className="bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100"
      >
        <AlertTriangle className="h-4 w-4 mr-2" />
        Performance Issues ({budget.violations.length})
      </Button>
      
      {showDetails && (
        <Card className="absolute top-12 right-0 w-80 shadow-lg">
          <CardHeader>
            <CardTitle className="text-sm">Performance Issues Detected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {budget.violations.slice(0, 3).map((violation, index) => (
                <div key={index} className="text-xs text-muted-foreground">
                  {violation}
                </div>
              ))}
              {budget.violations.length > 3 && (
                <div className="text-xs text-muted-foreground">
                  +{budget.violations.length - 3} more issues
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
