/**
 * General utility functions for the study app
 */

/**
 * Shuffle an array using Fisher-Yates algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} - New shuffled array
 */
export const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * Format a date to a readable string
 * @param {string|Date} date - Date to format
 * @param {object} options - Formatting options
 * @returns {string} - Formatted date string
 */
export const formatDate = (date, options = {}) => {
  const dateObj = new Date(date);
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  };

  return dateObj.toLocaleDateString('en-US', defaultOptions);
};

/**
 * Format a date to include time
 * @param {string|Date} date - Date to format
 * @returns {string} - Formatted date and time string
 */
export const formatDateTime = (date) => {
  const dateObj = new Date(date);
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Get relative time string (e.g., "2 hours ago")
 * @param {string|Date} date - Date to compare
 * @returns {string} - Relative time string
 */
export const getRelativeTime = (date) => {
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now - past) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else {
    return formatDate(date);
  }
};

/**
 * Capitalize the first letter of a string
 * @param {string} str - String to capitalize
 * @returns {string} - Capitalized string
 */
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} suffix - Suffix to add when truncated
 * @returns {string} - Truncated text
 */
export const truncateText = (text, maxLength = 100, suffix = '...') => {
  if (!text || text.length <= maxLength) return text || '';
  return text.substring(0, maxLength - suffix.length) + suffix;
};

/**
 * Generate a random color for charts/visualizations
 * @param {number} index - Index for consistent color generation
 * @returns {string} - HSL color string
 */
export const generateColor = (index = 0) => {
  const hue = (index * 137.508) % 360; // Golden angle approximation
  return `hsl(${hue}, 70%, 50%)`;
};

/**
 * Debounce function to limit function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Deep clone an object
 * @param {any} obj - Object to clone
 * @returns {any} - Cloned object
 */
export const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
};

/**
 * Check if two objects are deeply equal
 * @param {any} obj1 - First object
 * @param {any} obj2 - Second object
 * @returns {boolean} - True if objects are equal
 */
export const deepEqual = (obj1, obj2) => {
  if (obj1 === obj2) return true;

  if (obj1 == null || obj2 == null) return obj1 === obj2;

  if (typeof obj1 !== typeof obj2) return false;

  if (typeof obj1 !== 'object') return obj1 === obj2;

  if (obj1 instanceof Date && obj2 instanceof Date) {
    return obj1.getTime() === obj2.getTime();
  }

  if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEqual(obj1[key], obj2[key])) return false;
  }

  return true;
};

/**
 * Calculate percentage with precision
 * @param {number} value - Current value
 * @param {number} total - Total value
 * @param {number} precision - Decimal places
 * @returns {number} - Percentage
 */
export const calculatePercentage = (value, total, precision = 0) => {
  if (total === 0) return 0;
  return Number(((value / total) * 100).toFixed(precision));
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid email
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Generate a slug from text
 * @param {string} text - Text to slugify
 * @returns {string} - Slug
 */
export const slugify = (text) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

/**
 * Parse URL query parameters
 * @param {string} search - URL search string
 * @returns {object} - Parsed parameters
 */
export const parseQueryParams = (search) => {
  const params = new URLSearchParams(search);
  const result = {};
  for (const [key, value] of params) {
    result[key] = value;
  }
  return result;
};

/**
 * Format file size in bytes to human readable
 * @param {number} bytes - Size in bytes
 * @param {number} decimals - Number of decimals
 * @returns {string} - Formatted size
 */
export const formatFileSize = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Check if device is mobile
 * @returns {boolean} - True if mobile device
 */
export const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 768;
};

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} - Success status
 */
export const copyToClipboard = async (text) => {
  if (typeof window === 'undefined') return false;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

/**
 * Download data as JSON file
 * @param {any} data - Data to download
 * @param {string} filename - File name
 */
export const downloadJSON = (data, filename = 'data.json') => {
  if (typeof window === 'undefined') return;

  const dataStr = JSON.stringify(data, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

/**
 * Get a random item from an array
 * @param {Array} array - Array to pick from
 * @returns {any} - Random item
 */
export const getRandomItem = (array) => {
  if (!array || array.length === 0) return null;
  return array[Math.floor(Math.random() * array.length)];
};

/**
 * Clamp a number between min and max values
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} - Clamped value
 */
export const clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max);
};
