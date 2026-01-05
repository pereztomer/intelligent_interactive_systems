"""
Create individual JSON files for each speaker with merged segments
Excludes moderator and crowd speakers
"""

import os
import json
from pathlib import Path
from typing import List, Dict


def get_debater_names(podcast_name: str) -> List[str]:
    """
    Extract debater names for specific podcast (excluding moderator and crowd)
    """
    debaters = {
        "Wartime Kill Switch Human or AI": [
            "Laura Walker Mcdonald",
            "Michael C. Horowitz",
            "Elliot Ackerman",
            "Jack Shanahan"
        ],
        "Psychedelics for Mental Health Help or Hype": [
            "Ismail Ali",
            "Kevin Sabet"
        ],
        "Should We Legalize the Market for Human Organs": [
            "Sally Satel",
            "Jeremy Chapman"
        ],
        "Debating the Legacy of the COVID-19 Pandemic": [
            "Laura Walker Mcdonald",
            "Michael C. Horowitz",
            "Elliot Ackerman",
            "Jack Shanahan"
        ],
        "Childhood Obesity Guidelines Good Medicine or Too Extreme": [
            "Julia Nordgren",
            "Janna Gewirtz O'Brien"
        ]
    }
    
    return debaters.get(podcast_name, [])


def is_crowd_speaker(speaker: str) -> bool:
    """Check if speaker is from the crowd"""
    crowd_keywords = ['crowd', 'audience', 'question', 'streamed audio']
    speaker_lower = speaker.lower()
    return any(keyword in speaker_lower for keyword in crowd_keywords)


def is_moderator(speaker: str) -> bool:
    """Check if speaker is the moderator"""
    moderator_names = ['John Donvan', 'john donvan', 'moderator']
    return speaker in moderator_names or 'donvan' in speaker.lower()


def merge_consecutive_segments(segments: List[Dict], debater_names: List[str]) -> Dict[str, List[Dict]]:
    """
    Merge consecutive segments from same speaker
    Returns dict: {speaker_name: [merged_segments]}
    """
    merged_by_speaker = {}
    
    for speaker in debater_names:
        merged_by_speaker[speaker] = []
    
    for idx, segment in enumerate(segments):
        speaker = segment['speaker']
        
        # Skip crowd and moderator
        if is_crowd_speaker(speaker) or is_moderator(speaker):
            continue
        
        # Skip if not in debater list
        if speaker not in debater_names:
            continue
        
        # Check if this speech follows a crowd question
        # Case 1: Directly after crowd speaker
        # Case 2: After moderator who spoke within 10 seconds of a crowd speaker
        follows_crowd = False
        
        if idx > 0:
            prev_segment = segments[idx - 1]
            
            # Case 1: Previous speaker is crowd
            if is_crowd_speaker(prev_segment['speaker']):
                follows_crowd = True
            
            # Case 2: Previous speaker is moderator, check for crowd before moderator
            elif is_moderator(prev_segment['speaker']):
                # Look back to find if there was a crowd speaker recently
                for j in range(idx - 1, -1, -1):
                    prev_seg = segments[j]
                    
                    # If we find a crowd speaker
                    if is_crowd_speaker(prev_seg['speaker']):
                        # Check if moderator spoke within 20 seconds of crowd ending
                        time_gap = segment['start'] - prev_seg['end']
                        if time_gap <= 20.0:
                            follows_crowd = True
                        break
                    
                    # Stop looking back if we hit a debater or go too far back
                    if prev_seg['speaker'] in debater_names:
                        break
                    
                    # Stop if we've gone back more than 25 seconds
                    if segment['start'] - prev_seg['start'] > 25.0:
                        break
                    # Stop if we've gone back more than 15 seconds
                    if segment['start'] - prev_seg['start'] > 15.0:
                        break
        
        # Check if we can merge with previous segment from same speaker
        speaker_segments = merged_by_speaker[speaker]
        
        if speaker_segments and speaker_segments[-1]['speaker'] == speaker:
            # Merge with previous segment
            last_segment = speaker_segments[-1]
            
            # Calculate pause (gap between end of last and start of current)
            pause_duration = round(segment['start'] - last_segment['end'], 2)
            
            # Only merge if pause is small (< 1 second)
            if pause_duration < 1.0:
                last_segment['end'] = segment['end']
                last_segment['duration'] = round(last_segment['end'] - last_segment['start'], 2)
                last_segment['pauses'].append(pause_duration)
                # Update crowd_question flag if this segment follows crowd
                if follows_crowd:
                    last_segment['crowd_question'] = True
            else:
                # Create new merged segment
                new_segment = {
                    'speaker': speaker,
                    'start': segment['start'],
                    'end': segment['end'],
                    'duration': segment['duration'],
                    'pauses': [],
                    'crowd_question': follows_crowd
                }
                speaker_segments.append(new_segment)
        else:
            # Create new merged segment
            new_segment = {
                'speaker': speaker,
                'start': segment['start'],
                'end': segment['end'],
                'duration': segment['duration'],
                'pauses': [],
                'crowd_question': follows_crowd
            }
            speaker_segments.append(new_segment)
    
    return merged_by_speaker


def process_podcast(json_path: str, output_dir: str, min_duration: float = 3.0):
    """
    Process a merged diarization JSON and create individual speaker files
    """
    # Load merged JSON
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    podcast_name = data['audio_file']
    segments = data['segments']
    
    print(f"\n{'='*80}")
    print(f"Processing: {podcast_name}")
    print(f"{'='*80}")
    print(f"Total segments: {len(segments)}")
    
    # Get debater names for this podcast
    debater_names = get_debater_names(podcast_name)
    
    if not debater_names:
        print(f"⚠️  No debater names found for: {podcast_name}")
        return
    
    print(f"Debaters: {', '.join(debater_names)}")
    
    # Merge consecutive segments
    merged_by_speaker = merge_consecutive_segments(segments, debater_names)
    
    # Create output directory
    podcast_output_dir = os.path.join(output_dir, podcast_name)
    os.makedirs(podcast_output_dir, exist_ok=True)
    
    print(f"\nMerged segments per speaker (filtering < {min_duration}s):")
    
    # Save individual speaker files
    for speaker, speaker_segments in merged_by_speaker.items():
        if not speaker_segments:
            continue
        
        # Filter out segments shorter than min_duration
        original_count = len(speaker_segments)
        filtered_segments = [seg for seg in speaker_segments if seg['duration'] >= min_duration]
        removed_count = original_count - len(filtered_segments)
        
        if not filtered_segments:
            print(f"  - {speaker}: All segments too short, skipping")
            continue
        
        # Count crowd questions
        crowd_questions = sum(1 for seg in filtered_segments if seg['crowd_question'])
        
        # Create speaker data
        speaker_data = {
            'speaker': speaker,
            'podcast': podcast_name,
            'total_segments': len(filtered_segments),
            'total_duration': round(sum(seg['duration'] for seg in filtered_segments), 2),
            'crowd_questions_count': crowd_questions,
            'segments': filtered_segments
        }
        
        # Save to JSON file
        speaker_filename = f"{speaker.replace(' ', '_')}.json"
        output_path = os.path.join(podcast_output_dir, speaker_filename)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(speaker_data, f, indent=2)
        
        print(f"  - {speaker}: {len(filtered_segments)} segments ({removed_count} removed), "
              f"{speaker_data['total_duration']:.1f}s total, "
              f"{crowd_questions} after crowd questions")
        print(f"    → {output_path}")
    
    print(f"\n✓ Processing completed for {podcast_name}")


def main():
    """Main function to process all merged diarization files"""
    
    OUTPUT_DIR = r"C:\Users\golan\VisualStudioProjects\Voice-Recognition\scientist_analysis\output\speakers"
    DIARIZATION_DIR = r"C:\Users\golan\VisualStudioProjects\Voice-Recognition\scientist_analysis\output\diarization_full"
    MIN_SEGMENT_DURATION = 3.0  # seconds - filter out segments shorter than this
    
    print("\n" + "="*80)
    print("CREATE SPEAKER SEGMENT FILES")
    print("="*80)
    print(f"Minimum segment duration: {MIN_SEGMENT_DURATION}s")
    
    # Find all merged JSON files
    merged_files = [f for f in os.listdir(DIARIZATION_DIR) if f.endswith('_merged.json')]
    
    print(f"\nFound {len(merged_files)} merged diarization files")
    
    for merged_file in merged_files:
        json_path = os.path.join(DIARIZATION_DIR, merged_file)
        process_podcast(json_path, OUTPUT_DIR, MIN_SEGMENT_DURATION)
    
    print("\n" + "="*80)
    print("✓ ALL SPEAKER FILES CREATED!")
    print("="*80)
    print(f"\nOutput location: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
