/**
 * City & Location Utilities for BIN USMAN
 * Handles city normalization, case-insensitivity, deduplication, and dynamic extraction
 * from Firestore listings collection.
 */

// Baseline popular Pakistani & international travel destinations
export const DEFAULT_PAKISTAN_CITIES: string[] = [
  'Islamabad',
  'Karachi',
  'Lahore',
  'Rawalpindi',
  'Murree',
  'Peshawar',
  'Quetta',
  'Multan',
  'Faisalabad',
  'Sialkot',
  'Abbottabad',
  'Nathia Gali',
  'Bhurban',
  'Skardu',
  'Hunza',
  'Swat',
  'Gwadar',
  'Bahawalpur',
  'Gujranwala',
  'Hyderabad',
  'Sukkur'
];

/**
 * Format a city string into clean Title Case with trimmed whitespaces.
 * e.g. "  karachi " -> "Karachi", "NATHIA GALI" -> "Nathia Gali"
 */
export function formatCityName(rawCity: string | null | undefined): string {
  if (!rawCity) return '';
  const trimmed = rawCity.trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';

  // Capitalize each word properly
  return trimmed
    .toLowerCase()
    .split(' ')
    .map(word => {
      if (!word) return '';
      // Special acronym cases (e.g. UAE, UK, USA)
      if (word.length <= 3 && ['uae', 'uk', 'usa', 'kpk'].includes(word)) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Compares two city strings ignoring case, leading/trailing whitespace, and multiple internal spaces.
 * e.g. areCitiesEqual(" KARACHI ", "karachi") === true
 */
export function areCitiesEqual(city1: string | null | undefined, city2: string | null | undefined): boolean {
  if (!city1 && !city2) return true;
  if (!city1 || !city2) return false;
  
  const norm1 = city1.trim().replace(/\s+/g, ' ').toLowerCase();
  const norm2 = city2.trim().replace(/\s+/g, ' ').toLowerCase();
  
  return norm1 === norm2;
}

/**
 * Checks if a listing matches a target city.
 * If targetCity is 'All' or empty, matches everything.
 * Also checks listing.city first, and falls back to listing.location or locationName if city is empty.
 */
export function doesListingMatchCity(
  listing: { city?: string | null; location?: string | null; locationName?: string | null },
  targetCity: string
): boolean {
  if (!targetCity || targetCity === 'All' || targetCity.trim().toLowerCase() === 'all') {
    return true;
  }

  const cleanTarget = targetCity.trim().toLowerCase();

  if (listing.city && listing.city.trim().toLowerCase() === cleanTarget) {
    return true;
  }

  // If listing.city wasn't set or differs, check if location string contains the city name
  if (!listing.city && listing.location) {
    const locClean = listing.location.trim().toLowerCase();
    if (locClean === cleanTarget || locClean.includes(cleanTarget)) {
      return true;
    }
  }

  return false;
}

/**
 * Dynamically extract all unique cities from listings and merge with default cities.
 * Ensures zero duplicates regardless of capitalization or extra spaces.
 * 
 * @param listings Array of listings from Firestore
 * @param includeAll Whether to prepend 'All' as the first option (default: true)
 * @returns Deduplicated list of formatted city names
 */
export function getUniqueCitiesFromListings(
  listings: Array<{ city?: string | null; location?: string | null }>,
  includeAll: boolean = true
): string[] {
  // Map of lowercase city string -> nicely formatted canonical display name
  const cityMap = new Map<string, string>();

  // 1. First, add all cities from actual Firestore listings
  for (const listing of listings) {
    const raw = listing.city || listing.location;
    if (raw && typeof raw === 'string') {
      const formatted = formatCityName(raw);
      if (formatted && formatted.toLowerCase() !== 'all') {
        const key = formatted.toLowerCase();
        if (!cityMap.has(key)) {
          cityMap.set(key, formatted);
        }
      }
    }
  }

  // 2. Add default popular cities if not already present
  for (const defaultCity of DEFAULT_PAKISTAN_CITIES) {
    const formatted = formatCityName(defaultCity);
    const key = formatted.toLowerCase();
    if (!cityMap.has(key)) {
      cityMap.set(key, formatted);
    }
  }

  // Sort: Put cities that have listings at the top or alphabetical, or default order
  // Let's create an ordered list
  const activeListingCityKeys = new Set<string>();
  for (const listing of listings) {
    const raw = listing.city || listing.location;
    if (raw && typeof raw === 'string') {
      const formatted = formatCityName(raw);
      if (formatted && formatted.toLowerCase() !== 'all') {
        activeListingCityKeys.add(formatted.toLowerCase());
      }
    }
  }

  // Prioritize active cities, then other default cities
  const activeCities: string[] = [];
  const otherCities: string[] = [];

  for (const [key, name] of cityMap.entries()) {
    if (activeListingCityKeys.has(key)) {
      activeCities.push(name);
    } else {
      otherCities.push(name);
    }
  }

  // Sort active and other cities cleanly
  activeCities.sort((a, b) => a.localeCompare(b));
  otherCities.sort((a, b) => a.localeCompare(b));

  const result = [...activeCities, ...otherCities];

  if (includeAll) {
    return ['All', ...result];
  }

  return result;
}
