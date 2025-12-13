import { useState } from 'react';
import { AppHeader } from '../common/AppHeader';
import { BottomNavigation } from '../common/BottomNavigation';
import { useChallengeStore } from '../../stores/useChallengeStore';

export function TeamScreen() {
  const [referralCode] = useState('MOVE2025');
  const [copied, setCopied] = useState(false);

  // Mock data - later from API
  const [familyMembers] = useState([
    { id: '1', name: 'Mama', avatar: '👩', streak: 2, completedCount: 5, weeklySteps: 15234 },
    { id: '2', name: 'You', avatar: '🙋‍♂️', streak: 7, completedCount: 3, weeklySteps: 12891 },
    { id: '3', name: 'Tata', avatar: '👨', streak: 0, completedCount: 2, weeklySteps: 10456 },
    { id: '4', name: 'Kasia', avatar: '👧', streak: 1, completedCount: 1, weeklySteps: 8234 },
  ]);

  const [pendingInvitations] = useState([
    { id: '1', name: 'Jan Kowalski', avatar: '👤', sentAt: '2 days ago' },
    { id: '2', name: 'Anna Nowak', avatar: '👤', sentAt: '1 week ago' },
  ]);

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAcceptInvite = (id: string) => {
    alert(`✅ Invitation accepted! ${id} is now part of your team.`);
  };

  const handleDeclineInvite = (id: string) => {
    alert(`❌ Invitation declined.`);
  };

  const leaderboard = [...familyMembers].sort((a, b) => b.weeklySteps - a.weeklySteps);

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-20">
      {/* Header */}
      <AppHeader title="My Team" />

      <main className="px-6 py-6 max-w-4xl mx-auto space-y-6">
        {/* Family Members Grid */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Family Members ({familyMembers.length})</h2>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Invite
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {familyMembers.map((member) => (
              <div
                key={member.id}
                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 hover:bg-gray-800 transition-all"
              >
                <div className="text-4xl mb-2 text-center">{member.avatar}</div>
                <div className="text-center">
                  <div className="font-bold text-white text-sm mb-2">{member.name}</div>
                  
                  {/* Stats */}
                  <div className="space-y-1">
                    {member.streak > 0 ? (
                      <div className="text-xs">
                        <span className="text-orange-400">🔥 {member.streak} day streak</span>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500">No active streak</div>
                    )}
                    
                    <div className="text-xs text-gray-400">
                      ✓ {member.completedCount} completed
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Pending Invitations */}
        {pendingInvitations.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-white mb-4">
              📨 Pending Invitations ({pendingInvitations.length})
            </h2>
            
            <div className="space-y-3">
              {pendingInvitations.map((invite) => (
                <div
                  key={invite.id}
                  className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center gap-4"
                >
                  <div className="text-3xl">{invite.avatar}</div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white">{invite.name}</div>
                    <div className="text-sm text-gray-400">Sent {invite.sentAt}</div>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleAcceptInvite(invite.id)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleDeclineInvite(invite.id)}
                      className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Referral Program */}
        <section>
          <div className="bg-gradient-to-br from-amber-900/30 to-orange-900/30 border border-amber-700/50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🎁</span>
              <div>
                <h2 className="text-xl font-bold text-white">Referral Program</h2>
                <p className="text-amber-200/80 text-sm">Invite friends & unlock Pro features!</p>
              </div>
            </div>

            <div className="bg-black/30 rounded-lg p-4 mb-4">
              <div className="text-xs text-amber-200/60 mb-2">Your referral code:</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-900 border border-amber-700/50 rounded-lg px-4 py-3 font-mono text-amber-200 text-lg font-bold">
                  {referralCode}
                </div>
                <button
                  onClick={handleCopyReferral}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  {copied ? (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            <button className="w-full bg-amber-600 hover:bg-amber-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share Invite Link
            </button>

            <div className="mt-4 text-xs text-amber-200/60 text-center">
              🎉 Invite 3 friends to unlock Pro for free!
            </div>
          </div>
        </section>

        {/* Team Leaderboard */}
        <section>
          <h2 className="text-xl font-bold text-white mb-4">🏆 Weekly Leaderboard</h2>
          
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
            {leaderboard.map((member, index) => (
              <div
                key={member.id}
                className={`flex items-center gap-4 p-4 ${
                  index !== leaderboard.length - 1 ? 'border-b border-gray-700' : ''
                } ${index === 0 ? 'bg-amber-900/20' : ''}`}
              >
                {/* Rank */}
                <div className="text-2xl font-bold w-8 text-center">
                  {index === 0 && '🥇'}
                  {index === 1 && '🥈'}
                  {index === 2 && '🥉'}
                  {index > 2 && <span className="text-gray-500">{index + 1}</span>}
                </div>

                {/* Avatar & Name */}
                <div className="text-3xl">{member.avatar}</div>
                <div className="flex-1">
                  <div className="font-bold text-white">{member.name}</div>
                  <div className="text-sm text-gray-400">
                    {member.weeklySteps.toLocaleString()} steps this week
                  </div>
                </div>

                {/* Streak */}
                {member.streak > 0 && (
                  <div className="text-right">
                    <div className="text-orange-400 text-sm font-medium">
                      🔥 {member.streak}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation currentScreen="team" />
    </div>
  );
}