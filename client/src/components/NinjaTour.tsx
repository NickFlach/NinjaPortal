import { motion, useAnimation, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { useIntl } from "react-intl";
import { type MusicMood, detectMood } from "@/lib/moodDetection";
import { analyzeMoodWithAI } from "@/lib/moodAnalysis";

interface TourStep {
  message: string;
  messageId: string;
  featureDescription?: string;
}

interface MoodPersonality {
  greeting: string;
  tone: string;
  animation: {
    scale: number;
    rotate: number;
    speed: number;
  };
}

const moodPersonalities: Record<MusicMood, MoodPersonality> = {
  energetic: {
    greeting: "YOOOO! Let's rock this music platform! 🎵",
    tone: "hyped",
    animation: { scale: 1.2, rotate: 20, speed: 1.5 }
  },
  calm: {
    greeting: "Welcome to our peaceful music sanctuary...",
    tone: "zen",
    animation: { scale: 1, rotate: 5, speed: 0.8 }
  },
  happy: {
    greeting: "Hey there! Ready to discover some awesome tunes?",
    tone: "cheerful",
    animation: { scale: 1.1, rotate: 10, speed: 1.2 }
  },
  melancholic: {
    greeting: "Ah, another soul seeking musical solace...",
    tone: "reflective",
    animation: { scale: 0.95, rotate: 3, speed: 0.7 }
  },
  mysterious: {
    greeting: "Psst... want to discover some hidden musical gems?",
    tone: "intriguing",
    animation: { scale: 1.05, rotate: 15, speed: 1 }
  },
  romantic: {
    greeting: "Welcome to a world of musical enchantment~",
    tone: "dreamy",
    animation: { scale: 1.1, rotate: 8, speed: 0.9 }
  }
};

const getFeatureDescription = (currentMood: MusicMood) => {
  const descriptions = {
    energetic: [
      "Check out the global music map - it's exploding with activity! 🗺️",
      "Upload your tracks and watch them spread worldwide! 🌍",
      "Connect your wallet to join the music revolution! 💫"
    ],
    calm: [
      "Browse our carefully curated music library... 📚",
      "Experience seamless IPFS integration for reliable storage...",
      "Enjoy crystal-clear audio streaming..."
    ],
    happy: [
      "Share your favorite tracks with the community! 🎵",
      "Watch real-time reactions to your music! 🎉",
      "Discover trending artists in your area! 🌟"
    ],
    melancholic: [
      "Find kindred spirits through shared playlists...",
      "Explore emotional music landscapes...",
      "Connect through the universal language of music..."
    ],
    mysterious: [
      "Uncover hidden musical gems in the discovery feed...",
      "Decode the secrets of our recommendation algorithm...",
      "Explore the depths of our music archive..."
    ],
    romantic: [
      "Create your perfect musical atmosphere~ ✨",
      "Share the magic of music with others~ 🎵",
      "Discover songs that touch your heart~ 💖"
    ]
  };

  return descriptions[currentMood];
};

export function NinjaTour() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const controls = useAnimation();
  const { isPlaying, currentSong, audioAnalyser } = useMusicPlayer();
  const intl = useIntl();
  const animationFrameRef = useRef(0);
  const [freqData, setFreqData] = useState<Uint8Array | null>(null);
  const [currentMood, setCurrentMood] = useState<MusicMood>("mysterious");
  const [descriptions, setDescriptions] = useState<string[]>([]);

  // Update mood and descriptions when song changes
  useEffect(() => {
    async function updateMood() {
      if (currentSong) {
        try {
          if (import.meta.env.VITE_OPENAI_API_KEY) {
            const mood = await analyzeMoodWithAI(currentSong);
            if (mood) setCurrentMood(mood as MusicMood);
          } else {
            const mood = detectMood(currentSong);
            setCurrentMood(mood);
          }
        } catch (error) {
          console.error('Error analyzing mood:', error);
          const mood = detectMood(currentSong);
          setCurrentMood(mood);
        }
      }
    }

    updateMood();
  }, [currentSong]);

  // Update descriptions when mood changes
  useEffect(() => {
    setDescriptions(getFeatureDescription(currentMood));
  }, [currentMood]);

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

  // Auto-advance descriptions
  useEffect(() => {
    if (descriptions.length > 0) {
      const timer = setInterval(() => {
        setCurrentStep(prev => (prev + 1) % descriptions.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [descriptions]);

  if (!isVisible) return null;

  const personality = moodPersonalities[currentMood];
  const baseAnimationSpeed = personality.animation.speed;

  return (
    <AnimatePresence>
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          top: '64px',
          height: '30vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <motion.div
          className="relative"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: 1, 
            scale: personality.animation.scale,
            transition: { duration: 1 / baseAnimationSpeed }
          }}
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
                scale: 1 + ((freqData[30] || 0) / 255) * 0.1 * personality.animation.scale,
                rotate: ((freqData[31] || 0) / 255) * personality.animation.rotate
              } : {
                scale: 1,
                rotate: 0
              }}
              transition={{ type: "tween", duration: 0.1 / baseAnimationSpeed }}
            />

            {/* Ninja Body */}
            <motion.path
              d="M52 34v36c0 4.4 3.6 8 8 8s8-3.6 8-8V34H52z"
              fill="currentColor"
              animate={freqData ? {
                scaleY: 1 + ((freqData[0] || 0) / 255) * 0.2 * personality.animation.scale,
                rotate: ((freqData[1] || 0) / 255) * personality.animation.rotate
              } : {
                scaleY: 1,
                rotate: 0
              }}
              transition={{ type: "tween", duration: 0.1 / baseAnimationSpeed }}
            />

            {/* Left Leg */}
            <motion.path
              d="M52 70l-3 20"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              animate={freqData ? {
                rotate: ((freqData[5] || 0) / 255) * 20 * personality.animation.scale,
                x: ((freqData[6] || 0) / 255) * 2 - 1
              } : {
                rotate: 0,
                x: 0
              }}
              style={{ transformOrigin: '52px 70px' }}
              transition={{ type: "tween", duration: 0.1 / baseAnimationSpeed }}
            />

            {/* Right Leg */}
            <motion.path
              d="M68 70l3 20"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              animate={freqData ? {
                rotate: ((freqData[7] || 0) / 255) * -20 * personality.animation.scale,
                x: ((freqData[8] || 0) / 255) * -2 + 1
              } : {
                rotate: 0,
                x: 0
              }}
              style={{ transformOrigin: '68px 70px' }}
              transition={{ type: "tween", duration: 0.1 / baseAnimationSpeed }}
            />

            {/* Left Arm */}
            <motion.path
              d="M52 34c-4 0-8 4-8 12s4 12 8 12"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              animate={freqData ? {
                rotate: ((freqData[20] || 0) / 255) * 30 * personality.animation.scale,
                x: ((freqData[21] || 0) / 255) * 4 - 2
              } : {
                rotate: 0,
                x: 0
              }}
              style={{ transformOrigin: '52px 34px' }}
              transition={{ type: "tween", duration: 0.1 / baseAnimationSpeed }}
            />

            {/* Right Arm */}
            <motion.path
              d="M68 34c4 0 8 4 8 12s-4 12-8 12"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              animate={freqData ? {
                rotate: ((freqData[22] || 0) / 255) * -30 * personality.animation.scale,
                x: ((freqData[23] || 0) / 255) * -4 + 2
              } : {
                rotate: 0,
                x: 0
              }}
              style={{ transformOrigin: '68px 34px' }}
              transition={{ type: "tween", duration: 0.1 / baseAnimationSpeed }}
            />

            {/* Katana */}
            <motion.path
              d="M60 15v-10M60 5l2 3M60 5l-2 3"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              animate={freqData ? {
                rotate: ((freqData[50] || 0) / 255) * 20 * personality.animation.scale,
                scale: 1 + ((freqData[51] || 0) / 255) * 0.1
              } : {
                rotate: 0,
                scale: 1
              }}
              style={{ transformOrigin: '60px 15px' }}
              transition={{ type: "tween", duration: 0.1 / baseAnimationSpeed }}
            />
          </motion.svg>

          <motion.div
            className="absolute left-full ml-4 bg-background/95 backdrop-blur-sm p-4 rounded-lg shadow-lg pointer-events-auto"
            style={{ width: "max-content", maxWidth: "300px" }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-sm mb-2 font-medium">
              {isPlaying ? descriptions[currentStep] : personality.greeting}
            </p>
            {currentStep === descriptions.length - 1 && (
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