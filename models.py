"""
Model database menggunakan SQLAlchemy ORM.
Skema mengikuti PRD Bab 6 — Database Schema.
"""

from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, date, time

db = SQLAlchemy()


class Mahasiswa(db.Model):
    """
    Tabel mahasiswa — menyimpan data identitas dan face encoding.
    Sesuai PRD: id, nim, nama, kelas, face_encoding, foto_path
    """
    __tablename__ = 'mahasiswa'

    id = db.Column(db.Integer, primary_key=True)
    nim = db.Column(db.String(20), unique=True, nullable=False)
    nama = db.Column(db.String(100), nullable=False)
    kelas = db.Column(db.String(20), nullable=False)
    face_encoding = db.Column(db.PickleType, nullable=True)  # Menyimpan numpy array
    foto_path = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relasi ke tabel absensi
    absensi_records = db.relationship('Absensi', backref='mahasiswa', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'nim': self.nim,
            'nama': self.nama,
            'kelas': self.kelas,
            'foto_path': self.foto_path,
            'has_face_data': self.face_encoding is not None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Pertemuan(db.Model):
    """
    Tabel pertemuan — menyimpan jadwal dan status sesi.
    Sesuai PRD: id, judul, tanggal, jam_mulai, jam_selesai, status_sesi
    """
    __tablename__ = 'pertemuan'

    id = db.Column(db.Integer, primary_key=True)
    judul = db.Column(db.String(200), nullable=False)
    tanggal = db.Column(db.Date, nullable=False, default=date.today)
    jam_mulai = db.Column(db.Time, nullable=False)
    jam_selesai = db.Column(db.Time, nullable=False)
    status_sesi = db.Column(db.String(10), nullable=False, default='tutup')  # 'buka' atau 'tutup'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relasi ke tabel absensi
    absensi_records = db.relationship('Absensi', backref='pertemuan', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'judul': self.judul,
            'tanggal': self.tanggal.isoformat() if self.tanggal else None,
            'jam_mulai': self.jam_mulai.strftime('%H:%M') if self.jam_mulai else None,
            'jam_selesai': self.jam_selesai.strftime('%H:%M') if self.jam_selesai else None,
            'status_sesi': self.status_sesi,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Absensi(db.Model):
    """
    Tabel absensi — mencatat kehadiran mahasiswa per pertemuan.
    Sesuai PRD: id, mahasiswa_id, pertemuan_id, waktu_absen, status, confidence_score
    """
    __tablename__ = 'absensi'

    id = db.Column(db.Integer, primary_key=True)
    mahasiswa_id = db.Column(db.Integer, db.ForeignKey('mahasiswa.id'), nullable=False)
    pertemuan_id = db.Column(db.Integer, db.ForeignKey('pertemuan.id'), nullable=False)
    waktu_absen = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20), nullable=False, default='hadir')  # hadir / alpa
    confidence_score = db.Column(db.Float, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'mahasiswa_id': self.mahasiswa_id,
            'pertemuan_id': self.pertemuan_id,
            'mahasiswa_nama': self.mahasiswa.nama if self.mahasiswa else None,
            'mahasiswa_nim': self.mahasiswa.nim if self.mahasiswa else None,
            'pertemuan_judul': self.pertemuan.judul if self.pertemuan else None,
            'pertemuan_tanggal': self.pertemuan.tanggal.isoformat() if self.pertemuan and self.pertemuan.tanggal else None,
            'waktu_absen': self.waktu_absen.isoformat() if self.waktu_absen else None,
            'status': self.status,
            'confidence_score': round(self.confidence_score, 4) if self.confidence_score else None
        }
