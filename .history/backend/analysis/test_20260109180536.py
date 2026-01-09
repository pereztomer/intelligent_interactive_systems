import whisper
language='en'

audio_path = r"C:\Users\perez\Desktop\intelligent_interactive_systems\sessions\test_seasion_11\attempt_1\audio.wav"
# Load model (base is good balance of speed/accuracy)
print("  Loading Whisper model...")
model = whisper.load_model("base")

print("  Transcribing...")
print(audio_path)
result = model.transcribe(audio_path, language=language)