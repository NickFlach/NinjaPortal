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

  // Upload states
  'app.upload.started': 'Upload Started',
  'app.upload.progress': 'Uploading your song to IPFS...',
  'app.upload.success': 'Song uploaded successfully!',

  // Network setup
  'app.network.setup': 'Network Setup',
  'app.network.configuring': 'Configuring NEO X network...',
  'app.network.opera': 'Please approve the network setup in Opera Wallet...',
  'app.network.warning': 'Network Warning',
  'app.network.switch': 'Please approve the network switch in Opera Wallet',
  'app.network.connect': 'Please make sure you\'re connected to the NEO X network',

  // Dimensional physics
  'physics.dimension.current': 'Current Dimension: {dimension}',
  'physics.dimension.sync': 'Dimensional Sync Status: {status}',
  'physics.quantum.state': 'Quantum State: {state}',
  'physics.entropy.level': 'System Entropy: {level}',
  'physics.cascade.inner': 'Inner Loop Stability: {stability}%',
  'physics.cascade.outer': 'Outer Loop Coherence: {coherence}%',

  // System states
  'system.cascade.title': 'Cascade Control System',
  'system.cascade.sync': 'Synchronization Status',
  'system.cascade.entropy': 'Entropy Management',
  'system.cascade.quantum': 'Quantum Resilience',
  'system.cascade.dimension': 'Dimensional Stability',

  // Sync messages
  'sync.status.stable': 'Dimensional stability achieved',
  'sync.status.unstable': 'Dimensional drift detected',
  'sync.status.critical': 'Critical phase misalignment',
  'sync.action.stabilize': 'Initiating phase stabilization',
  'sync.action.realign': 'Realigning quantum matrices',

  // Storage messages
  'storage.title': 'Neo FS Storage',
  'storage.upload': 'Upload to Neo FS',
  'storage.uploading': 'Uploading...',
  'storage.noFiles': 'No files stored in Neo FS yet',
  'storage.success': 'File uploaded successfully to Neo FS',
  'storage.error': 'Failed to upload file',
  'storage.download.error': 'Failed to download file',

  // Navigation
  'nav.map': 'Map',
  'nav.analytics': 'Analytics',
  'nav.whitepaper': 'Whitepaper',
  'nav.dimensions': 'Dimension Control',

  // Cascade Control System specific translations
  'cascade.control.title': 'Cascade Control System',
  'cascade.control.description': 'Advanced quantum-aware music synchronization',
  'cascade.inner.loop': 'Inner Loop (Entropy Control)',
  'cascade.outer.loop': 'Outer Loop (Free Energy Control)',
  'cascade.quantum.state': 'Quantum State Verification',
  'cascade.dimension.sync': 'Dimensional Synchronization',

  // Status messages
  'status.syncing': 'Synchronizing dimensional states...',
  'status.ready': 'All systems nominal',
  'status.error': 'Dimensional integrity compromised',
  'status.recovering': 'Initiating quantum recovery sequence',

  // Tour messages
  'tour.welcome': 'Welcome to Ninja-Portal! I\'ll be your guide.',
  'tour.connect': 'Connect your wallet to start exploring music.',
  'tour.upload': 'Upload your favorite tunes and share them with the world!',
  'tour.gotIt': 'Got it!',

  // Map messages
  'map.title': 'Global Listener Map',
  'map.noActivity': 'No Activity',
  'map.noData': 'No listener data available yet. Play some music to see activity on the map!',
  'map.totalListeners': '{count} Active Listeners Worldwide',
  'map.error': 'Error loading map data: {error}',
  'map.tooltipDetail': '{country}: {total} {total, plural, one {Listener} other {Listeners}} ({percentage}%) - {geotagged} geotagged, {anonymous} anonymous',

  // Map location messages
  'map.location.error.title': 'Location Access',
  'map.location.error.description': 'Unable to access your location. You can still use the map, but your plays won\'t be geotagged.',

  // Wallet disconnect messages
  'app.disconnect.success': 'Wallet disconnected successfully!',
  'app.disconnect.error': 'Failed to disconnect wallet',

  // Import whitepaper translations
  ...whitepaper
} as const;

export default translations;