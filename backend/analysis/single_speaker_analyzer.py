"""
Single-Speaker Presentation Analyzer
Analyzes solo presentations: speech activity, pacing, transcription
"""

import os
import json
import librosa
import soundfile as sf
import numpy as np
from pathlib import Path
import warnings
from datetime import timedelta

warnings.filterwarnings("ignore", category=UserWarning)


def convert_to_mono_wav(input_path, output_path, target_sr=16000):
    """
    Convert any audio file to mono WAV format
    
    Args:
        input_path: Input audio file
        output_path: Output WAV file path
        target_sr: Target sample rate (default 16000 Hz for speech)
    
    Returns:
        tuple: (audio array, sample rate, duration in seconds)
    """
    print(f"\n🎵 Converting to mono WAV...")
    print(f"  Input: {os.path.basename(input_path)}")
    
    audio, sr = librosa.load(input_path, sr=target_sr, mono=True)
    duration = len(audio) / sr
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    sf.write(output_path, audio, sr)
    
    print(f"  ✓ Converted to mono WAV")
    print(f"  ✓ Duration: {duration:.2f}s ({duration/60:.2f} minutes)")
    print(f"  ✓ Sample rate: {sr} Hz")
    
    return audio, sr, duration


def detect_speech_segments(audio, sr, frame_length=2048, hop_length=512, threshold=0.02):
    """
    Detect when speech is happening vs silence
    
    Args:
        audio: Audio signal
        sr: Sample rate
        frame_length: Frame size for analysis
        hop_length: Hop size between frames
        threshold: Energy threshold for speech detection
    
    Returns:
        list of (start_time, end_time) tuples for speech segments
    """
    print("\n🔍 Detecting speech segments...")
    
    # Calculate RMS energy
    rms = librosa.feature.rms(y=audio, frame_length=frame_length, hop_length=hop_length)[0]
    
    # Convert to time
    times = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=hop_length)
    
    # Detect speech (energy above threshold)
    is_speech = rms > threshold
    
    # Find continuous segments
    segments = []
    in_segment = False
    start_time = 0
    
    for i, speech in enumerate(is_speech):
        if speech and not in_segment:
            # Start of speech segment
            start_time = times[i]
            in_segment = True
        elif not speech and in_segment:
            # End of speech segment
            end_time = times[i]
            if end_time - start_time > 0.5:  # Minimum 0.5s segment
                segments.append((start_time, end_time))
            in_segment = False
    
    # Handle case where speech continues to end
    if in_segment:
        segments.append((start_time, times[-1]))
    
    print(f"  ✓ Detected {len(segments)} speech segments")
    
    return segments


def analyze_speaking_pace(segments, total_duration):
    """
    Analyze speaking pace and pauses
    
    Args:
        segments: List of (start, end) speech segments
        total_duration: Total audio duration
    
    Returns:
        dict with pacing metrics
    """
    print("\n📊 Analyzing speaking pace...")
    
    if not segments:
        return {
            'total_speaking_time': 0,
            'total_silence_time': total_duration,
            'speaking_percentage': 0,
            'num_segments': 0,
            'pauses': []
        }
    
    # Calculate total speaking time
    speaking_time = sum(end - start for start, end in segments)
    silence_time = total_duration - speaking_time
    
    # Find pauses (gaps between segments)
    pauses = []
    for i in range(len(segments) - 1):
        pause_start = segments[i][1]
        pause_end = segments[i + 1][0]
        pause_duration = pause_end - pause_start
        if pause_duration > 1.0:  # Only count pauses > 1 second
            pauses.append({
                'start': pause_start,
                'duration': pause_duration
            })
    
    metrics = {
        'total_speaking_time': speaking_time,
        'total_silence_time': silence_time,
        'speaking_percentage': (speaking_time / total_duration * 100) if total_duration > 0 else 0,
        'num_segments': len(segments),
        'num_long_pauses': len(pauses),
        'pauses': pauses,
        'avg_segment_length': speaking_time / len(segments) if segments else 0
    }
    
    print(f"  ✓ Speaking time: {speaking_time:.1f}s ({metrics['speaking_percentage']:.1f}%)")
    print(f"  ✓ Silence time: {silence_time:.1f}s")
    print(f"  ✓ Speech segments: {len(segments)}")
    print(f"  ✓ Long pauses (>1s): {len(pauses)}")
    
    return metrics


def transcribe_audio(audio_path):
    """
    Transcribe audio using Whisper
    
    Args:
        audio_path: Path to audio file
    
    Returns:
        dict with transcription results
    """
    print("\n📝 Transcribing audio...")
    
    try:
        import whisper
        
        # Load model (base is good balance of speed/accuracy)
        print("  Loading Whisper model...")
        model = whisper.load_model("base")
        
        print("  Transcribing...")
        result = model.transcribe(audio_path)
        
        print(f"  ✓ Transcription complete")
        print(f"  ✓ Detected language: {result['language']}")
        
        return {
            'success': True,
            'text': result['text'],
            'language': result['language'],
            'segments': result['segments']
        }
    
    except ImportError:
        print("  ⚠️  Whisper not available, skipping transcription")
        return {
            'success': False,
            'error': 'Whisper not installed'
        }
    except Exception as e:
        print(f"  ❌ Transcription failed: {e}")
        return {
            'success': False,
            'error': str(e)
        }


def analyze_audio_quality(audio, sr):
    """
    Analyze audio quality metrics
    
    Args:
        audio: Audio signal
        sr: Sample rate
    
    Returns:
        dict with quality metrics
    """
    print("\n🎚️  Analyzing audio quality...")
    
    # RMS energy (volume)
    rms = np.sqrt(np.mean(audio**2))
    
    # Peak amplitude
    peak = np.abs(audio).max()
    
    # Zero crossing rate (roughness indicator)
    zcr = librosa.feature.zero_crossing_rate(audio)[0].mean()
    
    # Spectral centroid (brightness)
    spectral_centroids = librosa.feature.spectral_centroid(y=audio, sr=sr)[0]
    avg_centroid = np.mean(spectral_centroids)
    
    metrics = {
        'rms_energy': float(rms),
        'peak_amplitude': float(peak),
        'zero_crossing_rate': float(zcr),
        'spectral_centroid': float(avg_centroid),
        'clipping_detected': peak > 0.95
    }
    
    print(f"  ✓ RMS Energy: {rms:.4f}")
    print(f"  ✓ Peak Amplitude: {peak:.4f}")
    if metrics['clipping_detected']:
        print("  ⚠️  Warning: Audio clipping detected (volume too high)")
    
    return metrics


def analyze_single_speaker_presentation(
    audio_path,
    output_json_path,
    enable_transcription=True
):
    """
    Analyze a single-speaker presentation
    
    Args:
        audio_path: Path to audio file
        output_json_path: Path to save JSON results
        enable_transcription: Whether to transcribe audio
    
    Returns:
        dict with analysis results
    """
    print("\n" + "="*80)
    print("SINGLE-SPEAKER PRESENTATION ANALYSIS")
    print("="*80)
    
    try:
        # Load audio
        print(f"\n📂 Loading audio: {os.path.basename(audio_path)}")
        audio, sr, duration = convert_to_mono_wav(audio_path, audio_path)
        
        # Detect speech segments
        segments = detect_speech_segments(audio, sr)
        
        # Analyze pacing
        pacing = analyze_speaking_pace(segments, duration)
        
        # Analyze quality
        quality = analyze_audio_quality(audio, sr)
        
        # Transcribe if enabled
        transcription = None
        if enable_transcription:
            transcription = transcribe_audio(audio_path)
        
        # Create result
        result = {
            'audio_file': audio_path,
            'duration': duration,
            'sample_rate': sr,
            'speech_segments': [
                {'start': float(start), 'end': float(end), 'duration': float(end - start)}
                for start, end in segments
            ],
            'pacing_metrics': pacing,
            'audio_quality': quality,
            'transcription': transcription
        }
        
        # Save JSON
        output_dir = Path(output_json_path).parent
        output_dir.mkdir(parents=True, exist_ok=True)
        
        with open(output_json_path, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2)
        
        print(f"\n✓ Analysis saved to: {output_json_path}")
        
        # Print summary
        print("\n" + "="*80)
        print("ANALYSIS SUMMARY")
        print("="*80)
        print(f"Duration: {timedelta(seconds=int(duration))}")
        print(f"Speaking: {pacing['total_speaking_time']:.1f}s ({pacing['speaking_percentage']:.1f}%)")
        print(f"Silence: {pacing['total_silence_time']:.1f}s")
        print(f"Speech segments: {pacing['num_segments']}")
        print(f"Long pauses: {pacing['num_long_pauses']}")
        
        if transcription and transcription['success']:
            print(f"\nTranscription preview:")
            preview = transcription['text'][:200]
            print(f"  {preview}{'...' if len(transcription['text']) > 200 else ''}")
        
        return result
        
    except Exception as e:
        print(f"\n❌ Analysis failed: {e}")
        import traceback
        traceback.print_exc()
        raise


def main():
    """Example usage"""
    
    # Example: Analyze a presentation recording
    AUDIO_FILE = r"C:\Users\golan\VisualStudioProjects\intelligent_interactive_systems\test_recording.wav"
    OUTPUT_DIR = r"C:\Users\golan\VisualStudioProjects\intelligent_interactive_systems\output"
    
    if not os.path.exists(AUDIO_FILE):
        print(f"Test audio file not found: {AUDIO_FILE}")
        print("\nThis script analyzes single-speaker presentations.")
        print("Usage:")
        print("  from single_speaker_analyzer import analyze_single_speaker_presentation")
        print("  result = analyze_single_speaker_presentation('audio.wav', 'output.json')")
        return
    
    output_json = os.path.join(OUTPUT_DIR, "analysis.json")
    result = analyze_single_speaker_presentation(
        AUDIO_FILE,
        output_json,
        enable_transcription=True
    )
    
    print("\n✓ Analysis complete!")


if __name__ == "__main__":
    main()
