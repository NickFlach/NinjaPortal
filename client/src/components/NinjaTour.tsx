import { motion, useAnimation, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { useIntl } from "react-intl";

interface TourStep {
  message: string;
  messageId: string;
}

export function NinjaTour() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const controls = useAnimation();
  const { isPlaying, currentSong, audioContext, audioAnalyser } = useMusicPlayer();
  const intl = useIntl();
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

  // Beat detection
  useEffect(() => {
    if (isPlaying && audioAnalyser) {
      const dataArray = new Uint8Array(audioAnalyser.frequencyBinCount);

      const analyzeBeat = () => {
        audioAnalyser.getByteFrequencyData(dataArray);
        setFreqData(dataArray);
        animationFrameRef.current = requestAnimationFrame(analyzeBeat);
      };

      analyzeBeat();

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    } else {
      setFreqData(null);
    }
  }, [isPlaying, audioAnalyser]);

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

  return (
    <AnimatePresence>
      {/* Position the ninja at the top of the page */}
      <motion.div
        className="fixed top-20 left-0 right-0 z-50 pointer-events-none"
        style={{
          height: 'auto', // Allow content to determine height
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
            {/* Ninja Head */}
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

            {/* Ninja Body */}
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

            {/* Left Leg */}
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

            {/* Right Leg */}
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

            {/* Left Arm */}
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

            {/* Right Arm */}
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

            {/* Katana */}
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
            <p className="text-sm">
              {intl.formatMessage({ id: tourSteps[currentStep].messageId })}
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