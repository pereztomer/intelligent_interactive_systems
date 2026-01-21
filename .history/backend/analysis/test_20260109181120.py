import whisper
import torch

audio_path = r"C:\Users\perez\Desktop\intelligent_interactive_systems\sessions\test_seasion_11\attempt_1\audio.wav"

# Check device
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {device}")

# Load model on GPU
print("Loading Whisper model...")
model = whisper.load_model("base", device=device)

print("Transcribing...")
result = model.transcribe(audio_path, language='en', fp16=(device=="cuda"))

print(result["text"])
