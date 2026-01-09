import whisper
import torch
from pathlib import Path

# Audio file path
audio_path = r"C:\Users\perez\Desktop\intelligent_interactive_systems\sessions\test_seasion_11\attempt_1\audio.wav"

# Check device
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {device}")

# Load model
print("Loading Whisper model...")
model = whisper.load_model("base", device=device)

# Transcribe with word timestamps
print("Transcribing with word timestamps...")
result = model.transcribe(audio_path, language='en', word_timestamps=True, fp16=(device=="cuda"))

# Analyze pauses between words
pauses = []

for segment in result['segments']:
    words = segment.get('words', [])
    for i in range(len(words) - 1):
        pause_duration = words[i+1]['start'] - words[i]['end']
        if pause_duration > 0.3:  # Pauses longer than 300ms
            pauses.append({
                'duration': pause_duration,
                'after_word': words[i].get('word', ''),
                'before_word': words[i+1].get('word', ''),
                'timestamp': words[i]['end']
            })

# Calculate statistics
avg_pause = sum(p['duration'] for p in pauses) / len(pauses) if pauses else 0
long_pauses = [p for p in pauses if p['duration'] > 1.0]  # Pauses over 1 second
very_long_pauses = [p for p in pauses if p['duration'] > 2.0]  # Pauses over 2 seconds

# Print results
print("\n" + "="*80)
print("PAUSE ANALYSIS RESULTS")
print("="*80)
print(f"Total pauses (>300ms): {len(pauses)}")
print(f"Average pause duration: {avg_pause:.2f}s")
print(f"Long pauses (>1s): {len(long_pauses)}")
print(f"Very long pauses (>2s): {len(very_long_pauses)}")

if long_pauses:
    print("\nLong pauses (>1s):")
    for pause in long_pauses[:10]:  # Show first 10
        print(f"  {pause['duration']:.2f}s pause after '{pause['after_word']}' at {pause['timestamp']:.1f}s")

if very_long_pauses:
    print("\nVery long pauses (>2s):")
    for pause in very_long_pauses:
        print(f"  {pause['duration']:.2f}s pause after '{pause['after_word']}' at {pause['timestamp']:.1f}s")

# Summary text for Gemini
summary = f"""PAUSE ANALYSIS:
- Total pauses (>300ms): {len(pauses)}
- Average pause: {avg_pause:.2f}s
- Long pauses (>1s): {len(long_pauses)}
- Very long pauses (>2s): {len(very_long_pauses)}
"""

print("\n" + "="*80)
print("SUMMARY TEXT FOR GEMINI:")
print("="*80)
print(summary)

