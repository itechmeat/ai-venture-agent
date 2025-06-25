/**
 * Utility functions for data formatting
 */

/**
 * Formats price for display
 * @param price - Price in numeric format
 * @returns Formatted price string
 */
export function formatPrice(price: number): string {
  if (price === 0) {
    return 'Free';
  }
  return `$${price.toFixed(1)}`;
}

/**
 * Formats date in various formats
 * @param date - Date to format
 * @param format - Output format ('short' | 'long' | 'relative')
 * @returns Formatted date string
 */
export function formatDate(
  date: string | Date,
  format: 'short' | 'long' | 'relative' = 'short',
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  switch (format) {
    case 'short':
      return dateObj.toLocaleDateString();
    case 'long':
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    case 'relative':
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - dateObj.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
      return `${Math.floor(diffDays / 365)} years ago`;
    default:
      return dateObj.toLocaleDateString();
  }
}

/**
 * Formats percentage value
 * @param value - Numeric value (0-100)
 * @param decimals - Number of decimal places
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimals: number = 0): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Formats numeric value with thousands separators
 * @param value - Numeric value
 * @returns Formatted number string
 */
export function formatNumber(value: number): string {
  return value.toLocaleString();
}

// Export object with functions for convenient import
export const formatters = {
  price: formatPrice,
  date: formatDate,
  percentage: formatPercentage,
  number: formatNumber,
} as const;
