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

  // Upload states
  'app.upload.started': 'Upload Started',
  'app.upload.progress': 'Uploading your song to IPFS...',
  'app.upload.success': 'Song uploaded successfully!',
  'app.upload.error': 'Upload Failed',

  // Network setup
  'app.network.setup': 'Network Setup',
  'app.network.configuring': 'Configuring NEO X network...',
  'app.network.opera': 'Please approve the network setup in Opera Wallet...',
  'app.network.warning': 'Network Warning',
  'app.network.switch': 'Please approve the network switch in Opera Wallet',
  'app.network.connect': 'Please make sure you\'re connected to the NEO X network',
  'app.network.install': 'Please install a Web3 wallet to continue',

  // Song related
  'song.loved': 'Loved',
  'song.unloved': 'Unloved',
  'song.loved.message': 'Song added to your loves',
  'song.unloved.message': 'Song removed from your loves',
  'song.love.error': 'Error',
  'song.edit.details': 'Edit Details',
  'song.delete.library': 'Delete from Library',
  'song.delete.confirm': 'Are you sure you want to delete this song?',
  'song.delete.success': 'Success',
  'song.delete.success.message': 'Song deleted from library',
  'song.delete.error': 'Error',

  // Playlist related
  'playlist.create.first': 'Create a playlist first',
  'playlist.add.to': 'Add to {name}',
  'playlist.add.success': 'Success',
  'playlist.add.song.success': 'Song added to playlist',
  'playlist.add.error': 'Error',

  // NFT related
  'nft.mint': 'Mint as NFT',
  'nft.mint.confirm': 'Minting an NFT costs 1 GAS. Continue?',
  'nft.mint.success': 'Success',
  'nft.mint.success.message': 'NFT minting initiated. Please wait for the transaction to be mined.',
  'nft.mint.error': 'Error',
  'nft.mint.error.contract': 'Contract write not ready',
  'nft.mint.error.wallet': 'Wallet not connected',
  'nft.mint.error.generic': 'Failed to mint NFT',

  // Navigation
  'nav.map': 'Map',
  'nav.analytics': 'Analytics',
  'nav.whitepaper': 'Whitepaper',
  'nav.dimensions': 'Dimension Control',

  // Map messages
  'map.title': 'Global Listener Map',
  'map.noActivity': 'No Activity',
  'map.noData': 'No listener data available yet. Play some music to see activity on the map!',
  'map.totalListeners': '{count} Active Listeners Worldwide',
  'map.error': 'Error loading map data: {error}',
  'map.location.error.title': 'Location Access',
  'map.location.error.description': 'Unable to access your location. You can still use the map, but your plays won\'t be geotagged.',

  // Tour messages
  'tour.welcome': 'Welcome to Ninja-Portal! I\'ll be your guide.',
  'tour.connect': 'Connect your wallet to start exploring music.',
  'tour.upload': 'Upload your favorite tunes and share them with the world!',
  'tour.gotIt': 'Got it!',

  // Wallet disconnect messages
  'app.disconnect.success': 'Wallet disconnected successfully!',
  'app.disconnect.error': 'Failed to disconnect wallet',

  // Community feedback translations
  'community.feedback': 'Community Feedback',
  'community.feedback.feature': 'Feature Request',
  'community.feedback.bug': 'Bug Report',
  'community.feedback.improvement': 'Improvement',
  'community.feedback.placeholder': 'Share your thoughts, ideas, or suggestions...',
  'community.feedback.submit': 'Submit Feedback',
  'community.insights': 'Community Insights',
  'community.actionable': 'Actionable',
  'ninja.suggestions': 'Suggested Actions',

  // Import whitepaper translations
  ...whitepaper
} as const;

export default translations;