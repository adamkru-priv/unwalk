import { useState } from 'react';
import { AppHeader } from '../common/AppHeader';
import { BottomNavigation } from '../common/BottomNavigation';

export function TeamScreen() {
  // Mock data - later from API
  const [familyMembers] = useState([
    { id: '1', name: 'You', avatar: '🙋‍♂️', streak: 7, completedCount: 3, weeklySteps: 12891, isOrganizer: true },
    { id: '2', name: 'Ewa', avatar: '👩', streak: 2, completedCount: 5, weeklySteps: 15234, isOrganizer: false },
    { id: '3', name: 'Szymon', avatar: '👦', streak: 0, completedCount: 2, weeklySteps: 10456, isOrganizer: false },
    { id: '4', name: 'Natalia', avatar: '👧', streak: 1, completedCount: 1, weeklySteps: 8234, isOrganizer: false },
  ]);

  const leaderboard = [...familyMembers].sort((a, b) => b.weeklySteps - a.weeklySteps);

  return (
    <div className="min-h-screen bg-[#0B101B] text-white pb-20 font-sans">
      {/* Header */}
      <AppHeader />

      <main className="px-5 py-6 max-w-md mx-auto space-y-6">
        {/* Family Members Grid */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-lg font-semibold text-white">Family Members ({familyMembers.length})</h2>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Invite
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {familyMembers.map((member) => (
              <div
                key={member.id}
                className="bg-[#151A25] border border-white/5 rounded-2xl p-3 hover:border-white/10 transition-all"
              >
                <div className="text-3xl mb-2 text-center">{member.avatar}</div>
                <div className="text-center">
                  <div className="font-bold text-white text-sm mb-1.5">{member.name}</div>
                  
                  {/* Stats */}
                  <div className="space-y-0.5">
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

        {/* Team Leaderboard */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-3 px-1">🏆 Weekly Leaderboard</h2>
          
          <div className="bg-[#151A25] border border-white/5 rounded-2xl overflow-hidden">
            {leaderboard.map((member, index) => (
              <div
                key={member.id}
                className={`flex items-center gap-3 p-3 ${
                  index !== leaderboard.length - 1 ? 'border-b border-white/5' : ''
                } ${index === 0 ? 'bg-amber-900/10' : ''}`}
              >
                {/* Rank */}
                <div className="text-xl font-bold w-7 text-center flex-shrink-0">
                  {index === 0 && '🥇'}
                  {index === 1 && '🥈'}
                  {index === 2 && '🥉'}
                  {index > 2 && <span className="text-gray-500 text-base">{index + 1}</span>}
                </div>

                {/* Avatar & Name */}
                <div className="text-2xl flex-shrink-0">{member.avatar}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white text-sm">{member.name}</div>
                  <div className="text-xs text-gray-400">
                    {member.weeklySteps.toLocaleString()} steps
                  </div>
                </div>

                {/* Streak */}
                {member.streak > 0 && (
                  <div className="text-right flex-shrink-0">
                    <div className="text-orange-400 text-xs font-medium">
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