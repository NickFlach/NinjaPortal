// English translations
import whitepaper from './whitepaper';

const translations = {
  // Basic app translations
  'app.title': 'Ninja-Portal',
  'app.connect': 'Connect Wallet',
  'app.disconnect': 'Disconnect',
  'app.library': 'Your Library',
  'app.discovery': 'Discovery Feed',
  'app.upload': 'Upload Song',
  'app.songs': 'songs',
  'app.recent': 'Latest plays from the community',
  'app.noSongs': 'No songs in your library yet',
  'app.noRecentSongs': 'No songs played yet',
  'app.loading': 'Loading your library...',

  // Welcome messages
  'app.welcome.back': 'Welcome back!',
  'app.welcome.opera': 'Welcome back to Opera Wallet!',
  'app.welcome.new': 'Wallet connected successfully!',

  // Error messages
  'app.errors.wallet': 'Please connect your wallet to play songs',
  'app.errors.upload': 'Please select a file to upload',
  'app.errors.filetype': 'Please select an MP3 file. Other audio formats are not supported.',
  'app.errors.dimension': 'Dimensional sync error. Please reconnect to the current timestream.',
  'app.errors.quantum': 'Quantum state verification failed. Retrying with fallback encryption.',
  'app.errors.play': 'Failed to play song. Please try again.',

  // Network setup
  'app.network.setup': 'Network Setup',
  'app.network.configuring': 'Configuring NEO X network...',
  'app.network.opera': 'Please approve the network setup in Opera Wallet...',
  'app.network.warning': 'Network Warning',
  'app.network.switch': 'Please approve the network switch in Opera Wallet',
  'app.network.connect': 'Please make sure you\'re connected to the NEO X network',
  'app.network.install': 'Please install a Web3 wallet to continue',

  // Experience and interaction translations
  'experience.sound': 'Sound',
  'experience.visual': 'Visual',
  'experience.flow': 'Flow',
  'experience.community': 'Community Insights',

  // Storage related translations
  'storage.title': 'Neo FS Storage',
  'storage.upload': 'Upload to Neo FS',
  'storage.uploading': 'Uploading...',
  'storage.noFiles': 'No files in Neo FS yet',
  'storage.success': 'File uploaded to Neo FS successfully',
  'storage.error': 'Failed to upload file',
  'storage.download.error': 'Failed to download file',

  // Navigation
  'nav.map': 'Map',
  'nav.analytics': 'Analytics',
  'nav.whitepaper': 'Whitepaper',

  // Tour and dimensional translations
  'tour.welcome': 'Welcome to Ninja-Portal! I\'ll be your guide.',
  'tour.connect': 'Connect your wallet to start exploring music.',
  'tour.upload': 'Upload your favorite tunes and share them with the world!',
  'tour.gotIt': 'Got it!',
  'tour.dimensional.intro': 'Welcome to the dimensional music experience',
  'tour.dimensional.sync': 'Synchronizing with the quantum timestream...',
  'tour.dimensional.ready': 'Dimensional alignment complete',
  'tour.dimensional.error': 'Dimensional sync lost, realigning...',
  'tour.dimensional.guide': 'Your guide through the musical dimensions',

  // Dimensional states
  'dimensional.state.coherent': 'Quantum state coherent',
  'dimensional.state.decoherent': 'Quantum state decoherent',
  'dimensional.state.superposed': 'Quantum state superposed',
  'dimensional.state.aligned': 'Dimensional alignment achieved',
  'dimensional.state.sync': 'Syncing dimensional coordinates',

  // Import whitepaper translations
  ...whitepaper
} as const;

export default translations;