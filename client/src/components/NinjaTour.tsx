import { motion, useAnimation, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { useIntl } from "react-intl";

const NinjaSVG = () => (
  <motion.svg
    width="120"
    height="120"
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-primary"
  >
    {/* Ninja Body */}
    <motion.path
      d="M60 95c16.569 0 30-13.431 30-30S76.569 35 60 35 30 48.431 30 65s13.431 30 30 30z"
      fill="currentColor"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
    />

    {/* Ninja Headband */}
    <motion.path
      d="M35 55c0 0 10-5 25-5s25 5 25 5"
      stroke="white"
      strokeWidth="4"
      strokeLinecap="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 1 }}
    />

    {/* Ninja Belt */}
    <motion.path
      d="M40 75h40"
      stroke="white"
      strokeWidth="4"
      strokeLinecap="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 1, delay: 0.5 }}
    />

    {/* Ninja Eyes */}
    <motion.g>
      <motion.circle
        cx="50"
        cy="60"
        r="4"
        fill="white"
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.2, 1] }}
        transition={{ delay: 0.5, duration: 0.3 }}
      />
      <motion.circle
        cx="70"
        cy="60"
        r="4"
        fill="white"
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.2, 1] }}
        transition={{ delay: 0.5, duration: 0.3 }}
      />
    </motion.g>

    {/* Ninja Stars (Decoration) */}
    <motion.g>
      <motion.path
        d="M85 45l5-5 5 5-5 5z"
        fill="white"
        initial={{ rotate: 0, scale: 0 }}
        animate={{ rotate: 180, scale: 1 }}
        transition={{ duration: 1, delay: 0.8 }}
      />
      <motion.path
        d="M25 45l5-5 5 5-5 5z"
        fill="white"
        initial={{ rotate: 0, scale: 0 }}
        animate={{ rotate: -180, scale: 1 }}
        transition={{ duration: 1, delay: 0.8 }}
      />
    </motion.g>
  </motion.svg>
);

interface TourStep {
  message: string;
  position: { x: number; y: number };
  messageId: string;
}

export function NinjaTour() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const controls = useAnimation();
  const { isPlaying, currentSong } = useMusicPlayer();
  const intl = useIntl();

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

  // Dancing animation sequence synchronized with music
  useEffect(() => {
    if (isPlaying) {
      controls.start({
        y: [0, -20, 0],
        rotate: [0, -15, 15, -15, 0],
        scale: [1, 1.1, 1],
        transition: {
          y: {
            duration: 0.5,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut"
          },
          rotate: {
            duration: 1,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut"
          },
          scale: {
            duration: 0.5,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut"
          }
        }
      });
    } else {
      controls.stop();
      controls.set({ y: 0, rotate: 0, scale: 1 });
    }
  }, [isPlaying, controls]);

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
          <NinjaSVG />
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