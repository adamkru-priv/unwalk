import { useState } from 'react';
import { teamService, type UserProfile } from '../../lib/auth';
import { useChallengeStore } from '../../stores/useChallengeStore';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  onInviteSent: () => void;
}

export function InviteModal({ isOpen, onClose, userProfile, onInviteSent }: InviteModalProps) {
  const setCurrentScreen = useChallengeStore((state) => state.setCurrentScreen);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteLoading(true);

    try {
      const { error } = await teamService.sendInvitation(inviteEmail, inviteMessage || undefined);
      
      if (error) throw error;

      // Success! Close modal and refresh
      setInviteEmail('');
      setInviteMessage('');
      onClose();
      onInviteSent();
    } catch (err: any) {
      setInviteError(err.message || 'Failed to send invitation');
    } finally {
      setInviteLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-5" onClick={onClose}>
      <div 
        className="bg-[#151A25] rounded-3xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-white mb-4">Invite to Team</h2>
        
        {userProfile?.is_guest ? (
          // Guest user - show sign up prompt
          <div className="space-y-4">
            <div className="bg-blue-500/20 border border-blue-500/50 rounded-xl p-4">
              <div className="text-4xl mb-3 text-center">🔐</div>
              <h3 className="font-bold text-white text-center mb-2">Sign Up Required</h3>
              <p className="text-sm text-white/70 text-center mb-4">
                Create an account to invite friends and family to your team. Your progress will be saved!
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setCurrentScreen('profile');
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition-all"
              >
                Sign Up Now
              </button>
            </div>
          </div>
        ) : (
          // Logged in user - show invite form
          <form onSubmit={handleSendInvitation} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-white/70 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="friend@example.com"
                className="w-full px-4 py-3 rounded-xl border-2 border-white/10 bg-[#0B101B] text-white focus:border-blue-500 focus:outline-none transition-colors"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-white/70 mb-2">
                Message (Optional)
              </label>
              <textarea
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                placeholder="Let's walk together!"
                className="w-full px-4 py-3 rounded-xl border-2 border-white/10 bg-[#0B101B] text-white focus:border-blue-500 focus:outline-none transition-colors resize-none"
                rows={3}
              />
            </div>

            {inviteError && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3 text-sm text-red-400">
                {inviteError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={inviteLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50"
              >
                {inviteLoading ? 'Sending...' : 'Send Invite'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
