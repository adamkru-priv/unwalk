import { AppHeader } from '../common/AppHeader';
import { BottomNavigation } from '../common/BottomNavigation';
import { useChallengeStore } from '../../stores/useChallengeStore';
import { useState } from 'react';

export function ProfileScreen() {
  const userTier = useChallengeStore((s) => s.userTier);
  const setUserTier = useChallengeStore((s) => s.setUserTier);
  
  const [referralCode] = useState('MOVE2025');
  const [copied, setCopied] = useState(false);
  
  const [pendingInvitations] = useState([
    { id: '1', name: 'Jan Kowalski', sentAt: '2 days ago' },
    { id: '2', name: 'Anna Nowak', sentAt: '1 week ago' },
  ]);

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAcceptInvite = (_id: string, name: string) => {
    alert(`✅ ${name} accepted!`);
  };

  const handleDeclineInvite = (name: string) => {
    alert(`❌ ${name} declined.`);
  };

  return (
    <div className="min-h-screen bg-[#0B101B] text-white pb-20 font-sans">
      {/* Header */}
      <AppHeader />

      <main className="px-5 py-6 max-w-md mx-auto space-y-5">
        {/* Pending Invitations - Compact */}
        {pendingInvitations.length > 0 && (
          <section className="bg-[#151A25] border border-white/5 rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5">
              <span>📨</span>
              <span>Pending Invitations ({pendingInvitations.length})</span>
            </h2>
            
            <div className="space-y-2">
              {pendingInvitations.map((invite) => (
                <div
                  key={invite.id}
                  className="bg-[#0B101B] border border-white/5 rounded-xl p-3 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white text-sm">{invite.name}</div>
                    <div className="text-xs text-gray-500">{invite.sentAt}</div>
                  </div>

                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleAcceptInvite(invite.id, invite.name)}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleDeclineInvite(invite.name)}
                      className="bg-white/5 hover:bg-white/10 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-white/10"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Referral Code - Compact */}
        <section className="bg-gradient-to-br from-amber-900/20 to-orange-900/20 border border-amber-700/30 rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5">
            <span>🎁</span>
            <span>Invite Friends</span>
          </h2>
          
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-[#0B101B] border border-amber-700/50 rounded-lg px-3 py-2 font-mono text-amber-200 text-sm font-medium">
              {referralCode}
            </div>
            <button
              onClick={handleCopyReferral}
              className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-1.5 flex-shrink-0"
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-xs">Copied</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs">Copy</span>
                </>
              )}
            </button>
          </div>
          
          <p className="text-xs text-amber-200/60 mt-2 text-center">
            Invite 3 friends to unlock Pro
          </p>
        </section>

        {/* Account Type */}
        <section className="bg-[#151A25] border border-white/5 rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-white mb-3">Account Type</h2>
          
          <div className="flex items-center gap-2 bg-[#0B101B] rounded-lg p-1 mb-3 border border-white/5">
            <button
              onClick={() => setUserTier('basic')}
              className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                userTier === 'basic' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Basic
            </button>
            <button
              onClick={() => setUserTier('pro')}
              className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                userTier === 'pro' 
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Pro ⭐
            </button>
          </div>

          {/* Plan Features Comparison - Compact */}
          {userTier === 'basic' ? (
            <div className="bg-[#0B101B] rounded-xl p-3 border border-white/5">
              <div className="text-xs font-semibold text-white mb-2">Basic Plan</div>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-start gap-2 text-gray-400">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Contains ads</span>
                </div>
                <div className="flex items-start gap-2 text-gray-400">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Can't pause challenges</span>
                </div>
                <div className="flex items-start gap-2 text-gray-400">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Only 1 active challenge</span>
                </div>
              </div>
              <button
                onClick={() => setUserTier('pro')}
                className="w-full mt-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-3 py-2 rounded-lg font-semibold text-xs transition-all shadow-md hover:shadow-lg"
              >
                Upgrade to Pro ⭐
              </button>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-amber-900/30 to-orange-900/30 rounded-xl p-3 border border-amber-700/50">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">⭐</span>
                <div className="text-xs font-semibold text-amber-200">Pro Plan Active</div>
              </div>
              <div className="space-y-1.5 text-xs text-amber-100">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>No Ads</span>
                </div>
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Pause & resume challenges</span>
                </div>
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Multiple active challenges</span>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation currentScreen="home" />
    </div>
  );
}
