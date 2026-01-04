"""
Audio Extractor - Extract audio from video recordings
Converts base64 video data to audio file for analysis
"""

import base64
import os
import tempfile
from pathlib import Path
import subprocess


def extract_audio_from_base64_video(base64_video_data, output_audio_path, sample_rate=16000):
    """
    Extract audio from base64-encoded video data
    
    Args:
        base64_video_data: Base64 string of video (with or without data URI prefix)
        output_audio_path: Path to save extracted audio (WAV format)
        sample_rate: Target sample rate (default 16000 Hz for speech)
    
    Returns:
        dict with success status and audio info
    """
    try:
        # Remove data URI prefix if present
        if ',' in base64_video_data:
            base64_video_data = base64_video_data.split(',', 1)[1]
        
        # Decode base64 to binary
        video_binary = base64.b64decode(base64_video_data)
        
        # Create temporary video file
        with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as temp_video:
            temp_video.write(video_binary)
            temp_video_path = temp_video.name
        
        try:
            # Use ffmpeg to extract audio
            # ffmpeg must be installed on the system
            command = [
                'ffmpeg',
                '-i', temp_video_path,
                '-vn',  # No video
                '-acodec', 'pcm_s16le',  # PCM audio codec
                '-ar', str(sample_rate),  # Sample rate
                '-ac', '1',  # Mono
                '-y',  # Overwrite output
                output_audio_path
            ]
            
            result = subprocess.run(
                command,
                capture_output=True,
                text=True
            )
            
            if result.returncode != 0:
                return {
                    'success': False,
                    'error': f'ffmpeg error: {result.stderr}'
                }
            
            # Get audio info
            file_size = os.path.getsize(output_audio_path)
            
            return {
                'success': True,
                'audio_path': output_audio_path,
                'sample_rate': sample_rate,
                'file_size_bytes': file_size,
                'format': 'wav'
            }
            
        finally:
            # Clean up temporary video file
            if os.path.exists(temp_video_path):
                os.remove(temp_video_path)
    
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


def extract_audio_from_video_file(video_path, output_audio_path, sample_rate=16000):
    """
    Extract audio from video file
    
    Args:
        video_path: Path to input video file
        output_audio_path: Path to save extracted audio
        sample_rate: Target sample rate
    
    Returns:
        dict with success status and audio info
    """
    try:
        command = [
            'ffmpeg',
            '-i', video_path,
            '-vn',
            '-acodec', 'pcm_s16le',
            '-ar', str(sample_rate),
            '-ac', '1',
            '-y',
            output_audio_path
        ]
        
        result = subprocess.run(command, capture_output=True, text=True)
        
        if result.returncode != 0:
            return {
                'success': False,
                'error': f'ffmpeg error: {result.stderr}'
            }
        
        return {
            'success': True,
            'audio_path': output_audio_path,
            'sample_rate': sample_rate,
            'file_size_bytes': os.path.getsize(output_audio_path),
            'format': 'wav'
        }
    
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


if __name__ == '__main__':
    # Test example
    print("Audio Extractor Utility")
    print("This module extracts audio from video recordings")
    print("\nRequirement: ffmpeg must be installed on your system")
    print("Install: https://ffmpeg.org/download.html")
