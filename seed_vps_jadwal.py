import sqlite3
import os

def seed_vps_jadwal():
    db_path = os.path.join(os.path.dirname(__file__), 'database.db')
    print(f"Connecting to {db_path}...")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Periksa apakah tabel jadwal ada
    try:
        cursor.execute("SELECT count(*) FROM jadwal")
        count = cursor.fetchone()[0]
        if count > 0:
            print(f"Jadwal sudah berisi {count} data. Menghapus data lama...")
            cursor.execute("DELETE FROM jadwal")
    except Exception as e:
        print("Tabel jadwal mungkin belum dibuat. Error:", e)
        return

    # Data jadwal dari lokal
    data = [
        (1, 1, "07:30:00.000000", "10:05:00.000000", "Praktik Robotika A01", "Prof. Yasser Abd Djawad, S.T., M.Sc., Ph.D & Ir. Muhammad Akil, S.Pd., M.T., IPM", "Lab Digital", "2026-10-05 19:09:35.777705"),
        (2, 1, "10:05:00.000000", "12:40:00.000000", "Praktik Robotika A02", "Ir. Muhammad Akil, S.Pd., M.T., IPM & Prof. Yasser Abd Djawad, S.T., M.Sc., Ph.D", "Lab Digital", "2026-10-05 19:10:42.467735"),
        (3, 2, "07:30:00.000000", "10:05:00.000000", "Praktik Simulasi CNC A01", "Dr. Ir. Andi Muhammad Irfan, ST., MT., IPM. & Ir. Labusab, S.Pd., M.T", "Lab Mesin", "2026-10-05 19:10:44.541231"),
        (4, 2, "10:05:00.000000", "12:40:00.000000", "Praktik Simulasi CNC A02", "Dr. Ir. Andi Muhammad Irfan, ST., MT., IPM. & Ir. Labusab, S.Pd., M.T", "Lab Mesin", "2026-10-05 19:10:46.587320"),
        (5, 3, "07:30:00.000000", "10:05:00.000000", "Kecerdasan Buatan", "Dr. Ir. Muh. Ma'ruf Idris, S.T., M.T., M.M., IPM., ASEAN Eng., APEC Eng. & Sirwan, S.Pd.,M.Pd", "Lab Komputer", "2026-10-05 19:10:48.638273"),
        (6, 3, "10:05:00.000000", "12:40:00.000000", "Metodologi Penelitian", "Prof. Dr. Sapto Haryoko, M.Pd. & Prof. Dr. Purnamawati, M.Pd.", "Micro Teaching", "2026-10-05 19:10:50.675277"),
        (7, 4, "07:30:00.000000", "10:05:00.000000", "Kurikulum dan Pendidikan Kejuruan", "Prof. Dr. Darlan Sidik, M.Pd. & Prof. Dr. Sapto Haryoko, M.Pd", "Micro teaching", "2026-10-05 19:10:52.733877"),
        (8, 4, "14:50:00.000000", "17:50:00.000000", "Bimbingan Karir", "Mustamin, S.Pd., M.T., M.Pd. & Ir. Faisal Najamuddin, S.Pd., M.Eng., IPP", "Ek 103", "2026-10-05 19:10:54.774107")
    ]

    print("Menambahkan jadwal ke VPS...")
    cursor.executemany("INSERT INTO jadwal (id, hari, jam_mulai, jam_selesai, mata_kuliah, dosen, ruangan, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", data)
    
    conn.commit()
    conn.close()
    print("Berhasil menambahkan 8 jadwal perkuliahan ke VPS!")

if __name__ == "__main__":
    seed_vps_jadwal()
