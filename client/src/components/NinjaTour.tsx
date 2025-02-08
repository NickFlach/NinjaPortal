import { motion, useAnimation, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { useIntl } from "react-intl";

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
  const [freqData, setFreqData] = useState<Uint8Array | null>(null);

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
          <motion.svg
            width="120"
            height="120"
            viewBox="0 0 120 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-primary"
          >
            {/* Ninja Head - reacts to mid-high frequencies */}
            <motion.path
              d="M60 35c-8.284 0-15 6.716-15 15 0 8.284 6.716 15 15 15s15-6.716 15-15c0-8.284-6.716-15-15-15z"
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

            {/* Ninja Body - reacts to bass frequencies */}
            <motion.path
              d="M45 65v20c0 8.284 6.716 15 15 15s15-6.716 15-15V65H45z"
              fill="currentColor"
              animate={freqData ? {
                scaleY: 1 + ((freqData[0] || 0) / 255) * 0.2,
                scaleX: 1 + ((freqData[1] || 0) / 255) * 0.1
              } : {
                scaleY: 1,
                scaleX: 1
              }}
              transition={{ type: "tween", duration: 0.1 }}
            />

            {/* Ninja Headband - reacts to mid frequencies */}
            <motion.path
              d="M40 45c0 0 10-5 20-5s20 5 20 5"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              animate={freqData ? {
                y: ((freqData[15] || 0) / 255) * 4 - 2,
                pathLength: 0.8 + ((freqData[16] || 0) / 255) * 0.2
              } : {
                y: 0,
                pathLength: 1
              }}
              transition={{ type: "tween", duration: 0.1 }}
            />

            {/* Ninja Arms - react to mid-high frequencies */}
            <motion.g>
              {/* Left Arm */}
              <motion.path
                d="M45 65c-5 0-10 5-10 15s5 15 10 15"
                stroke="currentColor"
                strokeWidth="6"
                strokeLinecap="round"
                animate={freqData ? {
                  rotate: ((freqData[20] || 0) / 255) * 30 - 15,
                  x: ((freqData[21] || 0) / 255) * 4 - 2
                } : {
                  rotate: 0,
                  x: 0
                }}
                transition={{ type: "tween", duration: 0.1 }}
              />
              {/* Right Arm */}
              <motion.path
                d="M75 65c5 0 10 5 10 15s-5 15-10 15"
                stroke="currentColor"
                strokeWidth="6"
                strokeLinecap="round"
                animate={freqData ? {
                  rotate: ((freqData[22] || 0) / 255) * -30 + 15,
                  x: ((freqData[23] || 0) / 255) * -4 + 2
                } : {
                  rotate: 0,
                  x: 0
                }}
                transition={{ type: "tween", duration: 0.1 }}
              />
            </motion.g>

            {/* Ninja Eyes - blink with high frequencies */}
            <motion.g>
              {[{ cx: 53, cy: 45 }, { cx: 67, cy: 45 }].map((eye, i) => (
                <motion.circle
                  key={i}
                  {...eye}
                  r="3"
                  fill="white"
                  animate={freqData ? {
                    scale: 1 + ((freqData[40 + i] || 0) / 255) * 0.3,
                    opacity: 0.7 + ((freqData[42 + i] || 0) / 255) * 0.3
                  } : {
                    scale: 1,
                    opacity: 1
                  }}
                  transition={{ type: "tween", duration: 0.1 }}
                />
              ))}
            </motion.g>

            {/* Ninja Weapons - spin with high frequencies */}
            <motion.g>
              {/* Katana */}
              <motion.path
                d="M85 35l15-15M87 33l10-10"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                animate={freqData ? {
                  rotate: ((freqData[50] || 0) / 255) * 45 - 22.5,
                  scale: 1 + ((freqData[51] || 0) / 255) * 0.2
                } : {
                  rotate: 0,
                  scale: 1
                }}
                style={{ transformOrigin: '85px 35px' }}
                transition={{ type: "tween", duration: 0.1 }}
              />
              {/* Shuriken */}
              <motion.path
                d="M20 35l5-5 5 5-5 5z"
                fill="white"
                animate={freqData ? {
                  rotate: 360 * ((freqData[55] || 0) / 255),
                  scale: 0.8 + ((freqData[56] || 0) / 255) * 0.4
                } : {
                  rotate: 0,
                  scale: 1
                }}
                style={{ transformOrigin: '25px 35px' }}
                transition={{ type: "tween", duration: 0.1 }}
              />
            </motion.g>
          </motion.svg>

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