import os
from dotenv import load_dotenv

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(BASE_DIR, '.env'))


class Config:
    """Konfigurasi utama aplikasi Flask."""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'facesync-secret-key-2026')

    # Database Configuration (PostgreSQL/Supabase via DATABASE_URL, fallback to SQLite)
    _db_url = os.environ.get('DATABASE_URL')
    if _db_url:
        if _db_url.startswith('postgres://'):
            _db_url = _db_url.replace('postgres://', 'postgresql://', 1)
        SQLALCHEMY_DATABASE_URI = _db_url
    else:
        SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(BASE_DIR, 'database.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Folder penyimpanan foto wajah mahasiswa
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads', 'faces')
    EXPORT_FOLDER = os.path.join(BASE_DIR, 'exports')

    # Batas toleransi pencocokan wajah (semakin kecil = semakin ketat)
    FACE_RECOGNITION_TOLERANCE = 0.45
