import hashlib
import io
import mimetypes

from django.conf import settings
from django.core.files.base import ContentFile
from django.http import FileResponse, HttpResponseRedirect
from PIL import Image, ImageOps
from rest_framework.exceptions import ValidationError

from .models import FileKind, StoredFile

IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
VIDEO_TYPES = {"video/mp4", "video/quicktime", "video/webm"}
Image.MAX_IMAGE_PIXELS = 60_000_000  # guard against decompression bombs


def detect_mime(head: bytes, filename: str) -> str:
    """Real type from file content (libmagic); never trust the client header (ТЗ 5.9)."""
    try:
        import magic

        return magic.from_buffer(head, mime=True)
    except ImportError:  # libmagic missing (e.g. local Windows dev)
        if head.startswith(b"%PDF"):
            return "application/pdf"
        if head[4:8] == b"ftyp":  # ISO base media: MP4 / MOV
            return "video/quicktime" if head[8:12] == b"qt  " else "video/mp4"
        if head.startswith(bytes.fromhex("1a45dfa3")):  # EBML: WebM
            return "video/webm"
        try:
            with Image.open(io.BytesIO(head)) as img:
                return Image.MIME.get(img.format, "application/octet-stream")
        except Exception:
            return mimetypes.guess_type(filename)[0] or "application/octet-stream"


def _sanitize_image(data: bytes, mime: str) -> tuple[bytes, int, int]:
    """Re-encode the image: strips EXIF/GPS and any payload appended to the file."""
    with Image.open(io.BytesIO(data)) as img:
        img.verify()
    with Image.open(io.BytesIO(data)) as img:
        img = ImageOps.exif_transpose(img)
        fmt = {"image/jpeg": "JPEG", "image/png": "PNG", "image/webp": "WEBP"}[mime]
        if fmt == "JPEG" and img.mode not in ("RGB", "L"):
            img = img.convert("RGB")
        out = io.BytesIO()
        img.save(out, format=fmt, quality=88)
        return out.getvalue(), img.width, img.height


def file_response(stored: StoredFile):
    """Deliver a file after the caller has checked access: signed redirect or streamed."""
    if settings.FILE_DOWNLOAD_MODE == "proxy":
        response = FileResponse(
            stored.file.open("rb"), content_type=stored.content_type, filename=stored.original_name
        )
        response["Cache-Control"] = "private, no-store"
        return response
    return HttpResponseRedirect(stored.file.url)


def store_upload(upload, *, building, organization, user, kind=FileKind.PHOTO, caption=""):
    head = upload.read(4096)
    upload.seek(0)
    mime = detect_mime(head, upload.name)
    if mime not in settings.ALLOWED_UPLOAD_MIME_TYPES:
        raise ValidationError({"file": f"Тип файла не разрешён: {mime}."})

    # Video gets its own, larger limit; everything else uses the default
    limit_mb = settings.MAX_VIDEO_UPLOAD_MB if mime in VIDEO_TYPES else settings.MAX_UPLOAD_SIZE_MB
    if upload.size > limit_mb * 1024 * 1024:
        raise ValidationError({"file": f"Файл больше {limit_mb} МБ."})
    if mime in VIDEO_TYPES:
        kind = FileKind.VIDEO
    data = upload.read()

    width = height = None
    if mime in IMAGE_TYPES:
        try:
            data, width, height = _sanitize_image(data, mime)
        except Exception as exc:
            raise ValidationError({"file": "Повреждённое изображение."}) from exc

    stored = StoredFile(
        kind=kind,
        original_name=upload.name[:255],
        content_type=mime,
        size=len(data),
        sha256=hashlib.sha256(data).hexdigest(),
        width=width,
        height=height,
        caption=caption,
        organization=organization,
        building=building,
        uploaded_by=user,
    )
    stored.file.save("upload", ContentFile(data), save=False)
    stored.save()
    return stored
