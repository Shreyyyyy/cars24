'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  SlidersHorizontal,
  Car,
  Filter,
  ArrowUpDown,
  RotateCcw,
  Sparkles,
  Layers
} from 'lucide-react';
import { VEHICLES, CATEGORIES, FUEL_TYPES, TRANSMISSION_TYPES } from '@/data/vehicles';
import { VehicleCard } from '@/components/vehicles/VehicleCard';
import { formatPriceLakh } from '@/lib/formatters';
import { useDemoContext } from '@/context/DemoContext';
import { DemoActionBanner } from '@/components/layout/DemoActionBanner';

export const VehicleCatalog: React.FC = () => {
  const { openModal, comparisonCarIds } = useDemoContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedFuel, setSelectedFuel] = useState<string>('All');
  const [selectedTransmission, setSelectedTransmission] = useState<string>('All');
  const [maxBudget, setMaxBudget] = useState<number>(35);
  const [seatingFilter, setSeatingFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'popular' | 'name'>('popular');

  const filteredVehicles = useMemo(() => {
    return VEHICLES.filter(v => {
      // Search
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesName = v.name.toLowerCase().includes(query);
        const matchesTagline = v.tagline.toLowerCase().includes(query);
        const matchesCategory = v.category.toLowerCase().includes(query);
        if (!matchesName && !matchesTagline && !matchesCategory) return false;
      }

      // Category
      if (selectedCategory !== 'All' && v.category !== selectedCategory) return false;

      // Fuel
      if (selectedFuel !== 'All' && !v.fuelTypes.includes(selectedFuel as any)) return false;

      // Transmission
      if (selectedTransmission !== 'All' && !v.transmissions.includes(selectedTransmission as any)) return false;

      // Budget
      if (v.startingPriceLakh > maxBudget) return false;

      // Seating
      if (seatingFilter !== 'All' && v.seatingCapacity !== parseInt(seatingFilter, 10)) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price_asc') return a.startingPriceLakh - b.startingPriceLakh;
      if (sortBy === 'price_desc') return b.startingPriceLakh - a.startingPriceLakh;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0);
    });
  }, [searchQuery, selectedCategory, selectedFuel, selectedTransmission, maxBudget, seatingFilter, sortBy]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedFuel('All');
    setSelectedTransmission('All');
    setMaxBudget(35);
    setSeatingFilter('All');
    setSortBy('popular');
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900">
              Maruti Suzuki Vehicle Explorer
            </h1>
            <span className="text-xs font-bold uppercase tracking-wider text-red-700 bg-red-100 px-2.5 py-0.5 rounded-full">
              {VEHICLES.length} Models
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Browse Arena & NEXA models, filter by specifications and test drive options
          </p>
        </div>

        {/* Compare launcher */}
        {comparisonCarIds.length > 0 && (
          <button
            onClick={() => openModal('compare_cars')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold shadow-md hover:bg-gray-800 transition-colors"
          >
            <Layers className="w-4 h-4 text-red-500" />
            <span>Open Comparison ({comparisonCarIds.length})</span>
          </button>
        )}
      </div>

      {/* Filter and Search Panel */}
      <div className="p-4 sm:p-5 rounded-2xl border border-gray-200 bg-white shadow-2xs space-y-4">
        {/* Search & Sort Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-8 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Swift, Brezza, Grand Vitara, EV, Hybrid..."
              className="w-full text-xs sm:text-sm rounded-xl border border-gray-300 pl-10 pr-4 py-2.5 bg-white text-gray-900 focus:border-red-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-4 flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full text-xs rounded-xl border border-gray-300 py-2.5 px-3 bg-white text-gray-900 focus:border-red-500"
            >
              <option value="popular">Sort: Most Popular</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="name">Model Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex-shrink-0 mr-1">
            Segment:
          </span>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex-shrink-0 ${
                selectedCategory === cat
                  ? 'bg-red-600 text-white shadow-2xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Secondary Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-gray-100 text-xs">
          {/* Fuel Filter */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Fuel Type</label>
            <select
              value={selectedFuel}
              onChange={(e) => setSelectedFuel(e.target.value)}
              className="w-full rounded-xl border border-gray-300 p-2 bg-white text-gray-800 focus:border-red-500"
            >
              {FUEL_TYPES.map(fuel => (
                <option key={fuel} value={fuel}>{fuel === 'All' ? 'All Fuel Types' : fuel}</option>
              ))}
            </select>
          </div>

          {/* Transmission Filter */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Transmission</label>
            <select
              value={selectedTransmission}
              onChange={(e) => setSelectedTransmission(e.target.value)}
              className="w-full rounded-xl border border-gray-300 p-2 bg-white text-gray-800 focus:border-red-500"
            >
              {TRANSMISSION_TYPES.map(t => (
                <option key={t} value={t}>{t === 'All' ? 'All Transmissions' : t}</option>
              ))}
            </select>
          </div>

          {/* Seating */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Seating Capacity</label>
            <select
              value={seatingFilter}
              onChange={(e) => setSeatingFilter(e.target.value)}
              className="w-full rounded-xl border border-gray-300 p-2 bg-white text-gray-800 focus:border-red-500"
            >
              <option value="All">All Capacities</option>
              <option value="4">4-Seater (Jimny)</option>
              <option value="5">5-Seater</option>
              <option value="6">6-Seater (XL6)</option>
              <option value="7">7-Seater (Ertiga / Invicto)</option>
            </select>
          </div>

          {/* Budget Range Slider */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-semibold text-gray-700">Max Budget:</label>
              <span className="font-black text-red-600">{formatPriceLakh(maxBudget)}</span>
            </div>
            <input
              type="range"
              min={4}
              max={35}
              step={1}
              value={maxBudget}
              onChange={(e) => setMaxBudget(parseFloat(e.target.value))}
              className="w-full accent-red-600 cursor-pointer"
            />
          </div>
        </div>

        {/* Filter Summary & Reset */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
          <span>Showing <strong className="text-gray-900">{filteredVehicles.length}</strong> of {VEHICLES.length} vehicles</span>
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Filters</span>
          </button>
        </div>
      </div>

      {/* Grid of Vehicles */}
      {filteredVehicles.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredVehicles.map(vehicle => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} />
          ))}
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl border border-dashed border-gray-300 bg-white">
          <Car className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <h3 className="font-bold text-gray-900 text-sm">No cars match your selected filters</h3>
          <p className="text-xs text-gray-500 mt-1">Try increasing your budget or changing the fuel/category selection.</p>
          <button
            onClick={resetFilters}
            className="mt-3 px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700"
          >
            Reset All Filters
          </button>
        </div>
      )}

      {/* Safety & Demo Banner */}
      <DemoActionBanner
        customMessage="ILLUSTRATIVE CATALOGUE: Prices shown are indicative ex-showroom benchmarks for demonstration. Official on-road pricing and stock varies by state dealership."
      />
    </div>
  );
};
