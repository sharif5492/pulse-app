#!/usr/bin/env python3
import os
import zipfile
import shutil

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ZIP_NAME = "Pulse-Social-Video-Reels-PWA-Codester.zip"
OUTPUT_ZIP_ROOT = os.path.join(ROOT_DIR, ZIP_NAME)
OUTPUT_ZIP_PUBLIC = os.path.join(ROOT_DIR, "public", ZIP_NAME)

ARCHIVE_FOLDER_NAME = "Pulse-Social-Video-Platform"

EXCLUDE_DIRS = {
    "node_modules",
    ".git",
    "dist",
    "build",
    "coverage",
    ".cache",
    "__pycache__",
    ".vercel",
    ".gradle",
    ".idea",
}

EXCLUDE_FILES = {
    ZIP_NAME,
    ".env",
    ".DS_Store",
    "Thumbs.db",
}

EXCLUDE_EXTENSIONS = (
    ".zip",
    ".log",
    ".pyc",
)

def should_exclude(rel_path):
    parts = rel_path.split(os.sep)
    for p in parts:
        if p in EXCLUDE_DIRS:
            return True
        if p.startswith(".git"):
            return True
    
    filename = os.path.basename(rel_path)
    if filename in EXCLUDE_FILES:
        return True
    if any(filename.endswith(ext) for ext in EXCLUDE_EXTENSIONS):
        return True
    return False

def build_zip():
    print(f"📦 Packaging Codester Project from: {ROOT_DIR}")
    
    # Remove any existing zip in public
    if os.path.exists(OUTPUT_ZIP_PUBLIC):
        try:
            os.remove(OUTPUT_ZIP_PUBLIC)
        except:
            pass

    file_count = 0
    total_uncompressed_bytes = 0

    with zipfile.ZipFile(OUTPUT_ZIP_ROOT, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zipf:
        for root, dirs, files in os.walk(ROOT_DIR):
            # Prune excluded directories in-place
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS and not d.startswith(".git")]
            
            for f in files:
                full_path = os.path.join(root, f)
                rel_path = os.path.relpath(full_path, ROOT_DIR)

                if should_exclude(rel_path):
                    continue

                archive_path = os.path.join(ARCHIVE_FOLDER_NAME, rel_path)
                zipf.write(full_path, archive_path)
                file_count += 1
                total_uncompressed_bytes += os.path.getsize(full_path)

    zip_size_mb = os.path.getsize(OUTPUT_ZIP_ROOT) / (1024 * 1024)
    print(f"✅ Created root zip: {OUTPUT_ZIP_ROOT}")
    print(f"📊 Packed {file_count} files ({total_uncompressed_bytes / (1024 * 1024):.2f} MB uncompressed -> {zip_size_mb:.2f} MB zip)")

    # Copy to public folder for direct browser download
    os.makedirs(os.path.join(ROOT_DIR, "public"), exist_ok=True)
    shutil.copy2(OUTPUT_ZIP_ROOT, OUTPUT_ZIP_PUBLIC)
    print(f"✅ Copied to public download folder: {OUTPUT_ZIP_PUBLIC}")

if __name__ == "__main__":
    build_zip()
