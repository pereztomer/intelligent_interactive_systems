"""
CLI tool to analyze exported presentation recordings
Run this script on video files exported from the browser app
"""

import sys
import os
from pathlib import Path
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from backend.analysis.audio_extractor import extract_audio_from_video_file
from backend.analysis.single_speaker_analyzer import analyze_single_speaker_presentation


def analyze_exported_recording(video_path, output_dir=None):
    """
    Analyze an exported recording video file
    
    Args:
        video_path: Path to .webm video file
        output_dir: Directory to save results (default: same dir as video)
    
    Returns:
        dict with analysis results
    """
    video_path = Path(video_path).absolute()
    
    if not video_path.exists():
        print(f"❌ Video file not found: {video_path}")
        return None
    
    print("\n" + "="*80)
    print("PRESENTATION RECORDING ANALYSIS")
    print("="*80)
    print(f"\nVideo file: {video_path.name}")
    print(f"Size: {video_path.stat().st_size / (1024*1024):.2f} MB")
    
    # Setup output directory
    if output_dir is None:
        output_dir = video_path.parent / f"analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    else:
        output_dir = Path(output_dir)
    
    output_dir.mkdir(parents=True, exist_ok=True)
    print(f"Output directory: {output_dir}")
    
    try:
        # Step 1: Extract audio
        print("\n" + "="*80)
        print("STEP 1: EXTRACT AUDIO")
        print("="*80)
        
        audio_path = output_dir / "extracted_audio.wav"
        audio_result = extract_audio_from_video_file(
            str(video_path),
            str(audio_path),
            sample_rate=16000
        )
        
        if not audio_result['success']:
            print(f"\n❌ Audio extraction failed: {audio_result['error']}")
            print("\n⚠️  Make sure FFmpeg is installed!")
            print("   Download: https://ffmpeg.org/download.html")
            return None
        
        print(f"\n✓ Audio extracted: {audio_path}")
        
        # Step 2: Analyze speech
        print("\n" + "="*80)
        print("STEP 2: ANALYZE SPEECH")
        print("="*80)
        
        analysis_json = output_dir / "analysis_results.json"
        
        result = analyze_single_speaker_presentation(
            str(audio_path),
            str(analysis_json),
            enable_transcription=True
        )
        
        print("\n" + "="*80)
        print("ANALYSIS COMPLETE!")
        print("="*80)
        print(f"\n📁 Results saved to: {output_dir}")
        print(f"   - Audio: {audio_path.name}")
        print(f"   - Analysis: {analysis_json.name}")
        
        # Display summary
        pacing = result['pacing_metrics']
        print(f"\n📊 SUMMARY:")
        print(f"   Duration: {result['duration']:.1f}s")
        print(f"   Speaking time: {pacing['total_speaking_time']:.1f}s ({pacing['speaking_percentage']:.1f}%)")
        print(f"   Silence: {pacing['total_silence_time']:.1f}s")
        print(f"   Speech segments: {pacing['num_segments']}")
        print(f"   Long pauses (>1s): {pacing['num_long_pauses']}")
        
        if result['transcription'] and result['transcription']['success']:
            print(f"\n📝 TRANSCRIPTION:")
            text_preview = result['transcription']['text'][:200]
            print(f"   {text_preview}{'...' if len(result['transcription']['text']) > 200 else ''}")
        
        return result
        
    except Exception as e:
        print(f"\n❌ Analysis failed: {e}")
        import traceback
        traceback.print_exc()
        return None


def main():
    """Main CLI entry point"""
    
    print("\n" + "="*80)
    print("PRESENTATION ANALYZER - CLI Tool")
    print("="*80)
    
    if len(sys.argv) < 2:
        print("\nUsage:")
        print("  python analyze_recording.py <video_file.webm> [output_dir]")
        print("\nExample:")
        print("  python analyze_recording.py recording.webm")
        print("  python analyze_recording.py recording.webm ./my_analysis")
        print("\nRequirements:")
        print("  - FFmpeg must be installed and in PATH")
        print("  - Python libraries: librosa, soundfile, whisper")
        return 1
    
    video_path = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else None
    
    result = analyze_exported_recording(video_path, output_dir)
    
    if result:
        print("\n✓ Success!")
        return 0
    else:
        print("\n❌ Analysis failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())
