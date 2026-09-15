import { z } from 'zod';

/**
 * Government grade password complexity requirements:
 * - minimum 8 characters
 * - max 25 characters
 * - at least one capital letter
 * - at least one small letter
 * - at least one special character
 * - at least one number (0-9)
 * - no spaces allowed
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(25, 'Password must not exceed 25 characters')
  .refine((val) => /[A-Z]/.test(val), 'Password must contain at least one uppercase letter')
  .refine((val) => /[a-z]/.test(val), 'Password must contain at least one lowercase letter')
  .refine((val) => /[0-9]/.test(val), 'Password must contain at least one number')
  .refine((val) => /[!@#$%^&*(),.?":{}|<>]/.test(val), 'Password must contain at least one special character')
  .refine((val) => !/\s/.test(val), 'Password must not contain spaces');
