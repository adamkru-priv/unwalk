import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface LeaderboardEntry {
  id: string;
  user_id: string;
  score: number;
  difficulty: 'easy' | 'medium' | 'hard';
  opponent_name: string;
  won: boolean;
  played_at: string;
  user_nickname?: string;
}

interface SprintLeaderboardProps {
  onBack: () => void;
}

export function SprintLeaderboard({ onBack }: SprintLeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadLeaderboard();
    getCurrentUser();
  }, [selectedDifficulty]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('sprint_challenge_scores')
        .select(`
          id,
          user_id,
          score,
          difficulty,
          opponent_name,
          won,
          played_at
        `)
        .order('score', { ascending: false })
        .limit(50);

      if (selectedDifficulty !== 'all') {
        query = query.eq('difficulty', selectedDifficulty);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading leaderboard:', error);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(data?.map(entry => entry.user_id) || [])];
      
      // Fetch user nicknames
      const { data: users } = await supabase
        .from('users')
        .select('id, nickname')
        .in('id', userIds);

      const userMap = new Map(users?.map(u => [u.id, u.nickname]) || []);

      // Merge data
      const entriesWithNicknames = data?.map(entry => ({
        ...entry,
        user_nickname: userMap.get(entry.user_id) || 'Anonymous'
      })) || [];

      setEntries(entriesWithNicknames);
    } catch (err) {
      console.error('Error loading leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'hard': return 'text-red-400';
      default: return 'text-white';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-6 relative overflow-hidden flex flex-col" style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(250,204,21,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(250,204,21,0.3) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-yellow-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <button
        onClick={onBack}
        className="relative z-10 mb-3 text-white/60 hover:text-white flex items-center gap-2 transition-colors text-sm"
      >
        ← Back
      </button>

      <div className="relative z-10 text-center mb-5">
        <div className="inline-block mb-3">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-orange-600 rounded-full blur-xl opacity-60 animate-pulse"></div>
            <div className="relative w-16 h-16 bg-gradient-to-br from-yellow-400 via-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-2xl">
              <span className="text-3xl">🏆</span>
            </div>
          </div>
        </div>
        <h1 className="text-3xl font-black text-white mb-2 tracking-tight">
          Leaderboard
        </h1>
        <p className="text-yellow-400 text-sm font-bold">Top Sprint Challengers</p>
      </div>

      {/* Difficulty Filter */}
      <div className="relative z-10 flex gap-2 mb-4 overflow-x-auto pb-2">
        {['all', 'easy', 'medium', 'hard'].map((difficulty) => (
          <button
            key={difficulty}
            onClick={() => setSelectedDifficulty(difficulty as any)}
            className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex-shrink-0 ${
              selectedDifficulty === difficulty
                ? 'bg-yellow-500/30 text-yellow-300 border-2 border-yellow-400/50'
                : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
            }`}
          >
            {difficulty}
          </button>
        ))}
      </div>

      {/* Leaderboard List */}
      <div className="relative z-10 flex-1 overflow-y-auto space-y-2">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin"></div>
            <p className="text-white/50 text-sm mt-3 font-medium">Loading...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">🎯</div>
            <p className="text-white/50 text-sm font-medium">No scores yet!</p>
            <p className="text-white/30 text-xs mt-1">Be the first to set a record</p>
          </div>
        ) : (
          entries.map((entry, index) => {
            const isCurrentUser = entry.user_id === currentUserId;
            const isTopThree = index < 3;
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;

            return (
              <div
                key={entry.id}
                className={`relative overflow-hidden rounded-xl p-3 border transition-all ${
                  isCurrentUser
                    ? 'bg-cyan-500/20 border-cyan-400/40 shadow-lg shadow-cyan-500/20'
                    : isTopThree
                    ? 'bg-yellow-500/10 border-yellow-500/30'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Rank */}
                  <div className="flex-shrink-0 w-8 text-center">
                    {medal ? (
                      <span className="text-2xl">{medal}</span>
                    ) : (
                      <span className="text-lg font-black text-white/40">#{index + 1}</span>
                    )}
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-black text-white truncate">
                        {entry.user_nickname}
                      </span>
                      {isCurrentUser && (
                        <span className="text-xs px-1.5 py-0.5 bg-cyan-500/30 text-cyan-300 rounded font-bold">YOU</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`font-bold uppercase ${getDifficultyColor(entry.difficulty)}`}>
                        {entry.difficulty}
                      </span>
                      <span className="text-white/30">•</span>
                      <span className="text-white/50">vs {entry.opponent_name}</span>
                      {entry.won && <span className="text-green-400">✓</span>}
                    </div>
                  </div>

                  {/* Score */}
                  <div className="flex-shrink-0 text-right">
                    <div className="text-2xl font-black text-white">{entry.score}</div>
                    <div className="text-[10px] text-white/40 font-bold uppercase">steps</div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Stats */}
      {!loading && entries.length > 0 && currentUserId && (
        <div className="relative z-10 mt-4 pt-4 border-t border-white/10">
          <div className="text-center">
            <p className="text-white/40 text-xs uppercase tracking-wider font-bold mb-2">Your Stats</p>
            <div className="flex justify-center gap-4">
              <div>
                <div className="text-lg font-black text-cyan-400">
                  {entries.filter(e => e.user_id === currentUserId).length}
                </div>
                <div className="text-[10px] text-white/50 font-bold uppercase">Games</div>
              </div>
              <div>
                <div className="text-lg font-black text-green-400">
                  {entries.filter(e => e.user_id === currentUserId && e.won).length}
                </div>
                <div className="text-[10px] text-white/50 font-bold uppercase">Wins</div>
              </div>
              <div>
                <div className="text-lg font-black text-yellow-400">
                  {Math.max(...entries.filter(e => e.user_id === currentUserId).map(e => e.score), 0)}
                </div>
                <div className="text-[10px] text-white/50 font-bold uppercase">Best</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
