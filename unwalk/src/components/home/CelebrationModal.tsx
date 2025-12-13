import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { UserChallenge } from '../../types';
import { claimCompletedChallenge } from '../../lib/api';

interface CelebrationModalProps {
  challenge: UserChallenge;
  onClaim: () => void;
}

export function CelebrationModal({ challenge, onClaim }: CelebrationModalProps) {
  const [claiming, setClaiming] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const navigate = useNavigate();

  // Mock QR code - replace with real QR generation if needed
  const hasQRCode = Math.random() > 0.5; // 50% mają QR code
  const qrCodeUrl = hasQRCode ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=REWARD_${challenge.id}` : null;

  const handleClaim = async () => {
    if (hasQRCode && !showQR) {
      // Jeśli ma QR code, najpierw pokaż QR
      setShowQR(true);
      return;
    }

    try {
      setClaiming(true);
      await claimCompletedChallenge(challenge.id);
      onClaim();
    } catch (error) {
      console.error('Failed to claim reward:', error);
      alert('Failed to claim reward. Please try again.');
      setClaiming(false);
    }
  };

  const handleStatsClick = () => {
    navigate('/stats');
    onClaim();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-gradient-to-br from-purple-900/95 via-blue-900/95 to-indigo-900/95 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="max-w-md w-full"
      >
        {/* Animated Confetti/Stars Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ 
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
                y: [0, -100],
                x: [0, (Math.random() - 0.5) * 200]
              }}
              transition={{
                duration: 2,
                delay: i * 0.1,
                repeat: Infinity,
                repeatDelay: 3
              }}
              className="absolute text-2xl"
              style={{
                left: `${Math.random() * 100}%`,
                top: '50%'
              }}
            >
              {['⭐', '✨', '🎉', '🎊'][Math.floor(Math.random() * 4)]}
            </motion.div>
          ))}
        </div>

        {/* Main Content Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white/10 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl border border-white/20"
        >
          {/* Header */}
          <div className="text-center pt-8 pb-4 px-6">
            <motion.div
              animate={{ 
                rotate: [0, -10, 10, -10, 10, 0],
                scale: [1, 1.1, 1.1, 1.1, 1.1, 1]
              }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-7xl mb-4"
            >
              🏆
            </motion.div>
            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-3xl font-black text-white mb-2 tracking-tight"
            >
              Challenge Complete!
            </motion.h1>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-white/80 text-sm"
            >
              You've unlocked a new destination
            </motion.p>
          </div>

          {/* Revealed Image */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="relative mx-4 rounded-2xl overflow-hidden shadow-xl"
          >
            <img
              src={challenge.admin_challenge?.image_url}
              alt={challenge.admin_challenge?.title}
              className="w-full aspect-[4/3] object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h2 className="text-xl font-bold text-white mb-1">
                {challenge.admin_challenge?.title}
              </h2>
            </div>
          </motion.div>

          {/* Stats Section - Clickable */}
          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
            onClick={handleStatsClick}
            className="w-full px-4 py-4 hover:bg-white/5 transition-colors group"
          >
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-white/5 rounded-xl p-3 backdrop-blur-sm border border-white/10 group-hover:border-white/30 transition-colors">
                <div className="text-2xl font-bold text-white mb-1">
                  {challenge.current_steps.toLocaleString()}
                </div>
                <div className="text-xs text-white/60 uppercase tracking-wide">Steps</div>
              </div>
              <div className="bg-white/5 rounded-xl p-3 backdrop-blur-sm border border-white/10 group-hover:border-white/30 transition-colors">
                <div className="text-2xl font-bold text-white mb-1">
                  {((challenge.current_steps * 0.8) / 1000).toFixed(1)}km
                </div>
                <div className="text-xs text-white/60 uppercase tracking-wide">Distance</div>
              </div>
            </div>
            <p className="text-center text-white/40 text-xs mt-2 group-hover:text-white/60 transition-colors">
              Tap to view detailed stats →
            </p>
          </motion.button>

          {/* QR Code Section */}
          {showQR && qrCodeUrl && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0, height: 0 }}
              animate={{ scale: 1, opacity: 1, height: "auto" }}
              className="mx-4 mb-4 bg-white rounded-2xl p-6 text-center shadow-xl"
            >
              <div className="text-4xl mb-3">🎁</div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">Your Reward</h3>
              <div className="bg-gray-50 rounded-xl p-4 inline-block">
                <img
                  src={qrCodeUrl}
                  alt="Reward QR Code"
                  className="w-48 h-48"
                />
              </div>
              <p className="text-sm text-gray-600 mt-3">
                Show this code to claim your reward
              </p>
            </motion.div>
          )}

          {/* Claim Button */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="p-4"
          >
            <button
              onClick={handleClaim}
              disabled={claiming}
              className="w-full bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 hover:from-emerald-600 hover:via-green-600 hover:to-teal-600 text-white px-6 py-4 rounded-2xl font-bold text-base transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 relative overflow-hidden group"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {claiming ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Claiming...
                  </>
                ) : showQR ? (
                  <>
                    <span className="text-xl">✓</span>
                    I Claimed My Reward
                  </>
                ) : hasQRCode ? (
                  <>
                    <span className="text-xl">🎁</span>
                    Show My Reward
                  </>
                ) : (
                  <>
                    <span className="text-xl">🎉</span>
                    Claim Reward
                  </>
                )}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            </button>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
