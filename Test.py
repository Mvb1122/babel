'''
import torch
import torch.nn.functional as F
import nemo.collections.asr as nemo_asr
import librosa

vad_model = nemo_asr.models.EncDecFrameClassificationModel.from_pretrained(model_name="nvidia/frame_vad_multilingual_marblenet_v2.0")

# Move the model to GPU if available
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
vad_model = vad_model.to(device)
vad_model.eval()

# Load the audio
input_signal = librosa.load("test_tts.wav", sr=16000, mono=True)[0]
input_signal = torch.tensor(input_signal).unsqueeze(0).float()
input_signal_length = torch.tensor([input_signal.shape[1]]).long()

# Perform inference
print("Started processing.")
with torch.no_grad():
    torch_outputs = vad_model(
        input_signal=input_signal.to(device),
        input_signal_length=input_signal_length.to(device)
    ).cpu()

    probs = torch_outputs # F.softmax(torch_outputs, dim=-1).numpy()
    speech_probs = probs[0, :, 1]
    
    print("Speech probability shape:", speech_probs.shape)
    print("First 10 probs:", speech_probs[:10])
'''

'''
from transformers import pipeline
import soundfile as sf

pipe = pipeline(
    "audio-classification",
    model="pipecat-ai/smart-turn-v2",
    feature_extractor="facebook/wav2vec2-base"
)

speech, sr = sf.read("test.wav")
if sr != 16_000:
    raise ValueError("Resample to 16 kHz")

result = pipe(speech, top_k=None)[0]
print(f"Completed turn? {result['label']}  Prob: {result['score']:.3f}")
# label == 'complete' → user has finished speaking
'''

import torch
from transformers import Wav2Vec2Processor
from model import Wav2Vec2ForEndpointing

# MODEL_PATH = "path/to/your/trained/model"
MODEL_PATH = "pipecat-ai/smart-turn-v2"

# Load model and processor
model = Wav2Vec2ForEndpointing.from_pretrained(MODEL_PATH)
processor = Wav2Vec2Processor.from_pretrained(MODEL_PATH)

# Set model to evaluation mode and move to platform-optimized backend if available.
# MPS for Apple silicon, CUDA for NVIDIA.
device = "cpu"
if torch.backends.mps.is_available():
    device = "mps"
elif torch.cuda.is_available():
    device = "cuda"
model = model.to(device)
model.eval()


def predict_endpoint(audio_array):
    """
    Predict whether an audio segment is complete (turn ended) or incomplete.

    Args:
        audio_array: Numpy array containing audio samples at 16kHz

    Returns:
        Dictionary containing prediction results:
        - prediction: 1 for complete, 0 for incomplete
        - probability: Probability of completion (sigmoid output)
    """

    # Process audio
    inputs = processor(
        audio_array,
        sampling_rate=16000,
        padding="max_length",
        truncation=True,
        max_length=16000 * 16,  # 16 seconds at 16kHz as specified in training
        return_attention_mask=True,
        return_tensors="pt"
    )

    # Move inputs to device
    inputs = {k: v.to(device) for k, v in inputs.items()}

    # Run inference
    with torch.no_grad():
        outputs = model(**inputs)

        # The model returns sigmoid probabilities directly in the logits field
        probability = outputs["logits"][0].item()

        # Make prediction (1 for Complete, 0 for Incomplete)
        prediction = 1 if probability > 0.5 else 0

    return {
        "prediction": prediction,
        "probability": probability,
    }


# Example usage
if __name__ == "__main__":
    import numpy as np

    # Create a dummy audio array for testing (1 second of random audio)
    dummy_audio = np.random.randn(16000).astype(np.float32)

    result = predict_endpoint(dummy_audio)
    print(f"Prediction: {result['prediction']}")
    print(f"Probability: {result['probability']:.4f}")