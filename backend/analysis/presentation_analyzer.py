"""
Presentation Analyzer - Main analysis orchestrator
Coordinates audio extraction, diarization, and feedback generation
"""

import os
import json
import tempfile
from pathlib import Path
from datetime import datetime

from audio_extractor import extract_audio_from_base64_video


def analyze_presentation_recording(
    video_base64_data,
    pdf_base64_data=None,
    output_dir=None
):
    """
    Analyze a presentation recording
    
    Args:
        video_base64_data: Base64 encoded video data
        pdf_base64_data: Base64 encoded PDF data (optional)
        output_dir: Directory to save analysis outputs
    
    Returns:
        dict with analysis results and feedback
    """
    print("\n" + "="*80)
    print("PRESENTATION ANALYSIS STARTED")
    print("="*80)
    
    # Create output directory
    if output_dir is None:
        output_dir = tempfile.mkdtemp(prefix='presentation_analysis_')
    else:
        os.makedirs(output_dir, exist_ok=True)
    
    print(f"\nOutput directory: {output_dir}")
    
    results = {
        'timestamp': datetime.now().isoformat(),
        'output_dir': output_dir,
        'steps': {}
    }
    
    try:
        # Step 1: Extract audio from video
        print("\n" + "="*80)
        print("STEP 1: EXTRACT AUDIO")
        print("="*80)
        
        audio_path = os.path.join(output_dir, 'extracted_audio.wav')
        audio_result = extract_audio_from_base64_video(
            video_base64_data,
            audio_path,
            sample_rate=16000
        )
        
        if not audio_result['success']:
            results['steps']['audio_extraction'] = {
                'status': 'failed',
                'error': audio_result['error']
            }
            print(f"❌ Audio extraction failed: {audio_result['error']}")
            return results
        
        print(f"✓ Audio extracted successfully")
        print(f"  - Path: {audio_path}")
        print(f"  - Size: {audio_result['file_size_bytes']} bytes")
        print(f"  - Sample rate: {audio_result['sample_rate']} Hz")
        
        results['steps']['audio_extraction'] = {
            'status': 'success',
            'audio_path': audio_path,
            'file_size': audio_result['file_size_bytes'],
            'sample_rate': audio_result['sample_rate']
        }
        
        # Step 2: Analyze speech (single speaker)
        print("\n" + "="*80)
        print("STEP 2: SPEECH ANALYSIS")
        print("="*80)
        
        # Import here to avoid loading heavy libraries if audio extraction fails
        try:
            from single_speaker_analyzer import analyze_single_speaker_presentation
            
            analysis_json = os.path.join(output_dir, 'speech_analysis.json')
            
            speech_result = analyze_single_speaker_presentation(
                audio_path,
                analysis_json,
                enable_transcription=True
            )
            
            results['steps']['speech_analysis'] = {
                'status': 'success',
                'duration': speech_result['duration'],
                'speaking_time': speech_result['pacing_metrics']['total_speaking_time'],
                'speaking_percentage': speech_result['pacing_metrics']['speaking_percentage'],
                'segments': len(speech_result['speech_segments']),
                'long_pauses': speech_result['pacing_metrics']['num_long_pauses'],
                'transcribed': speech_result['transcription']['success'] if speech_result['transcription'] else False,
                'results_path': analysis_json
            }
            
            print(f"✓ Speech analysis completed")
            print(f"  - Duration: {speech_result['duration']:.1f}s")
            print(f"  - Speaking: {results['steps']['speech_analysis']['speaking_percentage']:.1f}%")
            
        except ImportError as e:
            print(f"⚠️  Speech analysis skipped (missing dependencies): {e}")
            results['steps']['speech_analysis'] = {
                'status': 'skipped',
                'reason': 'Missing librosa or dependencies'
            }
        except Exception as e:
            print(f"❌ Speech analysis failed: {e}")
            import traceback
            traceback.print_exc()
            results['steps']['speech_analysis'] = {
                'status': 'failed',
                'error': str(e)
            }
        
        # Step 3: Generate feedback
        print("\n" + "="*80)
        print("STEP 3: GENERATE FEEDBACK")
        print("="*80)
        
        feedback = generate_feedback(results)
        results['feedback'] = feedback
        
        print("✓ Feedback generated")
        
        # Save complete results
        results_path = os.path.join(output_dir, 'analysis_results.json')
        with open(results_path, 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"\n✓ Analysis complete! Results saved to: {results_path}")
        
        return results
        
    except Exception as e:
        print(f"\n❌ Analysis failed: {e}")
        import traceback
        traceback.print_exc()
        results['error'] = str(e)
        return results


def generate_feedback(analysis_results):
    """
    Generate user-friendly feedback from analysis results
    
    Args:
        analysis_results: Dict with analysis steps and results
    
    Returns:
        str: Formatted feedback message
    """
    feedback_parts = ["📊 Presentation Analysis Complete!\n"]
    
    # Audio extraction feedback
    if 'audio_extraction' in analysis_results['steps']:
        audio = analysis_results['steps']['audio_extraction']
        if audio['status'] == 'success':
            duration_sec = audio['file_size'] / (audio['sample_rate'] * 2)  # Rough estimate
      Speech analysis feedback
    if 'speech_analysis' in analysis_results['steps']:
        speech = analysis_results['steps']['speech_analysis']
        if speech['status'] == 'success':
            feedback_parts.append(f"\n🎤 Speech Analysis:")
            feedback_parts.append(f"  - Duration: {speech['duration']:.1f}s")
            feedback_parts.append(f"  - Speaking time: {speech['speaking_time']:.1f}s ({speech['speaking_percentage']:.1f}%)")
            feedback_parts.append(f"  - Speech segments: {speech['segments']}")
            
            # Pacing feedback
            if speech['speaking_percentage'] < 60:
                feedback_parts.append(f"\n💡 Tip: Consider speaking more - only {speech['speaking_percentage']:.0f}% speaking time")
            elif speech['speaking_percentage'] > 90:
                feedback_parts.append(f"\n💡 Tip: Good pacing! {speech['speaking_percentage']:.0f}% speaking time")
            
            # Pause feedback
            if speech['long_pauses'] > 5:
                feedback_parts.append(f"\n⚠️  Detected {speech['long_pauses']} long pauses - consider smoother transitions")
            
            # Transcription feedback
            if speech.get('transcribed'):
                feedback_parts.append(f"\n📝 Transcription available - check for filler words")
        elif speech['status'] == 'skipped':
            feedback_parts.append(f"\n⚠️  Speech analysis unavailable (install librosa
            else:
                feedback_parts.append(f"\n💡 Tip: Multiple speakers detected - great for Q&A sections!")
        elif diarization['status'] == 'skipped':
            feedback_parts.append(f"\n⚠️  Speaker analysis unavailable (install pyannote.audio)")
    
    # Summary
    feedback_parts.append(f"\n\n🎯 Next Steps:")
    feedback_parts.append(f"  - Review your pacing and speaking clarity")
    feedback_parts.append(f"  - Check for awkward pauses or filler words")
    feedback_parts.append(f"  - Ensure slides align with your narrative")
    
    return "\n".join(feedback_parts)


if __name__ == '__main__':
    print("Presentation Analyzer")
    print("Main orchestrator for presentation recording analysis")
    print("\nThis module coordinates:")
    print("  1. Audio extraction from video")
    print("  2. Speaker diarization")
    print("  3. Feedback generation")
