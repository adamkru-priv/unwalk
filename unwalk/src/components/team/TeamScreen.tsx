import { useState, useEffect } from 'react';
import { AppHeader } from '../common/AppHeader';
import { BottomNavigation } from '../common/BottomNavigation';

interface Challenge {
  id: string;
  title: string;
  imageUrl: string;
  progress: number;
  status: 'pending' | 'active' | 'completed';
  sentBy?: string;
  sentTo?: string;
  startedAt?: string;
  completedAt?: string;
  goalSteps?: number;
  durationDays?: number;
  currentSteps?: number;
}

interface TeamMember {
  id: string;
  name: string;
  initials: string; // Zamiast emoji używamy inicjałów
  color: string; // Kolor tła dla avatara
  streak: number;
  completedCount: number;
  weeklySteps: number;
  isOrganizer: boolean;
}

// Challenge Detail Modal Component
function ChallengeDetailModal({ challenge, onClose }: { challenge: Challenge; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-5" onClick={onClose}>
      <div 
        className="bg-[#151A25] rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image */}
        <div className="relative aspect-[16/10] w-full rounded-t-3xl overflow-hidden">
          <img
            src={challenge.imageUrl}
            alt={challenge.title}
            className="w-full h-full object-cover"
            style={{ filter: challenge.status === 'completed' ? 'none' : `blur(${Math.max(0, 30 - (challenge.progress * 0.3))}px)` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#151A25] via-transparent to-transparent" />
          
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Title & Status */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-2xl font-bold text-white">{challenge.title}</h2>
              {challenge.status === 'completed' && (
                <div className="text-2xl">✓</div>
              )}
            </div>
            <div className="text-sm text-white/60">
              {challenge.sentBy && challenge.sentTo && (
                <span>From {challenge.sentBy} to {challenge.sentTo}</span>
              )}
            </div>
          </div>

          {/* Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/70">Progress</span>
              <span className="text-lg font-bold text-white">{challenge.progress}%</span>
            </div>
            <div className="bg-white/10 rounded-full h-2 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${
                  challenge.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${challenge.progress}%` }}
              />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#0B101B] rounded-xl p-3">
              <div className="text-xs text-white/50 mb-1">Steps Goal</div>
              <div className="text-lg font-bold text-white">{challenge.goalSteps?.toLocaleString()}</div>
            </div>
            <div className="bg-[#0B101B] rounded-xl p-3">
              <div className="text-xs text-white/50 mb-1">Current Steps</div>
              <div className="text-lg font-bold text-white">
                {challenge.currentSteps?.toLocaleString() || Math.round((challenge.goalSteps || 0) * challenge.progress / 100).toLocaleString()}
              </div>
            </div>
            <div className="bg-[#0B101B] rounded-xl p-3">
              <div className="text-xs text-white/50 mb-1">Duration</div>
              <div className="text-lg font-bold text-white">{challenge.durationDays} days</div>
            </div>
            <div className="bg-[#0B101B] rounded-xl p-3">
              <div className="text-xs text-white/50 mb-1">Status</div>
              <div className="text-lg font-bold text-white capitalize">{challenge.status}</div>
            </div>
          </div>

          {/* Dates */}
          <div className="bg-[#0B101B] rounded-xl p-3 text-sm">
            {challenge.startedAt && (
              <div className="text-white/60">
                Started: <span className="text-white">{challenge.startedAt}</span>
              </div>
            )}
            {challenge.completedAt && (
              <div className="text-white/60 mt-1">
                Completed: <span className="text-green-400">{challenge.completedAt}</span>
              </div>
            )}
          </div>

          {/* Action Button */}
          <button
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function TeamScreen() {
  // Mock data - later from API
  const [familyMembers] = useState<TeamMember[]>([
    { id: '1', name: 'You', initials: 'Y', color: '#3B82F6', streak: 7, completedCount: 3, weeklySteps: 12891, isOrganizer: true },
    { id: '2', name: 'Ewa', initials: 'E', color: '#F59E0B', streak: 2, completedCount: 5, weeklySteps: 15234, isOrganizer: false },
    { id: '3', name: 'Szymon', initials: 'S', color: '#10B981', streak: 0, completedCount: 2, weeklySteps: 10456, isOrganizer: false },
    { id: '4', name: 'Natalia', initials: 'N', color: '#EC4899', streak: 1, completedCount: 1, weeklySteps: 8234, isOrganizer: false },
  ]);

  // Mock pending invitations from friends
  const [pendingInvitations] = useState<Challenge[]>([
    {
      id: 'inv1',
      title: 'Beach Body Challenge',
      imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
      progress: 0,
      status: 'pending',
      sentBy: 'Ewa',
      goalSteps: 50000,
      durationDays: 7,
    },
    {
      id: 'inv2',
      title: 'Mountain Trek',
      imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
      progress: 0,
      status: 'pending',
      sentBy: 'Szymon',
      goalSteps: 100000,
      durationDays: 14,
    },
  ]);

  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);

  // Check if user navigated from home with a specific member ID
  useEffect(() => {
    const selectedId = sessionStorage.getItem('selectedMemberId');
    if (selectedId) {
      const member = familyMembers.find(m => m.id === selectedId);
      if (member) {
        setSelectedMember(member);
      }
      // Clear the selection from sessionStorage
      sessionStorage.removeItem('selectedMemberId');
    }
  }, [familyMembers]);

  const handleAcceptChallenge = (challengeId: string) => {
    console.log('Accept challenge:', challengeId);
    // Later: API call to accept challenge
    // Then: navigate to dashboard or refresh state
  };

  const handleDeclineChallenge = (challengeId: string) => {
    console.log('Decline challenge:', challengeId);
    // Later: API call to decline challenge
  };

  const leaderboard = [...familyMembers].sort((a, b) => b.weeklySteps - a.weeklySteps);

  // Mock challenges between you and selected member
  const getChallengesBetween = (_memberId: string) => {
    // Later from API - will use memberId to fetch real data
    return [
      {
        id: 'ch1',
        title: 'City Explorer',
        imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800',
        progress: 65,
        status: 'active' as const,
        sentBy: 'You',
        sentTo: 'Ewa',
        startedAt: '2025-12-10',
        goalSteps: 50000,
        currentSteps: 32500,
        durationDays: 10,
      },
      {
        id: 'ch2',
        title: 'Morning Walk Challenge',
        imageUrl: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800',
        progress: 100,
        status: 'completed' as const,
        sentBy: 'Ewa',
        sentTo: 'You',
        completedAt: '2025-12-08',
        goalSteps: 30000,
        currentSteps: 30000,
        durationDays: 7,
      },
    ];
  };

  // If a member is selected, show detail view
  if (selectedMember && selectedMember.id !== '1') {
    const challenges = getChallengesBetween(selectedMember.id);
    const sentToThem = challenges.filter(ch => ch.sentBy === 'You');
    const sentByThem = challenges.filter(ch => ch.sentBy !== 'You');

    return (
      <div className="min-h-screen bg-[#0B101B] text-white pb-24 font-sans">
        <AppHeader showBackButton />

        {/* Challenge Detail Modal */}
        {selectedChallenge && (
          <ChallengeDetailModal 
            challenge={selectedChallenge} 
            onClose={() => setSelectedChallenge(null)} 
          />
        )}

        <main className="px-5 pt-6 pb-6 max-w-md mx-auto space-y-6">
          {/* Member Profile Header */}
          <section className="bg-[#151A25] border border-white/5 rounded-2xl p-5">
            <div className="flex items-center gap-4 mb-4">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold"
                style={{ backgroundColor: selectedMember.color }}
              >
                {selectedMember.initials}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white mb-1">{selectedMember.name}</h2>
                <div className="flex items-center gap-3 text-xs text-white/60">
                  {selectedMember.streak > 0 && (
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                      </svg>
                      <span className="text-orange-400">{selectedMember.streak} days</span>
                    </span>
                  )}
                  <span>✓ {selectedMember.completedCount} completed</span>
                </div>
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#0B101B] rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-white">{selectedMember.weeklySteps.toLocaleString()}</div>
                <div className="text-xs text-white/50 mt-0.5">Weekly Steps</div>
              </div>
              <div className="bg-[#0B101B] rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-green-400">{challenges.filter(ch => ch.status === 'completed').length}</div>
                <div className="text-xs text-white/50 mt-0.5">Together</div>
              </div>
            </div>
          </section>

          {/* Challenges You Sent to Them */}
          {sentToThem.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-white/60 mb-3 px-1 uppercase tracking-wider">
                You Sent
              </h3>
              <div className="space-y-2">
                {sentToThem.map((challenge) => (
                  <button
                    key={challenge.id}
                    onClick={() => setSelectedChallenge(challenge)}
                    className="w-full bg-[#151A25] border border-white/5 hover:border-white/10 rounded-2xl p-4 transition-all text-left"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                        <img src={challenge.imageUrl} alt={challenge.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-white text-sm mb-1">{challenge.title}</h4>
                        <div className="flex items-center gap-2 text-xs text-white/60">
                          <span>{challenge.currentSteps?.toLocaleString()} / {challenge.goalSteps?.toLocaleString()}</span>
                          <span>•</span>
                          <span>{challenge.durationDays} days</span>
                        </div>
                      </div>
                      {challenge.status === 'completed' && (
                        <div className="text-xl">✓</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-white/10 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full transition-all" 
                          style={{ width: `${challenge.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-white/70 font-medium min-w-[35px] text-right">{challenge.progress}%</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Challenges They Sent to You */}
          {sentByThem.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-white/60 mb-3 px-1 uppercase tracking-wider">
                {selectedMember.name} Sent
              </h3>
              <div className="space-y-2">
                {sentByThem.map((challenge) => (
                  <button
                    key={challenge.id}
                    onClick={() => setSelectedChallenge(challenge)}
                    className="w-full bg-[#151A25] border border-white/5 hover:border-white/10 rounded-2xl p-4 transition-all text-left"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                        <img src={challenge.imageUrl} alt={challenge.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-white text-sm mb-1">{challenge.title}</h4>
                        <div className="flex items-center gap-2 text-xs text-white/60">
                          <span>{challenge.currentSteps?.toLocaleString()} / {challenge.goalSteps?.toLocaleString()}</span>
                          <span>•</span>
                          <span>{challenge.durationDays} days</span>
                        </div>
                      </div>
                      {challenge.status === 'completed' && (
                        <div className="text-xl">✓</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-white/10 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="h-full bg-green-500 rounded-full transition-all" 
                          style={{ width: `${challenge.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-white/70 font-medium min-w-[35px] text-right">{challenge.progress}%</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Send New Challenge Button */}
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-2xl font-bold text-sm transition-all">
            Send Challenge to {selectedMember.name}
          </button>
        </main>

        <BottomNavigation currentScreen="team" onTeamClick={() => setSelectedMember(null)} />
      </div>
    );
  }

  // Main Team Screen (list view)
  return (
    <div className="min-h-screen bg-[#0B101B] text-white pb-24 font-sans">
      {/* Header */}
      <AppHeader />

      <main className="px-5 pt-6 pb-6 max-w-md mx-auto space-y-6">
        
        {/* Hero Header */}
        <div className="text-center">
          <h1 className="text-3xl font-black text-white mb-1">
            Your Team
          </h1>
          <p className="text-sm text-white/50">
            Challenge friends & family
          </p>
        </div>

        {/* PENDING INVITATIONS - Top Priority */}
        {pendingInvitations.length > 0 && (
          <section>
            <div className="bg-gradient-to-br from-blue-900/40 to-purple-900/40 border border-blue-500/30 rounded-3xl p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-blue-500/20 rounded-full blur-2xl"></div>
              
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2 relative z-10">
                <span>📬</span>
                <span>Invitations</span>
                <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  {pendingInvitations.length}
                </span>
              </h2>
              
              <div className="space-y-3 relative z-10">
                {pendingInvitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="bg-white/5 border border-white/10 rounded-2xl p-3"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 ring-2 ring-blue-500/50">
                        <img
                          src={invitation.imageUrl}
                          alt={invitation.title}
                          className="w-full h-full object-cover"
                          style={{ filter: 'blur(8px)' }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white text-sm mb-1">{invitation.title}</h3>
                        <div className="text-xs text-blue-400 mb-2">
                          From {invitation.sentBy}
                        </div>
                        
                        <div className="flex items-center gap-3 text-xs text-white/60">
                          <span>{invitation.goalSteps?.toLocaleString()} steps</span>
                          <span>•</span>
                          <span>{invitation.durationDays} days</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptChallenge(invitation.id)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl font-bold text-sm transition-all"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleDeclineChallenge(invitation.id)}
                        className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded-xl font-medium text-sm transition-all"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Family Members Grid */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-sm font-bold text-white/60 uppercase tracking-wider">
              Family ({familyMembers.length})
            </h2>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Invite
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {familyMembers.map((member) => (
              <button
                key={member.id}
                onClick={() => member.id !== '1' && setSelectedMember(member)}
                disabled={member.id === '1'}
                className={`bg-[#151A25] border border-white/5 rounded-2xl p-4 transition-all text-left ${
                  member.id === '1' ? 'opacity-50 cursor-default' : 'hover:bg-[#1A1F2E] hover:border-white/10 cursor-pointer'
                }`}
              >
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-2"
                  style={{ backgroundColor: member.color }}
                >
                  {member.initials}
                </div>
                <div className="text-center">
                  <div className="font-bold text-white text-sm mb-2">{member.name}</div>
                  
                  {/* Stats */}
                  <div className="space-y-1">
                    {member.streak > 0 ? (
                      <div className="flex items-center justify-center gap-1 text-xs text-orange-400 font-medium">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                        </svg>
                        <span>{member.streak} days</span>
                      </div>
                    ) : (
                      <div className="text-xs text-white/30">No streak</div>
                    )}
                    
                    <div className="text-xs text-white/50">
                      ✓ {member.completedCount} done
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Team Leaderboard */}
        <section>
          <h2 className="text-sm font-bold text-white/60 mb-3 px-1 uppercase tracking-wider">
            🏆 This Week
          </h2>
          
          <div className="bg-[#151A25] border border-white/5 rounded-2xl overflow-hidden">
            {leaderboard.map((member, index) => (
              <div
                key={member.id}
                className={`flex items-center gap-3 p-3.5 ${
                  index !== leaderboard.length - 1 ? 'border-b border-white/5' : ''
                } ${index === 0 ? 'bg-amber-500/5' : ''}`}
              >
                {/* Rank */}
                <div className="text-lg font-bold w-6 text-center flex-shrink-0">
                  {index === 0 && '🥇'}
                  {index === 1 && '🥈'}
                  {index === 2 && '🥉'}
                  {index > 2 && <span className="text-white/30 text-sm">{index + 1}</span>}
                </div>

                {/* Avatar & Name */}
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-bold"
                  style={{ backgroundColor: member.color }}
                >
                  {member.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white text-sm">{member.name}</div>
                  <div className="text-xs text-white/50">
                    {member.weeklySteps.toLocaleString()} steps
                  </div>
                </div>

                {/* Streak */}
                {member.streak > 0 && (
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-1 text-orange-400 text-xs font-medium">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                      </svg>
                      <span>{member.streak}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation currentScreen="team" onTeamClick={() => setSelectedMember(null)} />
    </div>
  );
}