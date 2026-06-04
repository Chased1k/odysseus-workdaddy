"""
Transcription API routes — whisper.cpp + model selector.
Supports whisper.cpp (default) and faster-whisper fallback.
Parakeet placeholder for future integration.
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
import logging

from services.transcription_service import (
    transcribe_audio,
    get_service_status,
    is_whisper_cpp_available,
)
from src.upload_limits import read_upload_limited

logger = logging.getLogger(__name__)

MAX_AUDIO_BYTES = 50 * 1024 * 1024  # 50MB max upload

router = APIRouter(prefix="/api/transcribe", tags=["transcription"])


@router.get("/models")
async def list_models():
    """List available transcription models."""
    status = get_service_status()
    
    models = []
    
    # Whisper.cpp models (available now)
    for model_file in status["available_models"]:
        # Parse model name from file
        name = model_file.replace("ggml-", "").replace(".bin", "")
        models.append({
            "id": f"whisper-{name}",
            "name": f"Whisper {name.replace('-', ' ').title()}",
            "provider": "whisper.cpp",
            "model_file": model_file,
            "available": status["whisper_cpp_available"],
            "description": f"OpenAI Whisper ({name}) — local, fast, accurate",
        })
    
    # Add default models even if not downloaded yet
    default_whisper_models = [
        ("whisper-base-en", "ggml-base.en.bin", "Whisper Base English"),
        ("whisper-small-en", "ggml-small.en.bin", "Whisper Small English"),
        ("whisper-base", "ggml-base.bin", "Whisper Base Multilingual"),
    ]
    
    existing_ids = {m["id"] for m in models}
    for model_id, model_file, display_name in default_whisper_models:
        if model_id not in existing_ids:
            models.append({
                "id": model_id,
                "name": display_name,
                "provider": "whisper.cpp",
                "model_file": model_file,
                "available": False,  # Not downloaded yet
                "description": f"OpenAI Whisper — download required",
            })
    
    # Parakeet (placeholder — not available yet)
    models.append({
        "id": "parakeet-tdt-0.6b",
        "name": "Parakeet TDT 0.6B",
        "provider": "parakeet",
        "model_file": None,
        "available": False,
        "description": "NVIDIA Parakeet — Apple Silicon only (coming soon)",
        "disabled_reason": "Requires Apple Silicon (MLX framework). Not available on Intel.",
    })
    
    # faster-whisper fallback
    if status["faster_whisper_available"]:
        models.append({
            "id": "faster-whisper-base",
            "name": "Faster Whisper Base",
            "provider": "faster-whisper",
            "model_file": "base",
            "available": True,
            "description": "Whisper via CTranslate2 — Python backend",
        })
    
    return {
        "models": models,
        "default_model": "whisper-base-en" if status["whisper_cpp_available"] else None,
        "whisper_cpp_available": status["whisper_cpp_available"],
    }


@router.post("/")
async def transcribe(
    file: UploadFile = File(...),
    model: str = Form("whisper-base-en"),
    language: str = Form(""),
    playback: bool = Form(False),  # Audio playback optional, default False
):
    """
    Transcribe uploaded audio file.
    
    Args:
        file: Audio file (webm, mp3, wav, etc.)
        model: Model ID from /api/transcribe/models
        language: Optional language code (e.g., 'en', 'es')
        playback: Whether to include audio playback URL in response
    """
    try:
        # Read uploaded file
        audio_bytes = await read_upload_limited(file, MAX_AUDIO_BYTES, "Audio file")
        if not audio_bytes:
            raise HTTPException(status_code=400, detail="Empty audio file")
        
        # Determine provider and model file
        provider = "whisper.cpp"
        model_file = "ggml-base.en.bin"
        
        if model.startswith("whisper-"):
            provider = "whisper.cpp"
            # Map model ID to file
            model_map = {
                "whisper-base-en": "ggml-base.en.bin",
                "whisper-small-en": "ggml-small.en.bin",
                "whisper-base": "ggml-base.bin",
            }
            model_file = model_map.get(model, "ggml-base.en.bin")
        elif model == "faster-whisper-base":
            provider = "faster-whisper"
            model_file = "base"
        elif model.startswith("parakeet"):
            raise HTTPException(
                status_code=503,
                detail="Parakeet is not available on this hardware (Intel). Use Whisper instead."
            )
        
        # Transcribe
        text = transcribe_audio(audio_bytes, provider=provider, model_name=model_file, language=language)
        
        if text is None:
            raise HTTPException(status_code=500, detail="Transcription failed")
        
        response = {
            "text": text,
            "model": model,
            "provider": provider,
            "language": language or "auto",
            "char_count": len(text),
            "word_count": len(text.split()),
        }
        
        # Audio playback is optional
        if playback:
            # Save audio for playback (optional feature)
            import tempfile
            from pathlib import Path
            
            playback_dir = Path("/tmp/transcribe-playback")
            playback_dir.mkdir(exist_ok=True)
            
            playback_id = f"{file.filename or 'audio'}-{hash(text) % 10000}"
            playback_path = playback_dir / f"{playback_id}.webm"
            playback_path.write_bytes(audio_bytes)
            
            response["playback_url"] = f"/api/transcribe/playback/{playback_id}"
            response["playback_duration"] = len(audio_bytes)  # Approximate
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Transcription error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


@router.get("/playback/{playback_id}")
async def get_playback(playback_id: str):
    """Serve audio file for playback (optional feature)."""
    from fastapi.responses import FileResponse
    from pathlib import Path
    
    playback_path = Path(f"/tmp/transcribe-playback/{playback_id}.webm")
    if not playback_path.exists():
        raise HTTPException(status_code=404, detail="Playback file not found")
    
    return FileResponse(playback_path, media_type="audio/webm")


@router.get("/status")
async def transcription_status():
    """Get transcription service status."""
    return get_service_status()
