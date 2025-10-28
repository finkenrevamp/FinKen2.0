/**
 * Unit tests for validation utilities
 */

import { describe, it, expect } from 'vitest';

describe('Email Validation', () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  it('should validate correct email addresses', () => {
    const validEmails = [
      'test@example.com',
      'user.name@example.com',
      'user+tag@example.co.uk',
      'test123@test-domain.com',
    ];

    validEmails.forEach(email => {
      expect(emailRegex.test(email)).toBe(true);
    });
  });

  it('should reject invalid email addresses', () => {
    const invalidEmails = [
      'notanemail',
      '@example.com',
      'user@',
      'user @example.com',
      'user@example',
      '',
    ];

    invalidEmails.forEach(email => {
      expect(emailRegex.test(email)).toBe(false);
    });
  });
});

describe('Password Validation', () => {
  const validatePasswordLength = (password: string, minLength: number = 8): boolean => {
    return password.length >= minLength;
  };

  it('should validate password length', () => {
    expect(validatePasswordLength('short')).toBe(false);
    expect(validatePasswordLength('password123')).toBe(true);
    expect(validatePasswordLength('12345678')).toBe(true);
  });

  it('should enforce minimum length requirement', () => {
    expect(validatePasswordLength('pass', 8)).toBe(false);
    expect(validatePasswordLength('password', 8)).toBe(true);
    expect(validatePasswordLength('pass', 4)).toBe(true);
  });
});

describe('Date Validation', () => {
  const isValidDate = (dateString: string): boolean => {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  };

  it('should validate correct date formats', () => {
    expect(isValidDate('2024-01-01')).toBe(true);
    expect(isValidDate('1990-12-31')).toBe(true);
  });

  it('should reject invalid dates', () => {
    expect(isValidDate('invalid-date')).toBe(false);
    expect(isValidDate('')).toBe(false);
  });

  it('should validate date is in the past', () => {
    const pastDate = new Date('1990-01-01');
    const futureDate = new Date('2100-01-01');
    const now = new Date();

    expect(pastDate < now).toBe(true);
    expect(futureDate > now).toBe(true);
  });
});

describe('Form Field Validation', () => {
  const isFieldEmpty = (value: string | undefined | null): boolean => {
    return !value || value.trim() === '';
  };

  it('should detect empty fields', () => {
    expect(isFieldEmpty('')).toBe(true);
    expect(isFieldEmpty('   ')).toBe(true);
    expect(isFieldEmpty(null)).toBe(true);
    expect(isFieldEmpty(undefined)).toBe(true);
  });

  it('should detect non-empty fields', () => {
    expect(isFieldEmpty('value')).toBe(false);
    expect(isFieldEmpty(' value ')).toBe(false);
  });
});

describe('Account Number Validation', () => {
  const isValidAccountNumber = (accountNumber: string): boolean => {
    // Account numbers should be 4-5 digits
    const regex = /^\d{4,5}$/;
    return regex.test(accountNumber);
  };

  it('should validate correct account numbers', () => {
    expect(isValidAccountNumber('1000')).toBe(true);
    expect(isValidAccountNumber('10000')).toBe(true);
    expect(isValidAccountNumber('2500')).toBe(true);
  });

  it('should reject invalid account numbers', () => {
    expect(isValidAccountNumber('123')).toBe(false); // Too short
    expect(isValidAccountNumber('123456')).toBe(false); // Too long
    expect(isValidAccountNumber('abcd')).toBe(false); // Not numeric
    expect(isValidAccountNumber('')).toBe(false);
  });
});

describe('Amount Validation', () => {
  const isValidAmount = (amount: number): boolean => {
    return amount > 0 && Number.isFinite(amount);
  };

  it('should validate positive amounts', () => {
    expect(isValidAmount(100)).toBe(true);
    expect(isValidAmount(0.01)).toBe(true);
    expect(isValidAmount(1000000)).toBe(true);
  });

  it('should reject invalid amounts', () => {
    expect(isValidAmount(0)).toBe(false);
    expect(isValidAmount(-100)).toBe(false);
    expect(isValidAmount(NaN)).toBe(false);
    expect(isValidAmount(Infinity)).toBe(false);
  });
});

