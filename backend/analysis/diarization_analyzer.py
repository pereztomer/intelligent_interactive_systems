"""
Improved Speaker Diarization with Audio Normalization
Processes audio in 10-minute segments
"""

import os
import json
import librosa
import soundfile as sf
import numpy as np
from pathlib import Path
import warnings
import math

warnings.filterwarnings("ignore", category=UserWarning)


def convert_to_mono_wav(input_path, output_path, target_sr=16000):
    """
    Convert any audio file to mono WAV format and save to disk
    
    Args:
        input_path: Input audio file (any format)
        output_path: Output WAV file path
        target_sr: Target sample rate (default 16000 Hz)
    
    Returns:
        tuple: (audio array, sample rate, duration in seconds)
    """
    print(f"\n🎵 Converting to mono WAV...")
    print(f"  Input: {os.path.basename(input_path)}")
    
    # Load audio and convert to mono
    audio, sr = librosa.load(input_path, sr=target_sr, mono=True)
    
    duration = len(audio) / sr
    
    # Save as WAV
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    sf.write(output_path, audio, sr)
    
    print(f"  ✓ Converted to mono WAV")
    print(f"  ✓ Duration: {duration:.2f}s ({duration/60:.2f} minutes)")
    print(f"  ✓ Sample rate: {sr} Hz")
    print(f"  ✓ Saved to: {output_path}")
    
    return audio, sr, duration


def normalize_rms(audio, target_rms=0.1):
    """
    Normalize audio using RMS to balance volume levels
    This helps when host is louder than guests
    
    Args:
        audio: Audio signal (numpy array)
        target_rms: Target RMS value (default 0.1)
    
    Returns:
        Normalized audio
    """
    current_rms = np.sqrt(np.mean(audio**2))
    
    if current_rms > 0:
        scaling_factor = target_rms / current_rms
        normalized_audio = audio * scaling_factor
        
        # Prevent clipping
        max_val = np.abs(normalized_audio).max()
        if max_val > 1.0:
            normalized_audio = normalized_audio / max_val * 0.99
        
        return normalized_audio
    
    return audio


def apply_dynamic_range_compression(audio, threshold=0.3, ratio=4.0):
    """
    Apply simple dynamic range compression to reduce volume differences
    
    Args:
        audio: Audio signal
        threshold: Threshold above which compression is applied
        ratio: Compression ratio
    
    Returns:
        Compressed audio
    """
    compressed = audio.copy()
    
    # Find samples above threshold
    above_threshold = np.abs(compressed) > threshold
    
    # Apply compression
    compressed[above_threshold] = np.sign(compressed[above_threshold]) * (
        threshold + (np.abs(compressed[above_threshold]) - threshold) / ratio
    )
    
    return compressed


def preprocess_audio_segment(
    audio,
    sr,
    output_path,
    apply_rms_norm=True,
    apply_compression=True
):
    """
    Preprocess audio segment: normalize RMS, compress
    
    Args:
        audio: Audio array
        sr: Sample rate
        output_path: Output preprocessed audio file
        apply_rms_norm: Whether to apply RMS normalization
        apply_compression: Whether to apply dynamic range compression
    
    Returns:
        Duration in seconds
    """
    duration = len(audio) / sr
    
    print(f"\n📂 Processing segment: {os.path.basename(output_path)}")
    print(f"  Duration: {duration:.2f}s ({duration/60:.2f} minutes)")
    
    # Apply RMS normalization
    if apply_rms_norm:
        print("  🔊 RMS normalization...")
        audio = normalize_rms(audio, target_rms=0.1)
    
    # Apply dynamic range compression
    if apply_compression:
        print("  🎚️  Dynamic range compression...")
        audio = apply_dynamic_range_compression(audio, threshold=0.3, ratio=4.0)
    
    # Save preprocessed audio
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    sf.write(output_path, audio, sr)
    print(f"  ✓ Saved: {output_path}")
    
    return duration


def diarize_with_improved_pipeline(
    audio_path,
    output_json_path,
    use_num_speakers=None,
    min_speakers=2,
    max_speakers=5
):
    """
    Run diarization using improved settings
    Similar to the original diarization.py that worked well
    
    Args:
        audio_path: Path to preprocessed audio
        output_json_path: Path to save JSON results
        use_num_speakers: Fixed number of speakers (None to let model decide)
        min_speakers: Minimum speakers if not fixed
        max_speakers: Maximum speakers if not fixed
    
    Returns:
        dict with diarization results
    """
    print("\n" + "="*80)
    print("RUNNING IMPROVED DIARIZATION")
    print("="*80)
    
    # Get HF token
    hf_token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGINGFACE_TOKEN")
    
    if not hf_token:
        try:
            from dotenv import load_dotenv
            load_dotenv()
            hf_token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGINGFACE_TOKEN")
        except:
            pass
    
    if not hf_token:
        raise ValueError("HF_TOKEN or HUGGINGFACE_TOKEN not found in environment")
    
    print("✓ HuggingFace token found")
    
    try:
        from pyannote.audio import Pipeline
        
        print("\n📦 Loading pyannote.audio pipeline...")
        pipeline = Pipeline.from_pretrained(
            "pyannote/speaker-diarization-3.1",
            use_auth_token=hf_token
        )
        print("  ✓ Pipeline loaded")
        
        print(f"\n🎙️  Running diarization...")
        
        # Prepare parameters
        if use_num_speakers is not None:
            print(f"  Mode: Fixed {use_num_speakers} speakers")
            diarization = pipeline(audio_path, num_speakers=use_num_speakers)
        else:
            print(f"  Mode: Auto-detect ({min_speakers}-{max_speakers} speakers)")
            diarization = pipeline(
                audio_path,
                min_speakers=min_speakers,
                max_speakers=max_speakers
            )
        
        print("\n📊 Processing results...")
        
        # Convert to segments (like original diarization.py)
        segments = []
        speaker_mapping = {}
        speaker_counter = 0
        
        for turn, _, speaker in diarization.itertracks(yield_label=True):
            if speaker not in speaker_mapping:
                speaker_mapping[speaker] = f"S{speaker_counter}"
                speaker_counter += 1
            
            segment = {
                "speaker": speaker_mapping[speaker],
                "start": round(turn.start, 2),
                "end": round(turn.end, 2),
                "duration": round(turn.end - turn.start, 2)
            }
            segments.append(segment)
        
        # Sort by start time
        segments.sort(key=lambda x: x["start"])
        
        # Create result structure
        result = {
            "audio_file": audio_path,
            "segments": segments
        }
        
        # Save JSON
        output_dir = Path(output_json_path).parent
        output_dir.mkdir(parents=True, exist_ok=True)
        
        with open(output_json_path, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2)
        
        print(f"  ✓ Saved to: {output_json_path}")
        
        # Analysis
        unique_speakers = list(set(seg["speaker"] for seg in segments))
        
        print("\n" + "="*80)
        print("DIARIZATION RESULTS")
        print("="*80)
        print(f"Total segments: {len(segments)}")
        print(f"Unique speakers: {len(unique_speakers)} → {', '.join(unique_speakers)}")
        
        # Calculate speaker time distribution
        speaker_times = {}
        for seg in segments:
            spk = seg["speaker"]
            dur = seg["duration"]
            speaker_times[spk] = speaker_times.get(spk, 0) + dur
        
        print("\nSpeaker time distribution:")
        total_time = sum(speaker_times.values())
        for spk in sorted(unique_speakers):
            time = speaker_times.get(spk, 0)
            pct = (time / total_time * 100) if total_time > 0 else 0
            print(f"  {spk}: {time:.1f}s ({pct:.1f}%)")
        
        # Show sample segments
        print("\nFirst 10 segments:")
        for i, seg in enumerate(segments[:10]):
            print(f"  {i+1}. {seg['speaker']}: {seg['start']:.2f}s - {seg['end']:.2f}s ({seg['duration']:.2f}s)")
        
        # Speaker changes
        changes = sum(1 for i in range(1, len(segments)) if segments[i]['speaker'] != segments[i-1]['speaker'])
        print(f"\nSpeaker changes: {changes} ({changes/len(segments)*100:.1f}% alternation rate)")
        
        print("\n✓ Diarization completed!")
        
        return result
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        raise


def main():
    """Main function to run improved diarization in 10-minute segments"""
    
    # Configuration
    INPUT_AUDIO = r"C:\Users\golan\VisualStudioProjects\Voice-Recognition\scientist_analysis\data\raw\audio\Is Legalizing Marijuana a Mistake.mp3"
    RAW_DATA_DIR = r"C:\Users\golan\VisualStudioProjects\Voice-Recognition\scientist_analysis\data\raw"
    OUTPUT_DIR = r"C:\Users\golan\VisualStudioProjects\Voice-Recognition\scientist_analysis\output"
    
    SEGMENT_DURATION_MINUTES = 10
    
    print("\n" + "="*80)
    print("IMPROVED DIARIZATION PIPELINE - 10-MINUTE SEGMENTS")
    print("="*80)
    print(f"\nInput: {os.path.basename(INPUT_AUDIO)}")
    print(f"Segment duration: {SEGMENT_DURATION_MINUTES} minutes")
    print("\nImprovements:")
    print("  1. ✓ Convert to mono WAV and save")
    print("  2. ✓ Process in 10-minute segments")
    print("  3. ✓ RMS normalization (balance host vs guests)")
    print("  4. ✓ Dynamic range compression")
    print("  5. ✓ Auto speaker detection (no fixed num_speakers)")
    print("="*80)
    
    try:
        # Step 1: Convert to mono WAV and save in data/raw
        audio_basename = Path(INPUT_AUDIO).stem.strip()  # Remove trailing spaces
        mono_wav_path = os.path.join(RAW_DATA_DIR, f"{audio_basename}_mono.wav")
        
        print("\n" + "="*80)
        print("STEP 1: CONVERT TO MONO WAV")
        print("="*80)
        audio, sr, total_duration = convert_to_mono_wav(INPUT_AUDIO, mono_wav_path)
        
        # Step 2: Calculate segments
        segment_duration_sec = SEGMENT_DURATION_MINUTES * 60
        num_segments = math.ceil(total_duration / segment_duration_sec)
        
        print(f"\n" + "="*80)
        print(f"STEP 2: PROCESS {num_segments} SEGMENTS")
        print("="*80)
        
        # Create output directories
        segments_output_dir = os.path.join(OUTPUT_DIR, "10_min_parts", audio_basename)
        os.makedirs(segments_output_dir, exist_ok=True)
        
        # Process each segment
        for segment_idx in range(num_segments):
            start_minute = segment_idx * SEGMENT_DURATION_MINUTES
            end_minute = min((segment_idx + 1) * SEGMENT_DURATION_MINUTES, int(total_duration / 60) + 1)
            
            # Calculate sample indices
            start_sample = int(start_minute * 60 * sr)
            end_sample = min(int(end_minute * 60 * sr), len(audio))
            
            # Extract segment
            audio_segment = audio[start_sample:end_sample]
            segment_duration = len(audio_segment) / sr
            
            print(f"\n{'='*80}")
            print(f"Segment {segment_idx + 1}/{num_segments}: Minutes {start_minute}-{end_minute} ({segment_duration/60:.2f} min)")
            print(f"{'='*80}")
            
            # Create segment filenames
            segment_name = f"{start_minute}-{end_minute}_segment"
            preprocessed_path = os.path.join(segments_output_dir, f"{segment_name}_preprocessed.wav")
            diarization_json_path = os.path.join(segments_output_dir, f"{segment_name}.json")
            
            # Step 2a: Preprocess segment
            preprocess_audio_segment(
                audio_segment,
                sr,
                preprocessed_path,
                apply_rms_norm=True,
                apply_compression=True
            )
            
            # Step 2b: Run diarization on segment
            result = diarize_with_improved_pipeline(
                preprocessed_path,
                diarization_json_path,
                use_num_speakers=None,  # Let model auto-detect
                min_speakers=2,
                max_speakers=5
            )
            
            print(f"  ✓ Segment {segment_idx + 1} completed")
        
        print("\n" + "="*80)
        print("✓ ALL SEGMENTS COMPLETED SUCCESSFULLY!")
        print("="*80)
        print(f"\nOutput location:")
        print(f"  - Mono WAV: {mono_wav_path}")
        print(f"  - Segments: {segments_output_dir}")
        print(f"  - Total segments processed: {num_segments}")
        
        return 0
        
    except Exception as e:
        print(f"\n❌ Pipeline failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit(main())
