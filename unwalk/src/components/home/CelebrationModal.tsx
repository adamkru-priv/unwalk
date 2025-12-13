import { useState } from 'react';
import { motion } from 'framer-motion';
import type { UserChallenge } from '../../types';
import { claimCompletedChallenge } from '../../lib/api';

interface CelebrationModalProps {
  challenge: UserChallenge;
  onClaim: () => void;
}

export function CelebrationModal({ challenge, onClaim }: CelebrationModalProps) {
  const [claiming, setClaiming] = useState(false);
  const [showQR, setShowQR] = useState(false);

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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-6 overflow-y-auto"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="max-w-2xl w-full"
      >
        {/* Confetti animation */}
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.3 }}
            className="text-8xl mb-4"
          >
            🎉
          </motion.div>
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-4xl font-bold text-white mb-2"
          >
            Congratulations!
          </motion.h1>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-xl text-white/80"
          >
            You completed the challenge!
          </motion.p>
        </div>

        {/* Revealed Image */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="relative rounded-2xl overflow-hidden shadow-2xl mb-6"
        >
          <img
            src={challenge.admin_challenge?.image_url}
            alt={challenge.admin_challenge?.title}
            className="w-full aspect-video object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {challenge.admin_challenge?.title}
              </h2>
              <div className="flex items-center gap-4 text-white/90">
                <span>{challenge.current_steps.toLocaleString()} steps</span>
                <span>•</span>
                <span>{((challenge.current_steps * 0.8) / 1000).toFixed(1)}km</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* QR Code Section */}
        {showQR && qrCodeUrl && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 text-center mb-6"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4">🎁 Your Reward QR Code</h3>
            <img
              src={qrCodeUrl}
              alt="Reward QR Code"
              className="mx-auto mb-4"
            />
            <p className="text-sm text-gray-600">
              Show this code to claim your reward!
            </p>
          </motion.div>
        )}

        {/* Claim Button */}
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          onClick={handleClaim}
          disabled={claiming}
          className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-4 rounded-xl font-bold text-lg transition-all shadow-2xl hover:shadow-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {claiming ? (
            'Claiming...'
          ) : showQR ? (
            '✓ I Claimed My Reward'
          ) : hasQRCode ? (
            '🎁 Show QR Code to Claim'
          ) : (
            '🎉 Claim Reward'
          )}
        </motion.button>

        {!showQR && hasQRCode && (
          <p className="text-center text-white/60 text-sm mt-3">
            Click to reveal your reward QR code
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}
