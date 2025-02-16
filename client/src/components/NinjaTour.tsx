import { motion, useAnimation, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { useIntl } from "react-intl";
import { useLocation } from "wouter";
import { useAccount } from "wagmi";

interface TourStep {
  message: string;
  messageId: string;
}

const wisdomQuotes = [
  "Music is the harmony of the universe made audible.",
  "The journey of a thousand songs begins with a single note.",
  "Music in the heart can be heard by the universe.",
  "Silence is a source of great strength, but music is the voice of the soul.",
  "In music, as in war, victory belongs to those who listen carefully.",
  "The supreme art of creation is to compose without conflict.",
  "Do nothing that is of no use - in music and in life.",
  "Like the way of the sword, the way of music requires dedication to master.",
  "I often think in music. I live my daydreams in music.",
  "If I were not a physicist, I would probably be a musician.",
  "Art and music are the windows to one's soul.",
  "Learn to listen as nature listens - in perfect harmony.",
  "Like a ninja in shadows, true music moves silently through hearts.",
  "As the bamboo bends with wind, let your rhythm flow with time.",
  "In silence, find rhythm. In rhythm, find wisdom.",
  "Let your heart be like a bamboo flute, hollow and ready to make music."
];

export function NinjaTour() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [currentQuote, setCurrentQuote] = useState(0);
  const controls = useAnimation();
  const { isPlaying, currentSong } = useMusicPlayer();
  const intl = useIntl();
  const { address } = useAccount();
  const [location] = useLocation();
  const animationFrameRef = useRef(0);
  const [freqData, setFreqData] = useState<Uint8Array | null>(null);

  const tourSteps: TourStep[] = [
    {
      message: "Welcome to Ninja-Portal! I'll be your guide.",
      messageId: "tour.welcome"
    },
    {
      message: "Connect your wallet to start exploring music.",
      messageId: "tour.connect"
    },
    {
      message: "Upload your favorite tunes and share them with the world!",
      messageId: "tour.upload"
    }
  ];

  // Check if we should show the tour
  useEffect(() => {
    const shouldShowTour = () => {
      // Only show on home page
      if (location !== '/') return false;

      // Check if user has dismissed the tour
      const tourDismissed = localStorage.getItem('ninja-tour-dismissed');
      const lastWalletAddress = localStorage.getItem('last-wallet-address');

      // Show tour if:
      // 1. Never dismissed before, or
      // 2. New wallet connection (different from last address)
      if (!tourDismissed || (address && lastWalletAddress !== address)) {
        // Update last wallet address
        if (address) {
          localStorage.setItem('last-wallet-address', address);
        }
        return true;
      }

      return false;
    };

    setIsVisible(shouldShowTour());
  }, [location, address]);

  // Auto-advance tour steps
  useEffect(() => {
    if (currentStep < tourSteps.length - 1) {
      const timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  // Rotate wisdom quotes
  useEffect(() => {
    const quoteInterval = setInterval(() => {
      setCurrentQuote(prev => (prev + 1) % wisdomQuotes.length);
    }, 8000); // Change quote every 8 seconds

    return () => clearInterval(quoteInterval);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('ninja-tour-dismissed', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed top-20 left-0 right-0 z-50 pointer-events-none"
        style={{
          height: 'auto',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingTop: '1rem',
        }}
      >
        <motion.div
          className="relative"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
        >
          <motion.svg
            width="120"
            height="120"
            viewBox="0 0 120 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-primary"
          >
            <motion.path
              d="M60 25c-6 0-11 4-11 9s5 9 11 9 11-4 11-9-5-9-11-9z"
              fill="currentColor"
              animate={freqData ? {
                scale: 1 + ((freqData[30] || 0) / 255) * 0.1,
                rotate: ((freqData[31] || 0) / 255) * 10 - 5
              } : {
                scale: 1,
                rotate: 0
              }}
              transition={{ type: "tween", duration: 0.1 }}
            />
            <motion.path
              d="M52 34v36c0 4.4 3.6 8 8 8s8-3.6 8-8V34H52z"
              fill="currentColor"
              animate={freqData ? {
                scaleY: 1 + ((freqData[0] || 0) / 255) * 0.2,
                rotate: ((freqData[1] || 0) / 255) * 10 - 5
              } : {
                scaleY: 1,
                rotate: 0
              }}
              transition={{ type: "tween", duration: 0.1 }}
            />
            <motion.path
              d="M52 70l-3 20"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              animate={freqData ? {
                rotate: ((freqData[5] || 0) / 255) * 20 - 10,
                x: ((freqData[6] || 0) / 255) * 2 - 1
              } : {
                rotate: 0,
                x: 0
              }}
              style={{ transformOrigin: '52px 70px' }}
              transition={{ type: "tween", duration: 0.1 }}
            />
            <motion.path
              d="M68 70l3 20"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              animate={freqData ? {
                rotate: ((freqData[7] || 0) / 255) * -20 + 10,
                x: ((freqData[8] || 0) / 255) * -2 + 1
              } : {
                rotate: 0,
                x: 0
              }}
              style={{ transformOrigin: '68px 70px' }}
              transition={{ type: "tween", duration: 0.1 }}
            />
            <motion.path
              d="M52 34c-4 0-8 4-8 12s4 12 8 12"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              animate={freqData ? {
                rotate: ((freqData[20] || 0) / 255) * 30 - 15,
                x: ((freqData[21] || 0) / 255) * 4 - 2
              } : {
                rotate: 0,
                x: 0
              }}
              style={{ transformOrigin: '52px 34px' }}
              transition={{ type: "tween", duration: 0.1 }}
            />
            <motion.path
              d="M68 34c4 0 8 4 8 12s-4 12-8 12"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              animate={freqData ? {
                rotate: ((freqData[22] || 0) / 255) * -30 + 15,
                x: ((freqData[23] || 0) / 255) * -4 + 2
              } : {
                rotate: 0,
                x: 0
              }}
              style={{ transformOrigin: '68px 34px' }}
              transition={{ type: "tween", duration: 0.1 }}
            />
            <motion.path
              d="M60 15v-10M60 5l2 3M60 5l-2 3"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              animate={freqData ? {
                rotate: ((freqData[50] || 0) / 255) * 20 - 10,
                scale: 1 + ((freqData[51] || 0) / 255) * 0.1
              } : {
                rotate: 0,
                scale: 1
              }}
              style={{ transformOrigin: '60px 15px' }}
              transition={{ type: "tween", duration: 0.1 }}
            />
          </motion.svg>

          <motion.div
            className="absolute left-full ml-4 bg-background/95 backdrop-blur-sm p-4 rounded-lg shadow-lg pointer-events-auto"
            style={{
              width: "max-content",
              maxWidth: "300px",
              top: "50%",
              transform: "translateY(-50%)"
            }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-sm mb-2">
              {intl.formatMessage({ id: tourSteps[currentStep].messageId })}
            </p>

            <motion.p
              className="text-xs italic text-muted-foreground mt-2 border-t border-border pt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              key={currentQuote}
              transition={{ duration: 0.5 }}
            >
              "{wisdomQuotes[currentQuote]}"
            </motion.p>

            {currentStep === tourSteps.length - 1 && (
              <motion.button
                className="mt-2 text-xs text-primary hover:text-primary/80"
                onClick={handleDismiss}
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