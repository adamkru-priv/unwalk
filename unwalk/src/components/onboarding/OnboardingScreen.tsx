import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChallengeStore } from '../../stores/useChallengeStore';

const slides = [
  {
    title: 'Your steps unlock hidden images',
    subtitle: 'Turn walking into a visual journey',
    emoji: '🎯',
  },
  {
    title: 'Walk at your own pace',
    subtitle: '5k, 10k, or 30k steps - you choose the challenge',
    emoji: '🚶',
  },
  {
    title: 'Connect your steps',
    subtitle: 'We read from Apple Health - your data stays private',
    emoji: '❤️',
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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col">
      {/* Skip button */}
      <div className="absolute top-8 right-6 z-10">
        <button
          onClick={handleSkip}
          className="text-gray-500 hover:text-gray-700 font-medium"
        >
          Skip
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="text-center max-w-md"
          >
            {/* Emoji visual */}
            <motion.div
              className="text-8xl mb-8"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {slide.emoji}
            </motion.div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-gray-900 mb-4 leading-tight">
              {slide.title}
            </h1>

            {/* Subtitle */}
            <p className="text-lg text-gray-600 mb-8">
              {slide.subtitle}
            </p>

            {/* Pagination dots */}
            <div className="flex justify-center gap-2 mb-8">
              {slides.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all ${
                    index === currentSlide
                      ? 'w-8 bg-primary-600'
                      : 'w-2 bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom CTA */}
      <div className="p-6 pb-10">
        <button
          onClick={handleNext}
          className="w-full bg-primary-600 text-white py-4 rounded-xl font-semibold text-lg shadow-lg hover:bg-primary-500 active:scale-98 transition-all"
        >
          {currentSlide === slides.length - 1 ? 'Connect Apple Health' : 'Next'}
        </button>
      </div>
    </div>
  );
}
