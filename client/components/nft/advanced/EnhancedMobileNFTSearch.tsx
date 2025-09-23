"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Filter, 
  SlidersHorizontal, 
  TrendingUp, 
  Zap, 
  Star,
  ChevronDown,
  X,
  Sparkles,
  ArrowUpDown,
  Eye,
  Heart
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { useDebounce } from "@/hooks/app/useDebounce";
import { 
  AdvancedNFTFilters, 
  TraitFilter, 
  traitFilterSystem 
} from "@/lib/nft/advanced/TraitFilterSystem";
import { floorPriceProvider } from "@/lib/nft/advanced/FloorPriceProvider";

interface EnhancedMobileNFTSearchProps {
  onSearch: (query: string, filters: AdvancedNFTFilters) => void;
  onFilterChange: (filters: AdvancedNFTFilters) => void;
  isLoading?: boolean;
  resultCount?: number;
  placeholder?: string;
  showQuickFilters?: boolean;
  showSmartSuggestions?: boolean;
}

interface QuickFilter {
  id: string;
  label: string;
  icon: React.ReactNode;
  filters: AdvancedNFTFilters;
  color: string;
}

export function EnhancedMobileNFTSearch({
  onSearch,
  onFilterChange,
  isLoading = false,
  resultCount,
  placeholder = "Search NFTs, collections, or traits...",
  showQuickFilters = true,
  showSmartSuggestions = true,
}: EnhancedMobileNFTSearchProps) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<AdvancedNFTFilters>({ traits: [] });
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const debouncedQuery = useDebounce(query, 300);

  // Quick filter presets
  const quickFilters: QuickFilter[] = [
    {
      id: "rarest",
      label: "Rarest",
      icon: <Sparkles className="h-3 w-3" />,
      filters: traitFilterSystem.buildSmartFilters([], 'rarest'),
      color: "bg-purple-500",
    },
    {
      id: "cheapest",
      label: "Best Deals",
      icon: <TrendingUp className="h-3 w-3" />,
      filters: traitFilterSystem.buildSmartFilters([], 'cheapest'),
      color: "bg-green-500",
    },
    {
      id: "trending",
      label: "Trending",
      icon: <Zap className="h-3 w-3" />,
      filters: traitFilterSystem.buildSmartFilters([], 'trending'),
      color: "bg-orange-500",
    },
    {
      id: "balanced",
      label: "Balanced",
      icon: <Star className="h-3 w-3" />,
      filters: traitFilterSystem.buildSmartFilters([], 'balanced'),
      color: "bg-blue-500",
    },
  ];

  // Handle search input
  const handleSearch = useCallback((searchQuery: string) => {
    setQuery(searchQuery);
    onSearch(searchQuery, filters);
  }, [filters, onSearch]);

  // Apply quick filter
  const applyQuickFilter = useCallback((quickFilter: QuickFilter) => {
    const newFilters = { ...filters, ...quickFilter.filters };
    setFilters(newFilters);
    onFilterChange(newFilters);
    onSearch(query, newFilters);
  }, [filters, query, onFilterChange, onSearch]);

  // Update individual filter
  const updateFilter = useCallback((key: keyof AdvancedNFTFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  }, [filters, onFilterChange]);

  // Add trait filter
  const addTraitFilter = useCallback((traitFilter: TraitFilter) => {
    const existingIndex = filters.traits.findIndex(
      f => f.trait_type === traitFilter.trait_type
    );
    
    const newTraits = [...filters.traits];
    if (existingIndex >= 0) {
      newTraits[existingIndex] = traitFilter;
    } else {
      newTraits.push(traitFilter);
    }
    
    updateFilter('traits', newTraits);
  }, [filters.traits, updateFilter]);

  // Remove trait filter
  const removeTraitFilter = useCallback((traitType: string) => {
    const newTraits = filters.traits.filter(f => f.trait_type !== traitType);
    updateFilter('traits', newTraits);
  }, [filters.traits, updateFilter]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    const emptyFilters: AdvancedNFTFilters = { traits: [] };
    setFilters(emptyFilters);
    onFilterChange(emptyFilters);
  }, [onFilterChange]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = filters.traits.length;
    if (filters.rarity_rank) count++;
    if (filters.price_range) count++;
    if (filters.has_traits?.length) count++;
    return count;
  }, [filters]);

  return (
    <div className="space-y-3">
      {/* Search Input with Quick Actions */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder={placeholder}
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 pr-20 h-12 text-base"
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
            <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-2 relative"
                >
                  <Filter className="h-4 w-4" />
                  {activeFilterCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center"
                    >
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
                <SheetHeader className="pb-4">
                  <SheetTitle className="flex items-center justify-between">
                    Filters & Search Options
                    {activeFilterCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="text-destructive"
                      >
                        Clear All
                      </Button>
                    )}
                  </SheetTitle>
                  <SheetDescription>
                    Refine your search with advanced filters and smart suggestions
                  </SheetDescription>
                </SheetHeader>

                <div className="space-y-6">
                  {/* Quick Filters */}
                  {showQuickFilters && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm">Quick Filters</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {quickFilters.map((filter) => (
                          <Button
                            key={filter.id}
                            variant="outline"
                            onClick={() => applyQuickFilter(filter)}
                            className="h-auto p-3 flex flex-col gap-1"
                          >
                            <div className={`w-8 h-8 rounded-full ${filter.color} flex items-center justify-center text-white`}>
                              {filter.icon}
                            </div>
                            <span className="text-xs font-medium">{filter.label}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Price Range Filter */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm">Price Range</h3>
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">
                        Floor Price Range (ETH)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={filters.price_range?.min || ''}
                          onChange={(e) => updateFilter('price_range', { 
                            ...filters.price_range, 
                            min: parseFloat(e.target.value) || 0 
                          })}
                          className="text-sm"
                        />
                        <Input
                          type="number"
                          placeholder="Max"
                          value={filters.price_range?.max || ''}
                          onChange={(e) => updateFilter('price_range', { 
                            ...filters.price_range, 
                            max: parseFloat(e.target.value) || 10 
                          })}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Rarity Filter */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm">Rarity Rank</h3>
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">
                        Rank Range (Lower = More Rare)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          placeholder="Min Rank"
                          value={filters.rarity_rank?.min || ''}
                          onChange={(e) => updateFilter('rarity_rank', { 
                            ...filters.rarity_rank, 
                            min: parseInt(e.target.value) || 1 
                          })}
                          className="text-sm"
                        />
                        <Input
                          type="number"
                          placeholder="Max Rank"
                          value={filters.rarity_rank?.max || ''}
                          onChange={(e) => updateFilter('rarity_rank', { 
                            ...filters.rarity_rank, 
                            max: parseInt(e.target.value) || 1000 
                          })}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Sorting Options */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm">Sort By</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: 'rarity_rank', label: 'Rarity', icon: <Star className="h-3 w-3" /> },
                        { key: 'price', label: 'Price', icon: <TrendingUp className="h-3 w-3" /> },
                        { key: 'last_sale', label: 'Last Sale', icon: <ArrowUpDown className="h-3 w-3" /> },
                        { key: 'token_id', label: 'Token ID', icon: <Eye className="h-3 w-3" /> },
                      ].map((sort) => (
                        <Button
                          key={sort.key}
                          variant={filters.sort_by === sort.key ? "default" : "outline"}
                          onClick={() => updateFilter('sort_by', sort.key)}
                          className="h-auto p-2 flex items-center gap-2"
                          size="sm"
                        >
                          {sort.icon}
                          <span className="text-xs">{sort.label}</span>
                        </Button>
                      ))}
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Sort Direction</label>
                      <Select
                        value={filters.sort_direction || 'asc'}
                        onValueChange={(value: 'asc' | 'desc') => updateFilter('sort_direction', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asc">Ascending</SelectItem>
                          <SelectItem value="desc">Descending</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Advanced Options Toggle */}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={showAdvanced}
                      onCheckedChange={(checked) => setShowAdvanced(!!checked)}
                    />
                    <span className="text-sm font-medium">Show Advanced Options</span>
                  </div>

                  {/* Advanced Filters */}
                  <AnimatePresence>
                    {showAdvanced && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4"
                      >
                        <Separator />
                        
                        {/* Collection Size Filter */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Collection Size</label>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              type="number"
                              placeholder="Min Size"
                              value={filters.collection_size?.min || ''}
                              onChange={(e) => updateFilter('collection_size', { 
                                ...filters.collection_size, 
                                min: parseInt(e.target.value) || 1000 
                              })}
                              className="text-sm"
                            />
                            <Input
                              type="number"
                              placeholder="Max Size"
                              value={filters.collection_size?.max || ''}
                              onChange={(e) => updateFilter('collection_size', { 
                                ...filters.collection_size, 
                                max: parseInt(e.target.value) || 10000 
                              })}
                              className="text-sm"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Active Filters Display */}
      <AnimatePresence>
        {activeFilterCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-wrap gap-2"
          >
            {filters.traits.map((trait) => (
              <Badge key={trait.trait_type} variant="secondary" className="gap-1">
                {trait.trait_type}: {trait.values.join(", ")}
                <button onClick={() => removeTraitFilter(trait.trait_type)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            
            {filters.rarity_rank && (
              <Badge variant="secondary" className="gap-1">
                Rank: #{filters.rarity_rank.min}-#{filters.rarity_rank.max}
                <button onClick={() => updateFilter('rarity_rank', undefined)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            
            {filters.price_range && (
              <Badge variant="secondary" className="gap-1">
                Price: {filters.price_range.min}-{filters.price_range.max} ETH
                <button onClick={() => updateFilter('price_range', undefined)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Summary */}
      {resultCount !== undefined && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-between text-sm text-muted-foreground"
        >
          <span>
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                Searching...
              </div>
            ) : (
              `${resultCount.toLocaleString()} results found`
            )}
          </span>
          
          {filters.sort_by && (
            <span className="text-xs">
              Sorted by {filters.sort_by.replace('_', ' ')} 
              ({filters.sort_direction === 'desc' ? '↓' : '↑'})
            </span>
          )}
        </motion.div>
      )}
    </div>
  );
}
