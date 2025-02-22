// English translations
import whitepaper from './whitepaper';

const translations = {
  // Basic app translations - existing
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

  // Welcome messages - existing
  'app.welcome.back': 'Welcome back!',
  'app.welcome.opera': 'Welcome back to Opera Wallet!',
  'app.welcome.new': 'Wallet connected successfully!',

  // Error messages - existing
  'app.errors.wallet': 'Please connect your wallet to play songs',
  'app.errors.upload': 'Please select a file to upload',
  'app.errors.filetype': 'Please select an MP3 file. Other audio formats are not supported.',
  'app.errors.dimension': 'Dimensional sync error. Please reconnect to the current timestream.',
  'app.errors.quantum': 'Quantum state verification failed. Retrying with fallback encryption.',
  'app.errors.play': 'Failed to play song. Please try again.',

  // Network setup - existing
  'app.network.setup': 'Network Setup',
  'app.network.configuring': 'Configuring NEO X network...',
  'app.network.opera': 'Please approve the network setup in Opera Wallet...',
  'app.network.warning': 'Network Warning',
  'app.network.switch': 'Please approve the network switch in Opera Wallet',
  'app.network.connect': 'Please make sure you\'re connected to the NEO X network',
  'app.network.install': 'Please install a Web3 wallet to continue',

  // Experience and interaction translations - existing
  'experience.sound': 'Sound',
  'experience.visual': 'Visual',
  'experience.flow': 'Flow',
  'experience.community': 'Community Insights',

  // Storage related translations - existing
  'storage.title': 'Neo FS Storage',
  'storage.upload': 'Upload to Neo FS',
  'storage.uploading': 'Uploading...',
  'storage.noFiles': 'No files in Neo FS yet',
  'storage.success': 'File uploaded to Neo FS successfully',
  'storage.error': 'Failed to upload file',
  'storage.download.error': 'Failed to download file',

  // Navigation - existing and new
  'nav.map': 'Map',
  'nav.analytics': 'Analytics',
  'nav.whitepaper': 'Whitepaper',
  'nav.home': 'Home',
  'nav.treasury': 'Treasury',
  'nav.admin': 'Admin',
  'nav.lumira': 'Analytics',


  // Tour and dimensional translations - existing
  'tour.welcome': 'Welcome to Ninja-Portal! I\'ll be your guide.',
  'tour.connect': 'Connect your wallet to start exploring music.',
  'tour.upload': 'Upload your favorite tunes and share them with the world!',
  'tour.gotIt': 'Got it!',
  'tour.dimensional.intro': 'Welcome to the dimensional music experience',
  'tour.dimensional.sync': 'Synchronizing with the quantum timestream...',
  'tour.dimensional.ready': 'Dimensional alignment complete',
  'tour.dimensional.error': 'Dimensional sync lost, realigning...',
  'tour.dimensional.guide': 'Your guide through the musical dimensions',

  // Dimensional states - existing
  'dimensional.state.coherent': 'Quantum state coherent',
  'dimensional.state.decoherent': 'Quantum state decoherent',
  'dimensional.state.superposed': 'Quantum state superposed',
  'dimensional.state.aligned': 'Dimensional alignment achieved',
  'dimensional.state.sync': 'Syncing dimensional coordinates',

  // Treasury translations - new
  'treasury.title': 'Treasury Contract',
  'treasury.description': 'Smart contract that holds and distributes rewards',
  'treasury.balance.pfork': 'PFORK Balance',
  'treasury.balance.pfork.description': 'Available for reward distribution',
  'treasury.balance.gas': 'GAS Balance',
  'treasury.balance.gas.description': 'Collected from NFT minting',
  'treasury.management': 'Treasury Management',
  'treasury.current': 'Current Treasurer',
  'treasury.current.description': 'Address authorized to manage treasury operations',
  'treasury.new': 'New Treasurer Address',
  'treasury.transfer': 'Transfer Control',
  'treasury.confirm': 'Are you sure you want to transfer treasury control?',
  'treasury.distribution': 'PFORK Token Distribution',
  'treasury.rewards.title': 'One-time Rewards:',
  'treasury.rewards.upload': 'Upload a Song: 1 PFORK',
  'treasury.rewards.playlist': 'Create a Playlist: 2 PFORK',
  'treasury.rewards.nft': 'Mint Playlist NFT: 3 PFORK',
  'treasury.rewards.note': 'Note: These rewards are one-time only per wallet address.',

  // Player translations - new
  'player.radio.mode': 'Switch to radio',
  'player.radio.active': 'Currently in radio mode',
  'player.sync.enable': 'Enable sync',
  'player.sync.disable': 'Disable sync',
  'player.live': 'Live Radio',

  // Analytics translations - new
  'analytics.title': 'Privacy-Preserving Analytics',
  'analytics.time.1h': 'Last Hour',
  'analytics.time.6h': 'Last 6 Hours',
  'analytics.time.24h': 'Last 24 Hours',
  'analytics.time.7d': 'Last 7 Days',
  'analytics.time.30d': 'Last 30 Days',
  'analytics.select.range': 'Select time range',
  'analytics.no.data': 'No metrics available for the selected time range.',
  'analytics.privacy.note': 'Showing aggregated, privacy-preserving metrics with no individual data stored',

  // Error page translations - new
  'error.404.title': '404 Page Not Found',
  'error.404.message': 'Did you forget to add the page to the router?',
  'error.app': 'Something went wrong',
  'error.refresh': 'Please try refreshing the page',
  'error.button': 'Refresh Page',

  // Import whitepaper translations
  ...whitepaper
} as const;

export default translations;