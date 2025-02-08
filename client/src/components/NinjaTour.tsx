import { motion, useAnimation, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { useIntl } from "react-intl";

const NinjaSVG = ({ beatIntensity = 0 }) => {
  // Scale factor based on beat intensity (0-1)
  const scale = 1 + (beatIntensity * 0.2);

  return (
    <motion.svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-primary"
    >
      {/* Ninja Body with beat-reactive scaling */}
      <motion.path
        d="M60 95c16.569 0 30-13.431 30-30S76.569 35 60 35 30 48.431 30 65s13.431 30 30 30z"
        fill="currentColor"
        initial={{ scale: 0 }}
        animate={{ 
          scale: scale,
          rotate: beatIntensity > 0.5 ? [-5, 5] : 0
        }}
        transition={{ 
          type: "spring",
          stiffness: 260 + (beatIntensity * 100),
          damping: 20
        }}
      />

      {/* Ninja Headband with beat-reactive movement */}
      <motion.path
        d="M35 55c0 0 10-5 25-5s25 5 25 5"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        animate={{ 
          y: beatIntensity > 0.3 ? [-2, 2] : 0,
          pathLength: [0.8, 1]
        }}
        transition={{ 
          duration: 0.2,
          repeat: Infinity,
          repeatType: "reverse"
        }}
      />

      {/* Ninja Belt with beat-reactive wave */}
      <motion.path
        d="M40 75h40"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        animate={{ 
          pathLength: [0.9, 1],
          y: beatIntensity > 0.4 ? [-1, 1] : 0
        }}
        transition={{ 
          duration: 0.15,
          repeat: Infinity,
          repeatType: "reverse"
        }}
      />

      {/* Ninja Eyes with beat-reactive blinking */}
      <motion.g>
        {[
          { cx: 50, cy: 60 },
          { cx: 70, cy: 60 }
        ].map((eye, i) => (
          <motion.circle
            key={i}
            {...eye}
            r="4"
            fill="white"
            animate={{ 
              scale: beatIntensity > 0.7 ? [1, 1.2, 1] : 1,
              opacity: beatIntensity > 0.8 ? [1, 0.5, 1] : 1
            }}
            transition={{ 
              duration: 0.2,
              repeat: Infinity,
              repeatType: "reverse"
            }}
          />
        ))}
      </motion.g>

      {/* Ninja Stars with beat-reactive spinning */}
      <motion.g>
        {[
          { x: 85, rotation: 180 },
          { x: 25, rotation: -180 }
        ].map((star, i) => (
          <motion.path
            key={i}
            d={`M${star.x} 45l5-5 5 5-5 5z`}
            fill="white"
            animate={{ 
              rotate: beatIntensity > 0.6 
                ? [0, star.rotation]
                : star.rotation / 2,
              scale: beatIntensity > 0.5 ? [0.8, 1.2] : 1
            }}
            transition={{ 
              duration: 0.3,
              repeat: Infinity,
              repeatType: "reverse"
            }}
          />
        ))}
      </motion.g>
    </motion.svg>
  );
};

interface TourStep {
  message: string;
  position: { x: number; y: number };
  messageId: string;
}

export function NinjaTour() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const controls = useAnimation();
  const { isPlaying, currentSong, audioContext, audioAnalyser } = useMusicPlayer();
  const intl = useIntl();
  const animationFrameRef = useRef(0);
  const [beatIntensity, setBeatIntensity] = useState(0);

  const tourSteps: TourStep[] = [
    {
      message: "Welcome to Ninja-Portal! I'll be your guide.",
      position: { x: 50, y: 50 },
      messageId: "tour.welcome"
    },
    {
      message: "Connect your wallet to start exploring music.",
      position: { x: 80, y: 20 },
      messageId: "tour.connect"
    },
    {
      message: "Upload your favorite tunes and share them with the world!",
      position: { x: 60, y: 70 },
      messageId: "tour.upload"
    }
  ];

  // Beat detection and animation
  useEffect(() => {
    if (isPlaying && audioAnalyser) {
      const dataArray = new Uint8Array(audioAnalyser.frequencyBinCount);

      const analyzeBeat = () => {
        audioAnalyser.getByteFrequencyData(dataArray);

        // Calculate average intensity from lower frequencies (bass)
        const bassRange = dataArray.slice(0, 10);
        const averageIntensity = bassRange.reduce((acc, val) => acc + val, 0) / bassRange.length;

        // Normalize to 0-1 range and add some randomness
        const normalizedIntensity = (averageIntensity / 255) * 
          (0.8 + Math.random() * 0.4); // Random factor between 0.8-1.2

        setBeatIntensity(normalizedIntensity);

        // Random position jitter based on beat intensity
        if (normalizedIntensity > 0.6) {
          controls.start({
            x: Math.random() * 10 - 5,
            y: Math.random() * 10 - 5,
            transition: { duration: 0.1 }
          });
        }

        animationFrameRef.current = requestAnimationFrame(analyzeBeat);
      };

      analyzeBeat();

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [isPlaying, audioAnalyser, controls]);

  // Auto-advance tour steps
  useEffect(() => {
    if (currentStep < tourSteps.length - 1) {
      const timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  if (!isVisible) return null;

  const currentTourStep = tourSteps[currentStep];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed z-50 pointer-events-none"
        animate={controls}
        style={{
          left: `${currentTourStep.position.x}%`,
          top: `${currentTourStep.position.y}%`,
        }}
      >
        <motion.div
          className="relative"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
        >
          <NinjaSVG beatIntensity={beatIntensity} />
          <motion.div
            className="absolute left-full ml-4 bg-background/95 backdrop-blur-sm p-4 rounded-lg shadow-lg pointer-events-auto"
            style={{ width: "max-content", maxWidth: "300px" }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-sm">
              {intl.formatMessage({ id: currentTourStep.messageId })}
            </p>
            {currentStep === tourSteps.length - 1 && (
              <motion.button
                className="mt-2 text-xs text-primary hover:text-primary/80"
                onClick={() => setIsVisible(false)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {intl.formatMessage({ id: 'tour.gotIt' })}
              </motion.button>
            )}
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}