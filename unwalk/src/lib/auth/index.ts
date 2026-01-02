/**
 * Auth Module - Centralized Authentication & Team Management
 * 
 * This module provides:
 * - Authentication (sign in/out, OAuth, guest users)
 * - User profile management
 * - Team invitations and members
 * - Challenge assignments
 * - Badges and achievements
 */

// Export types
export type {
  UserProfile,
  TeamInvitation,
  TeamMember,
  Badge,
  ChallengeAssignment,
  User,
  Session,
} from './types';

// Export services
export { authService } from './authService';
export { teamService } from './teamService';
export { badgesService } from './badgesService';
