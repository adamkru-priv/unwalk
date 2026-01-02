/**
 * @deprecated This file is kept for backward compatibility.
 * Please use imports from '@/lib/auth' instead.
 * 
 * Example:
 *   import { authService, teamService, badgesService } from '@/lib/auth';
 */

// Re-export everything from the new modular structure
export * from './auth/index';
export { authService } from './auth/authService';
export { teamService } from './auth/teamService';
export { badgesService } from './auth/badgesService';
