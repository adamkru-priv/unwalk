import { useEffect, useState } from 'react';
import { AppHeader } from '../common/AppHeader';
import { BottomNavigation } from '../common/BottomNavigation';
import { getCompletedChallenges } from '../../lib/api';
import type { UserChallenge } from '../../types';

interface Badge {
  id: string;
  title: string;
  icon: string;
  unlocked: boolean;
  gradient: string;
}

export function BadgesScreen() {
  const [completedChallenges, setCompletedChallenges] = useState<UserChallenge[]>([]);
  const [selectedImage, setSelectedImage] = useState<{ url: string; title: string } | null>(null);

  // Mock badges - later from API based on achievements
  const badges: Badge[] = [
    {
      id: '1',
      title: 'First Steps',
      icon: '👣',
      unlocked: true,
      gradient: 'from-blue-400 to-blue-600',
    },
    {
      id: '2',
      title: 'Week Warrior',
      icon: '🔥',
      unlocked: true,
      gradient: 'from-orange-400 to-red-600',
    },
    {
      id: '3',
      title: '10K Master',
      icon: '⭐',
      unlocked: false,
      gradient: 'from-gray-600 to-gray-700',
    },
    {
      id: '4',
      title: 'Marathon',
      icon: '🏃',
      unlocked: false,
      gradient: 'from-gray-600 to-gray-700',
    },
    {
      id: '5',
      title: 'Streak 7',
      icon: '💪',
      unlocked: false,
      gradient: 'from-gray-600 to-gray-700',
    },
    {
      id: '6',
      title: 'Explorer',
      icon: '🌍',
      unlocked: false,
      gradient: 'from-gray-600 to-gray-700',
    },
    {
      id: '7',
      title: 'Distance King',
      icon: '🚀',
      unlocked: false,
      gradient: 'from-gray-600 to-gray-700',
    },
    {
      id: '8',
      title: 'Team Player',
      icon: '👥',
      unlocked: false,
      gradient: 'from-gray-600 to-gray-700',
    },
    {
      id: '9',
      title: 'Consistent',
      icon: '📅',
      unlocked: false,
      gradient: 'from-gray-600 to-gray-700',
    },
  ];

  useEffect(() => {
    loadCompletedChallenges();
  }, []);

  const loadCompletedChallenges = async () => {
    try {
      const data = await getCompletedChallenges();
      setCompletedChallenges(data);
    } catch (err) {
      console.error('Failed to load completed challenges:', err);
    }
  };

  const unlockedCount = badges.filter(b => b.unlocked).length;

  return (
    <div className="min-h-screen bg-[#0B101B] text-white pb-20 font-sans">
      {/* Header */}
      <AppHeader />

      {/* Image Viewer Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white z-10"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedImage.url}
              alt={selectedImage.title}
              className="w-full h-auto rounded-lg shadow-2xl"
            />
            <div className="mt-4 text-center">
              <h3 className="text-xl font-bold text-white mb-1">{selectedImage.title}</h3>
              <p className="text-white/70 text-sm">Tap outside to close</p>
            </div>
          </div>
        </div>
      )}

      <main className="px-6 py-6 max-w-4xl mx-auto space-y-8">
        {/* BADGES SECTION */}
        <section>
          <div className="bg-[#151A25] border border-white/5 rounded-3xl p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🏆</span>
                <span>Badges</span>
              </h3>
              <div className="text-sm text-gray-400 font-medium">
                {unlockedCount}/{badges.length}
              </div>
            </div>

            {/* Badges Grid */}
            <div className="grid grid-cols-3 gap-6">
              {badges.map((badge) => (
                <div key={badge.id} className="flex flex-col items-center gap-2">
                  {/* Badge Circle */}
                  <div className="relative">
                    <div
                      className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                        badge.unlocked
                          ? `bg-gradient-to-br ${badge.gradient} shadow-xl`
                          : 'bg-[#0B101B] border border-white/5 opacity-50'
                      }`}
                    >
                      {/* Icon */}
                      <div className={`text-4xl ${!badge.unlocked && 'grayscale opacity-50'}`}>
                        {badge.icon}
                      </div>

                      {/* NEW Badge - only for first unlocked */}
                      {badge.unlocked && badge.id === '1' && (
                        <div className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                          NEW
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <div className={`text-xs text-center font-medium ${
                    badge.unlocked ? 'text-white' : 'text-gray-500'
                  }`}>
                    {badge.title}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* COMPLETED CHALLENGES GALLERY */}
        {completedChallenges.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span>✓</span>
              <span>Your Collection ({completedChallenges.length})</span>
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {completedChallenges.map((challenge) => (
                <div
                  key={challenge.id}
                  onClick={() => setSelectedImage({
                    url: challenge.admin_challenge?.image_url || '',
                    title: challenge.admin_challenge?.title || ''
                  })}
                  className="relative aspect-square rounded-2xl overflow-hidden shadow-md group cursor-pointer hover:scale-105 transition-transform"
                >
                  <img
                    src={challenge.admin_challenge?.image_url}
                    alt={challenge.admin_challenge?.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-3">
                    <div className="text-white w-full">
                      <div className="font-bold text-sm mb-1 truncate">{challenge.admin_challenge?.title}</div>
                      <div className="text-xs opacity-90">{challenge.current_steps.toLocaleString()} steps</div>
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1.5">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  
                  {/* Zoom hint overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                    <div className="bg-white/90 backdrop-blur-sm rounded-full p-2">
                      <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty State for Completed Challenges */}
        {completedChallenges.length === 0 && (
          <section>
            <div className="bg-[#151A25] border border-white/5 rounded-3xl p-8 text-center">
              <div className="text-4xl mb-3">🎯</div>
              <h3 className="text-lg font-bold text-white mb-2">No Completed Challenges Yet</h3>
              <p className="text-gray-400 text-sm">
                Complete challenges to build your collection!
              </p>
            </div>
          </section>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation currentScreen="badges" />
    </div>
  );
}
