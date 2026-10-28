export function validateIndianPhone(phone: string): { isValid: boolean; error?: string } {
  const cleaned = phone.replace(/[\s\-\+]/g, '');
  if (!cleaned) {
    return { isValid: false, error: 'Phone number is required' };
  }
  // Check for 10 digits or 12 digits (with 91 prefix)
  const is10Digits = /^[6-9]\d{9}$/.test(cleaned);
  const is12Digits = /^91[6-9]\d{9}$/.test(cleaned);
  if (!is10Digits && !is12Digits) {
    return { isValid: false, error: 'Enter a valid 10-digit Indian mobile number' };
  }
  return { isValid: true };
}

export function validateRequired(value: string, fieldName: string): { isValid: boolean; error?: string } {
  if (!value || value.trim().length === 0) {
    return { isValid: false, error: `${fieldName} is required` };
  }
  return { isValid: true };
}

export function validateEmailOptional(email: string): { isValid: boolean; error?: string } {
  if (!email || email.trim() === '') return { isValid: true };
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  return { isValid: true };
}
