import sqlite3

def update_dosen():
    updates = [
        # Selasa
        ("Praktik Robotika A01", "Prof. Yasser Abd Djawad, S.T., M.Sc., Ph.D & Ir. Muhammad Akil, S.Pd., M.T., IPM"),
        ("Praktik Robotika A02", "Ir. Muhammad Akil, S.Pd., M.T., IPM & Prof. Yasser Abd Djawad, S.T., M.Sc., Ph.D"),
        
        # Rabu
        ("Praktik Simulasi CNC A01", "Dr. Ir. Andi Muhammad Irfan, ST., MT., IPM. & Ir. Labusab, S.Pd., M.T"),
        ("Praktik Simulasi CNC A02", "Dr. Ir. Andi Muhammad Irfan, ST., MT., IPM. & Ir. Labusab, S.Pd., M.T"),
        
        # Kamis
        ("Kecerdasan Buatan", "Dr. Ir. Muh. Ma'ruf Idris, S.T., M.T., M.M., IPM., ASEAN Eng., APEC Eng. & Sirwan, S.Pd.,M.Pd"),
    ]
    
    # Custom ones that also need title change
    renames = [
        ("Metopen", "Metodologi Penelitian", "Prof. Dr. Sapto Haryoko, M.Pd. & Prof. Dr. Purnamawati, M.Pd."),
        ("Kurikulum & Pend. Kejuruan", "Kurikulum dan Pendidikan Kejuruan", "Prof. Dr. Darlan Sidik, M.Pd. & Prof. Dr. Sapto Haryoko, M.Pd"),
        ("Bimbingan Karir", "Bimbingan Karir", "Mustamin, S.Pd., M.T., M.Pd. & Ir. Faisal Najamuddin, S.Pd., M.Eng., IPP")
    ]

    conn = None
    try:
        conn = sqlite3.connect('database.db')
        cursor = conn.cursor()
        
        for old_nama, dosen in updates:
            cursor.execute("UPDATE jadwal SET dosen = ? WHERE mata_kuliah = ?", (dosen, old_nama))
            print(f"Updated {old_nama}")
            
        for old_nama, new_nama, dosen in renames:
            cursor.execute("UPDATE jadwal SET mata_kuliah = ?, dosen = ? WHERE mata_kuliah = ?", (new_nama, dosen, old_nama))
            print(f"Updated and renamed {old_nama} -> {new_nama}")
            
        conn.commit()
        print("Selesai mengupdate semua dosen dan matkul.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    update_dosen()
