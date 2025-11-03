// Indian Rupee formatting utility
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
};

// Alternative format without symbol for inputs
export const formatAmount = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Format in lakhs/crores for large amounts
export const formatLargeAmount = (amount: number): string => {
  if (amount >= 10000000) { // 1 crore
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  } else if (amount >= 100000) { // 1 lakh
    return `₹${(amount / 100000).toFixed(2)} L`;
  } else if (amount >= 1000) { // 1 thousand
    return `₹${(amount / 1000).toFixed(1)}K`;
  }
  return formatCurrency(amount);
};

// Parse Indian currency input
export const parseIndianAmount = (input: string): number => {
  // Remove currency symbols and spaces
  let cleaned = input.replace(/[₹,\s]/g, '');
  
  // Handle lakh/crore notation
  if (cleaned.toLowerCase().includes('l')) {
    const num = parseFloat(cleaned.replace(/l/gi, ''));
    return num * 100000; // 1 lakh
  }
  
  if (cleaned.toLowerCase().includes('cr')) {
    const num = parseFloat(cleaned.replace(/cr/gi, ''));
    return num * 10000000; // 1 crore
  }
  
  return parseFloat(cleaned) || 0;
};