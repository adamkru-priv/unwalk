import { motion } from 'framer-motion';
import { getInitials, getColorFromName } from './utils';
import type { TeamInvitation } from '../../lib/auth';

interface ReceivedInvitationsSlotsProps {
  receivedInvitations: TeamInvitation[];
  acceptedTeamsCount: number; // Ile teamów już zaakceptowałeś
  onAccept: (invitationId: string) => void;
  onReject: (invitationId: string) => void;
}

export function ReceivedInvitationsSlots({ 
  receivedInvitations, 
  acceptedTeamsCount,
  onAccept,
  onReject 
}: ReceivedInvitationsSlotsProps) {
  const maxTeams = 5; // User can be in max 5 teams
  const availableSlots = maxTeams - acceptedTeamsCount;
  const isAtLimit = acceptedTeamsCount >= maxTeams;

  if (receivedInvitations.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:via-pink-900/20 dark:to-blue-900/30 border border-purple-300 dark:border-purple-500/30 rounded-3xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-black text-gray-900 dark:text-white mb-1 flex items-center gap-2">
            <span>📬</span>
            <span>Team Invitations</span>
          </h2>
          <p className="text-xs text-gray-600 dark:text-white/50">
            You can join {availableSlots} more team{availableSlots !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="bg-red-500 text-white text-sm font-bold px-3 py-1.5 rounded-full">
          {receivedInvitations.length}
        </div>
      </div>

      {/* Progress Bar - showing team membership capacity */}
      <div className="mb-5">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-white/60 mb-2">
          <span>Team Membership</span>
          <span>{acceptedTeamsCount}/{maxTeams} teams</span>
        </div>
        <div className="h-2 bg-gray-300 dark:bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${
              isAtLimit 
                ? 'bg-gradient-to-r from-red-500 to-orange-500'
                : 'bg-gradient-to-r from-purple-500 to-pink-500'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${(acceptedTeamsCount / maxTeams) * 100}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        {isAtLimit && (
          <p className="text-xs text-orange-400 mt-2 flex items-center gap-1">
            <span>⚠️</span>
            <span>You've reached the maximum of 5 teams</span>
          </p>
        )}
      </div>

      {/* Invitations List */}
      <div className="space-y-3">
        {receivedInvitations.map((invitation, index) => {
          const canAccept = !isAtLimit;
          
          return (
            <motion.div
              key={invitation.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="bg-white/90 dark:bg-white/5 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-2xl p-4 relative overflow-hidden"
            >
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-200/20 dark:via-purple-500/5 to-pink-500/0" />
              
              <div className="relative z-10">
                {/* Sender Info */}
                <div className="flex items-start gap-3 mb-3">
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ring-2 ring-purple-500/30"
                    style={{ backgroundColor: getColorFromName(invitation.sender_name || invitation.sender_email) }}
                  >
                    {getInitials(invitation.sender_name || invitation.sender_email)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 dark:text-white text-base mb-1">
                      {invitation.sender_name || invitation.sender_email}
                    </h3>
                    <div className="text-sm text-purple-600 dark:text-purple-300 mb-1 flex items-center gap-1.5">
                      <span>🤝</span>
                      <span>wants you to join their team!</span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-white/50">
                      {new Date(invitation.invited_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>

                {/* Message */}
                {invitation.message && (
                  <div className="bg-purple-100 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 rounded-xl p-3 mb-3">
                    <div className="text-xs text-gray-500 dark:text-white/50 mb-1">Message:</div>
                    <p className="text-sm text-gray-800 dark:text-white/90 italic">
                      "{invitation.message}"
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => onAccept(invitation.id)}
                    disabled={!canAccept}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
                      canAccept
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
                        : 'bg-gray-200 dark:bg-white/5 text-gray-400 dark:text-white/30 cursor-not-allowed'
                    }`}
                  >
                    {canAccept ? (
                      <span className="flex items-center justify-center gap-1.5">
                        <span>✓</span>
                        <span>Accept</span>
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-1.5">
                        <span>🚫</span>
                        <span>Team limit reached</span>
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => onReject(invitation.id)}
                    className="flex-1 bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-900 dark:text-white py-2.5 rounded-xl font-medium text-sm transition-all"
                  >
                    Decline
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
