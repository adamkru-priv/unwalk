import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChallengeStore } from '../../stores/useChallengeStore';

const slides = [
  {
    title: 'Move at Your Own Pace',
    subtitle: 'Challenge yourself or friends & family',
    description: 'Solo walks or team adventures - you decide how to stay active',
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80', // People walking together
    features: [
      { icon: '🎯', text: 'Personal challenges' },
      { icon: '👥', text: 'Family & friends' },
    ],
  },
  {
    title: 'Unlock Rewards & Badges',
    subtitle: 'Every step brings you closer',
    description: 'Reveal beautiful images, earn badges, and track your progress',
    image: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=800&q=80', // Trophy/reward imagery
    features: [
      { icon: '🖼️', text: 'Hidden images' },
      { icon: '🏆', text: 'Achievement badges' },
      { icon: '⭐', text: 'Earn points' },
    ],
  },
  {
    title: 'Connect Apple Health',
    subtitle: 'Automatic step tracking',
    description: 'We sync with Apple Health to count your steps. Your data stays private and secure.',
    image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80', // Fitness/health tracking
    features: [
      { icon: '📱', text: 'Auto sync steps' },
      { icon: '🔒', text: 'Private & secure' },
      { icon: '⚡', text: 'Real-time updates' },
    ],
  },
];

export function OnboardingScreen() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const setOnboardingComplete = useChallengeStore((s) => s.setOnboardingComplete);
  const setHealthConnected = useChallengeStore((s) => s.setHealthConnected);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      // Last slide - connect health
      handleConnectHealth();
    }
  };

  const handleSkip = () => {
    setOnboardingComplete(true);
  };

  const handleConnectHealth = async () => {
    // TODO: Implement Capacitor HealthKit integration
    // For now, simulate connection
    console.log('Connecting to Apple Health...');
    setHealthConnected(true);
    setOnboardingComplete(true);
  };

  const slide = slides[currentSlide];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0B101B] to-[#151A25] flex flex-col relative overflow-hidden">
      {/* Skip button */}
      <div className="absolute top-8 right-6 z-20">
        <button
          onClick={handleSkip}
          className="text-white/60 hover:text-white font-medium text-sm transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="flex-1 flex flex-col"
          >
            {/* Image Section */}
            <div className="relative h-[45vh] overflow-hidden">
              {/* Gradient overlays */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0B101B] z-10" />
              
              <motion.img
                src={slide.image}
                alt={slide.title}
                className="w-full h-full object-cover"
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.6 }}
              />
            </div>

            {/* Text Content */}
            <div className="flex-1 px-6 pt-8 pb-6 flex flex-col">
              <div className="flex-1">
                <motion.h1
                  className="text-3xl font-black text-white mb-3 leading-tight"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  {slide.title}
                </motion.h1>

                <motion.p
                  className="text-lg text-blue-400 font-semibold mb-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  {slide.subtitle}
                </motion.p>

                <motion.p
                  className="text-white/70 text-base mb-6 leading-relaxed"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  {slide.description}
                </motion.p>

                {/* Features */}
                <motion.div
                  className="space-y-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  {slide.features.map((feature, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10"
                    >
                      <div className="text-2xl">{feature.icon}</div>
                      <span className="text-white font-medium">{feature.text}</span>
                    </div>
                  ))}
                </motion.div>
              </div>

              {/* Pagination dots */}
              <div className="flex justify-center gap-2 mt-8 mb-6">
                {slides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`h-2 rounded-full transition-all ${
                      index === currentSlide
                        ? 'w-8 bg-blue-500'
                        : 'w-2 bg-white/30'
                    }`}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom CTA */}
      <div className="p-6 pb-10">
        <motion.button
          onClick={handleNext}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-blue-500/20 active:scale-98 transition-all"
          whileTap={{ scale: 0.98 }}
        >
          {currentSlide === slides.length - 1 ? 'Connect Apple Health' : 'Continue'}
        </motion.button>
      </div>
    </div>
  );
}
