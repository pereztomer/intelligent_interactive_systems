// Formatting utilities

// Format seconds to MM:SS
export const formatTime = (seconds) => {
  const roundedSeconds = Math.floor(seconds)
  const mins = Math.floor(roundedSeconds / 60)
  const secs = roundedSeconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// Format timestamp to locale string
export const formatDate = (timestamp) => {
  return new Date(timestamp).toLocaleString()
}

