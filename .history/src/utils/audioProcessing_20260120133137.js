// Audio processing utilities

// Convert AudioBuffer to WAV Blob (16kHz mono)
const audioBufferToWav = (audioBuffer) => {
  const numChannels = 1
  const sampleRate = 16000
  const format = 1
  const bitDepth = 16
  
  // Resample to 16kHz mono
  const length = Math.ceil(audioBuffer.duration * sampleRate)
  const result = new Float32Array(length)
  const originalSampleRate = audioBuffer.sampleRate
  
  for (let i = 0; i < length; i++) {
    const originalIndex = Math.floor(i * originalSampleRate / sampleRate)
    let sum = 0
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      sum += audioBuffer.getChannelData(channel)[originalIndex] || 0
    }
    result[i] = sum / audioBuffer.numberOfChannels
  }
  
  // Create WAV file
  const buffer = new ArrayBuffer(44 + result.length * 2)
  const view = new DataView(buffer)
  
  // WAV header
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }
  
  writeString(0, 'RIFF')
  view.setUint32(4, 36 + result.length * 2, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, format, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * numChannels * bitDepth / 8, true)
  view.setUint16(32, numChannels * bitDepth / 8, true)
  view.setUint16(34, bitDepth, true)
  writeString(36, 'data')
  view.setUint32(40, result.length * 2, true)
  
  // Write audio data
  let offset = 44
  for (let i = 0; i < result.length; i++) {
    const sample = Math.max(-1, Math.min(1, result[i]))
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true)
    offset += 2
  }
  
  return new Blob([buffer], { type: 'audio/wav' })
}

// Extract audio from base64 video and convert to base64 WAV
export const extractAudioFromVideo = async (videoBase64) => {
  try {
    const response = await fetch(videoBase64)
    const videoBlob = await response.blob()
    
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const arrayBuffer = await videoBlob.arrayBuffer()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    
    const wavBlob = audioBufferToWav(audioBuffer)
    
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.readAsDataURL(wavBlob)
    })
  } catch (err) {
    console.error('Audio extraction error:', err)
    return null
  }
}

