import urllib.request
import urllib.parse
import json

API_URL = "http://localhost:5000/api/jadwal"

jadwal_data = [
    # Selasa (1) (Already added)
    # {"hari": 1, "jam_mulai": "07:30", "jam_selesai": "10:05", "mata_kuliah": "Praktik Robotika A01", "dosen": "Prof yasser & bapak akil", "ruangan": "Lab Digital"},
    {"hari": 1, "jam_mulai": "10:05", "jam_selesai": "12:40", "mata_kuliah": "Praktik Robotika A02", "dosen": "bapak akil & Prof yasser", "ruangan": "Lab Digital"},
    
    # Rabu (2)
    {"hari": 2, "jam_mulai": "07:30", "jam_selesai": "10:05", "mata_kuliah": "Praktik Simulasi CNC A01", "dosen": "Pak andi muh irfan & Pak Labusab", "ruangan": "Lab Mesin"},
    {"hari": 2, "jam_mulai": "10:05", "jam_selesai": "12:40", "mata_kuliah": "Praktik Simulasi CNC A02", "dosen": "Pak andi muh irfan & Pak Labusab", "ruangan": "Lab Mesin"},
    
    # Kamis (3)
    {"hari": 3, "jam_mulai": "07:30", "jam_selesai": "10:05", "mata_kuliah": "Kecerdasan Buatan", "dosen": "Prof ma'ruf idris & Pak sirwan", "ruangan": "Lab Komputer"},
    {"hari": 3, "jam_mulai": "10:05", "jam_selesai": "12:40", "mata_kuliah": "Metopen", "dosen": "Prof sapto & Prof Pur", "ruangan": "Micro Teaching"},
    
    # Jumat (4)
    {"hari": 4, "jam_mulai": "07:30", "jam_selesai": "10:05", "mata_kuliah": "Kurikulum & Pend. Kejuruan", "dosen": "Prof darlan & Prof Sapto", "ruangan": "Micro teaching"},
    {"hari": 4, "jam_mulai": "14:50", "jam_selesai": "17:50", "mata_kuliah": "Bimbingan Karir", "dosen": "Pak mustamin & Pak faisal", "ruangan": "Ek 103"}
]

for jadwal in jadwal_data:
    try:
        data = json.dumps(jadwal).encode('utf-8')
        req = urllib.request.Request(API_URL, data=data, headers={'Content-Type': 'application/json'}, method='POST')
        
        with urllib.request.urlopen(req) as response:
            if response.getcode() == 201:
                print(f"Berhasil menambah jadwal: {jadwal['mata_kuliah']} ({jadwal['jam_mulai']}-{jadwal['jam_selesai']})")
            else:
                print(f"Gagal menambah {jadwal['mata_kuliah']}")
    except Exception as e:
        print(f"Error request {jadwal['mata_kuliah']}: {e}")

print("\nSemua jadwal selesai diproses!")
