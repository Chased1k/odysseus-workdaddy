"""
Transcription service using whisper.cpp CLI (already installed on host).
Falls back to faster-whisper if whisper.cpp is not available.
"""

import os
import subprocess
import tempfile
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# Path to whisper.cpp models (mounted from host)
WHISPER_MODELS_DIR = os.environ.get("WHISPER_MODELS_DIR", "/app/models")
WHISPER_CLI = os.environ.get("WHISPER_CLI", "whisper-cli")

# Default model file
DEFAULT_MODEL = "ggml-base.en.bin"


def get_whisper_model_path(model_name: str = DEFAULT_MODEL) -> Optional[str]:
    """Get the full path to a whisper.cpp model file."""
    # First check mounted models dir
    model_path = Path(WHISPER_MODELS_DIR) / model_name
    if model_path.exists():
        return str(model_path)
    
    # Fallback to common locations
    for parent in [Path.home() / ".openclaw/models", Path("/models"), Path("/usr/local/share/whisper")]:
        candidate = parent / model_name
        if candidate.exists():
            return str(candidate)
    
    return None


def transcribe_with_whisper_cpp(audio_bytes: bytes, model_name: str = DEFAULT_MODEL, language: str = "") -> Optional[str]:
    """
    Transcribe audio using whisper.cpp CLI.
    
    Args:
        audio_bytes: Raw audio file bytes (webm, mp3, wav, etc.)
        model_name: Name of the whisper.cpp model file (e.g., ggml-base.en.bin)
        language: Optional language code (e.g., 'en', 'es')
    
    Returns:
        Transcribed text or None if failed
    """
    model_path = get_whisper_model_path(model_name)
    if not model_path:
        logger.error(f"Whisper model not found: {model_name}")
        return None
    
    # Write audio to temp file
    tmp_audio = None
    tmp_out = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as f:
            f.write(audio_bytes)
            tmp_audio = f.name
        
        # Whisper.cpp needs wav — convert with ffmpeg if available
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            tmp_wav = f.name
        
        # Convert to wav using ffmpeg (available in container via apt)
        convert_result = subprocess.run(
            ["ffmpeg", "-y", "-i", tmp_audio, "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", tmp_wav],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if convert_result.returncode != 0:
            logger.error(f"ffmpeg conversion failed: {convert_result.stderr}")
            # Try with original file anyway (whisper.cpp might handle it)
            tmp_wav = tmp_audio
        
        # Run whisper.cpp
        cmd = [
            WHISPER_CLI,
            "-m", model_path,
            "-f", tmp_wav,
            "-oj", "false",  # no json
            "-of", "/dev/stdout",  # output to stdout
            "-np",  # no prints except text
        ]
        
        if language:
            cmd.extend(["-l", language])
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120
        )
        
        if result.returncode != 0:
            logger.error(f"whisper.cpp failed: {result.stderr}")
            return None
        
        text = result.stdout.strip()
        logger.info(f"whisper.cpp: {len(text)} chars transcribed")
        return text
        
    except subprocess.TimeoutExpired:
        logger.error("whisper.cpp transcription timed out")
        return None
    except Exception as e:
        logger.error(f"whisper.cpp transcription error: {e}")
        return None
    finally:
        # Cleanup temp files
        for tmp in [tmp_audio, tmp_wav, tmp_out]:
            if tmp and Path(tmp).exists():
                try:
                    Path(tmp).unlink()
                except:
                    pass


def transcribe_with_faster_whisper(audio_bytes: bytes, model_name: str = "base", language: str = "") -> Optional[str]:
    """Fallback transcription using faster-whisper Python library."""
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        logger.warning("faster-whisper not installed")
        return None
    
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as f:
            f.write(audio_bytes)
            tmp_path = f.name
        
        model = WhisperModel(model_name, device="cpu", compute_type="int8")
        
        kwargs = {}
        if language:
            kwargs["language"] = language
        
        segments, info = model.transcribe(tmp_path, **kwargs)
        text = " ".join(seg.text.strip() for seg in segments)
        
        logger.info(f"faster-whisper: {len(text)} chars, lang={info.language}")
        return text
        
    except Exception as e:
        logger.error(f"faster-whisper transcription failed: {e}")
        return None
    finally:
        if tmp_path and Path(tmp_path).exists():
            Path(tmp_path).unlink(missing_ok=True)


def transcribe_audio(audio_bytes: bytes, provider: str = "whisper.cpp", model_name: str = DEFAULT_MODEL, language: str = "") -> Optional[str]:
    """
    Transcribe audio using the specified provider.
    
    Args:
        audio_bytes: Raw audio file bytes
        provider: "whisper.cpp" or "faster-whisper"
        model_name: Model file name (whisper.cpp) or model size (faster-whisper)
        language: Optional language code
    
    Returns:
        Transcribed text or None if failed
    """
    if provider == "whisper.cpp":
        return transcribe_with_whisper_cpp(audio_bytes, model_name, language)
    elif provider == "faster-whisper":
        return transcribe_with_faster_whisper(audio_bytes, model_name, language)
    else:
        logger.error(f"Unknown transcription provider: {provider}")
        return None


# ── Model availability check ──

def get_available_models() -> list:
    """Return list of available whisper.cpp model files."""
    models = []
    for parent in [Path(WHISPER_MODELS_DIR), Path.home() / ".openclaw/models", Path("/models")]:
        if parent.exists():
            for f in parent.glob("ggml-*.bin"):
                models.append(f.name)
    return sorted(set(models))


def is_whisper_cpp_available() -> bool:
    """Check if whisper.cpp CLI is installed and working."""
    try:
        result = subprocess.run([WHISPER_CLI, "-h"], capture_output=True, timeout=5)
        return result.returncode == 0
    except:
        return False


def get_service_status() -> dict:
    """Get transcription service status for health checks."""
    status = {
        "whisper_cpp_available": is_whisper_cpp_available(),
        "whisper_cpp_path": WHISPER_CLI,
        "models_dir": WHISPER_MODELS_DIR,
        "available_models": get_available_models(),
        "faster_whisper_available": False,
    }
    
    try:
        import faster_whisper
        status["faster_whisper_available"] = True
    except ImportError:
        pass
    
    return status
