"""
Transcription service using faster-whisper as primary engine.
Falls back to whisper.cpp CLI if available, or auto-downloads models.
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

# Default model for faster-whisper (downloads automatically if not present)
# Sizes: tiny, base, small, medium, large-v1, large-v2, large-v3
DEFAULT_FASTER_MODEL = os.environ.get("WHISPER_MODEL", "base")

# Default model file for whisper.cpp CLI fallback
DEFAULT_GGML_MODEL = "ggml-base.en.bin"


def get_whisper_model_path(model_name: str = DEFAULT_GGML_MODEL) -> Optional[str]:
    """Get the full path to a whisper.cpp model file."""
    model_path = Path(WHISPER_MODELS_DIR) / model_name
    if model_path.exists():
        return str(model_path)
    
    for parent in [Path.home() / ".openclaw/models", Path("/models"), Path("/usr/local/share/whisper")]:
        candidate = parent / model_name
        if candidate.exists():
            return str(candidate)
    
    return None


def transcribe_with_faster_whisper(audio_bytes: bytes, model_name: str = DEFAULT_FASTER_MODEL, language: str = "") -> Optional[str]:
    """
    Transcribe audio using faster-whisper (CTranslate2-based, very fast).
    This is the PRIMARY method — auto-downloads models on first use.
    """
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        logger.warning("faster-whisper not installed")
        return None
    
    tmp_path = None
    try:
        # Write audio to temp file
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as f:
            f.write(audio_bytes)
            tmp_path = f.name
        
        # faster-whisper handles format conversion internally (supports webm, mp3, wav, etc.)
        model = WhisperModel(model_name, device="cpu", compute_type="int8")
        
        kwargs = {}
        if language:
            kwargs["language"] = language
        
        segments, info = model.transcribe(tmp_path, **kwargs)
        text = " ".join(seg.text.strip() for seg in segments)
        
        logger.info(f"faster-whisper: {len(text)} chars, lang={info.language}, prob={info.language_probability:.2f}")
        return text
        
    except Exception as e:
        logger.error(f"faster-whisper transcription failed: {e}")
        return None
    finally:
        if tmp_path and Path(tmp_path).exists():
            Path(tmp_path).unlink(missing_ok=True)


def transcribe_with_whisper_cpp(audio_bytes: bytes, model_name: str = DEFAULT_GGML_MODEL, language: str = "") -> Optional[str]:
    """Transcribe audio using whisper.cpp CLI (fallback)."""
    model_path = get_whisper_model_path(model_name)
    if not model_path:
        logger.error(f"Whisper model not found: {model_name}")
        return None
    
    tmp_audio = None
    tmp_wav = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as f:
            f.write(audio_bytes)
            tmp_audio = f.name
        
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            tmp_wav = f.name
        
        convert_result = subprocess.run(
            ["ffmpeg", "-y", "-i", tmp_audio, "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", tmp_wav],
            capture_output=True, text=True, timeout=30
        )
        
        if convert_result.returncode != 0:
            logger.error(f"ffmpeg conversion failed: {convert_result.stderr}")
            tmp_wav = tmp_audio
        
        cmd = [WHISPER_CLI, "-m", model_path, "-f", tmp_wav, "-np"]
        if language:
            cmd.extend(["-l", language])
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        
        if result.returncode != 0:
            logger.error(f"whisper.cpp CLI failed: {result.stderr}")
            return None
        
        text = result.stdout.strip()
        logger.info(f"whisper.cpp CLI: {len(text)} chars transcribed")
        return text
        
    except subprocess.TimeoutExpired:
        logger.error("whisper.cpp transcription timed out")
        return None
    except Exception as e:
        logger.error(f"whisper.cpp CLI error: {e}")
        return None
    finally:
        for tmp in [tmp_audio, tmp_wav]:
            if tmp and Path(tmp).exists():
                try:
                    Path(tmp).unlink()
                except:
                    pass


def transcribe_audio(audio_bytes: bytes, provider: str = "auto", model_name: str = "", language: str = "") -> Optional[str]:
    """
    Transcribe audio using the specified provider.
    
    Args:
        audio_bytes: Raw audio file bytes
        provider: "auto" (tries faster-whisper first, then whisper.cpp)
        model_name: Model name for the chosen provider
        language: Optional language code ("en", "es", etc.)
    
    Returns:
        Transcribed text or None if failed
    """
    if provider == "auto":
        # Primary: faster-whisper (fastest, pure Python)
        result = transcribe_with_faster_whisper(audio_bytes, model_name or DEFAULT_FASTER_MODEL, language)
        if result:
            return result
        # Fallback: whisper.cpp CLI
        result = transcribe_with_whisper_cpp(audio_bytes, model_name or DEFAULT_GGML_MODEL, language)
        if result:
            return result
        logger.error("All transcription backends failed")
        return None
    elif provider == "faster-whisper":
        return transcribe_with_faster_whisper(audio_bytes, model_name or DEFAULT_FASTER_MODEL, language)
    elif provider == "whisper.cpp":
        return transcribe_with_whisper_cpp(audio_bytes, model_name or DEFAULT_GGML_MODEL, language)
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


def is_faster_whisper_available() -> bool:
    """Check if faster-whisper is installed."""
    try:
        import faster_whisper
        return True
    except ImportError:
        return False


def get_service_status() -> dict:
    """Get transcription service status for health checks."""
    status = {
        "faster_whisper_available": is_faster_whisper_available(),
        "faster_whisper_model": DEFAULT_FASTER_MODEL,
        "whisper_cpp_available": is_whisper_cpp_available(),
        "whisper_cpp_path": WHISPER_CLI,
        "models_dir": WHISPER_MODELS_DIR,
        "available_ggml_models": get_available_models(),
    }
    return status