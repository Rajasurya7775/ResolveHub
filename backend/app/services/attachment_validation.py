from pathlib import PurePosixPath
from zipfile import ZipFile

import olefile
from defusedxml.ElementTree import parse
from fastapi import HTTPException, UploadFile
from PIL import Image
from pypdf import PdfReader
from pypdf.generic import ArrayObject, DictionaryObject, IndirectObject

MAX_FILE_SIZE = 10 * 1024 * 1024
MAX_ATTACHMENTS = 5
WORD_TYPES = {
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
CONTENT_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".pdf": "application/pdf",
    **WORD_TYPES,
}


def validate_upload(upload: UploadFile) -> tuple[str, str, str, int]:
    name = PurePosixPath((upload.filename or "").replace(chr(92), "/")).name
    if not name or len(name) > 255 or any(ord(char) < 32 or ord(char) == 127 for char in name):
        raise HTTPException(422, "Invalid attachment filename")
    extension = PurePosixPath(name).suffix.lower()
    content_type = CONTENT_TYPES.get(extension)
    if not content_type or upload.content_type not in {content_type, "application/octet-stream"}:
        raise HTTPException(415, "Unsupported attachment type")

    file = upload.file
    file.seek(0, 2)
    size = file.tell()
    if size > MAX_FILE_SIZE:
        raise HTTPException(413, "Attachments cannot exceed 10 MiB")
    file.seek(0)
    try:
        if extension in {".jpeg", ".jpg", ".png"}:
            expected = "PNG" if extension == ".png" else "JPEG"
            with Image.open(file, formats=[expected]) as image:
                image.verify()
            file.seek(0)
            with Image.open(file, formats=[expected]) as image:
                image.load()
        elif extension == ".pdf":
            reader = PdfReader(file, strict=True)
            if reader.is_encrypted or not reader.pages:
                raise ValueError("PDF requires readable pages")
            validate_pdf_objects(reader)
        elif extension == ".doc":
            with olefile.OleFileIO(file, raise_defects=olefile.DEFECT_INCORRECT) as document:
                with document.openstream("WordDocument") as stream:
                    header = stream.read(32)
                if len(header) != 32 or header[:2] != bytes.fromhex("eca5"):
                    raise ValueError("Invalid Word header")
                flags = int.from_bytes(header[10:12], "little")
                table = "1Table" if flags & 0x0200 else "0Table"
                if flags & 0x0100:
                    raise ValueError("Encrypted Word document")
                with document.openstream(table) as stream:
                    if not stream.read(1):
                        raise ValueError("Invalid Word table")
        else:
            validate_docx(file)
    except Exception as exc:
        raise HTTPException(422, "Malformed or unreadable attachment") from exc
    finally:
        file.seek(0)
    return name, extension, content_type, size


def validate_pdf_objects(reader):
    pending = [reader.trailer.raw_get("/Root")]
    visited = set()
    while pending:
        item = pending.pop()
        if isinstance(item, IndirectObject):
            reference = (item.idnum, item.generation)
            if reference in visited:
                continue
            visited.add(reference)
            item = item.get_object()
        if isinstance(item, DictionaryObject):
            if any(key in item for key in ("/JS", "/JavaScript", "/RichMediaContent", "/XFA")):
                raise ValueError("Active content in PDF")
            action = item.get("/S")
            if isinstance(action, str) and action in {"/JavaScript", "/Launch", "/RichMediaExecute"}:
                raise ValueError("Active action in PDF")
            pending.extend(item.values())
        elif isinstance(item, ArrayObject):
            pending.extend(item)


def validate_docx(file):
    with ZipFile(file) as archive:
        entries = archive.infolist()
        if len(entries) > 2048 or sum(entry.file_size for entry in entries) > 50 * 1024 * 1024:
            raise ValueError("Document exceeds decompression limits")
        if len(set(archive.namelist())) != len(entries) or archive.testzip() is not None:
            raise ValueError("Invalid document archive")
        with archive.open("[Content_Types].xml") as types:
            content_types = parse(types).getroot()
        with archive.open("word/document.xml") as body:
            document = parse(body).getroot()
        with archive.open("_rels/.rels") as relationships:
            root_relationships = parse(relationships).getroot()
        if not any(
            relation.get("Type") in {
                "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument",
                "http://purl.oclc.org/ooxml/officeDocument/relationships/officeDocument",
            }
            and relation.get("Target") in {"word/document.xml", "/word/document.xml"}
            and relation.get("TargetMode") != "External"
            for relation in root_relationships
        ):
            raise ValueError("Missing Word document relationship")
        if not any(
            item.get("PartName") == "/word/document.xml"
            and item.get("ContentType")
            == "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"
            for item in content_types
        ) or document.tag not in {
            "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}document",
            "{http://purl.oclc.org/ooxml/wordprocessingml/main}document",
        }:
            raise ValueError("Invalid Word document")
        namespace = document.tag.split("}", 1)[0] + "}"
        if document.find(f"{namespace}body") is None:
            raise ValueError("Missing Word document body")
