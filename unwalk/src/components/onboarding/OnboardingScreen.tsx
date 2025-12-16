import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChallengeStore } from '../../stores/useChallengeStore';

const slides = [
  {
    title: 'Get Your Kids Moving',
    subtitle: 'Away from screens, into the world',
    description: 'Turn screen time into active adventures. Challenge your children to explore the outdoors and build healthy habits together.',
    image: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&q=80',
    features: [
      { icon: '🏃', text: 'Replace screen time with active time' },
      { icon: '🌳', text: 'Discover the outdoors together' },
      { icon: '💪', text: 'Build lifelong healthy habits' },
    ],
  },
  {
    title: 'Move at Your Own Pace',
    subtitle: 'Challenge yourself or friends & family',
    description: 'Solo walks or team adventures - you decide how to stay active',
    image: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&q=80',
    features: [
      { icon: '🎯', text: 'Personal challenges' },
      { icon: '👥', text: 'Family & friends' },
    ],
  },
  {
    title: 'Unlock Rewards & Badges',
    subtitle: 'Every step brings you closer',
    description: 'Reveal beautiful images, earn badges, and track your progress',
    image: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80',
    features: [
      { icon: '🖼️', text: 'Hidden images' },
      { icon: '🏆', text: 'Achievement badges' },
      { icon: '⭐', text: 'Earn points' },
    ],
  },
  {
    title: 'Connect Your Device',
    subtitle: 'Automatic step tracking',
    description: 'Sync with your fitness tracker or health app to count your steps automatically. Your data stays private and secure.',
    image: 'https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=800&q=80',
    features: [
      { icon: '📱', text: 'Auto sync steps' },
      { icon: '🔒', text: 'Private & secure' },
    ],
  },
];

export function OnboardingScreen() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  
  const setOnboardingComplete = useChallengeStore((s) => s.setOnboardingComplete);

  const handleSkip = () => {
    // Mark onboarding as complete and redirect to "Who to Challenge" screen
    setOnboardingComplete(true);
    useChallengeStore.setState({ currentScreen: 'whoToChallenge' });
  };

  // Touch handlers for swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    
    if (isLeftSwipe && currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
    if (isRightSwipe && currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const slide = slides[currentSlide];
  const isLastSlide = currentSlide === slides.length - 1;

  return (
    <div 
      className="min-h-screen bg-gradient-to-b from-[#0B101B] to-[#151A25] flex flex-col relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Skip button - Top Right */}
      <div className="absolute top-4 right-4 z-30">
        <button
          onClick={handleSkip}
          className="bg-gray-900/90 hover:bg-gray-900 backdrop-blur-lg text-white font-bold text-base px-7 py-3.5 rounded-full transition-all border-2 border-white/50 shadow-2xl"
        >
          Skip
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="flex-1 flex flex-col"
          >
            {/* Image Section - Smaller */}
            <div className="relative h-[35vh] overflow-hidden flex-shrink-0">
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

            {/* Text Content - Scrollable with safe padding */}
            <div className="flex-1 overflow-y-auto scrollbar-hide px-6 pt-6 pb-28">
              <motion.h1
                className="text-3xl font-black text-white mb-2 leading-tight"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                {slide.title}
              </motion.h1>

              <motion.p
                className="text-lg text-blue-400 font-semibold mb-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {slide.subtitle}
              </motion.p>

              <motion.p
                className="text-white/70 text-base mb-5 leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                {slide.description}
              </motion.p>

              {/* Features */}
              <motion.div
                className="space-y-3 mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
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

              {/* Swipe indicator - Show on all slides except last */}
              {!isLastSlide && (
                <div className="flex items-center justify-end gap-2 mb-6">
                  <div className="text-white/40 text-xs font-medium">Swipe</div>
                  <motion.div
                    animate={{ x: [0, 8, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                    className="flex items-center"
                  >
                    <svg className="w-6 h-6 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </motion.div>
                </div>
              )}

              {/* Get Started button on last slide - Beautiful gradient */}
              {isLastSlide && (
                <motion.button
                  onClick={handleSkip}
                  className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-purple-500/30 active:scale-98 transition-all mb-8 relative overflow-hidden group"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="relative z-10">Get Started</span>
                  {/* Animated shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                </motion.button>
              )}
            </div>

            {/* Pagination dots - Fixed at bottom */}
            <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-2 z-10">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === currentSlide
                      ? 'w-8 bg-blue-500'
                      : 'w-2 bg-white/30'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
