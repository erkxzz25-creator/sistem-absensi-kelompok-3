# Flowchart Sistem Absensi Face Recognition

Berikut adalah flowchart logika sistem absensi yang dapat Anda gunakan untuk laporan atau skripsi Anda. Anda dapat mengambil *screenshot* (tangkapan layar) dari diagram di bawah ini.

```mermaid
flowchart TD
    Start([Mulai])
    InputCam[/Terima Frame Kamera/]
    ConvRGB[Konversi ke RGB Array]
    DetectFace[Deteksi Wajah]
    
    CheckFace{Wajah Ditemukan?}
    
    ExtractFeat[Ekstraksi 128-d Feature]
    FetchDB[(Ambil Data Database)]
    CalcDist[Hitung Euclidean Distance]
    FindMin[Cari Minimum Distance]
    
    CheckDist{Distance <= 0.45?}
    
    CheckAbsen{Sudah Absen?}
    
    SaveDB[(Simpan ke Database)]
    
    ResNoFace[Error: Tidak Ada Wajah]
    ResUnk[Error: Wajah Tidak Dikenali]
    ResDup[Error: Sudah Absen]
    ResSuccess[Sukses: Berhasil Absen]
    
    End([Selesai])

    Start --> InputCam
    InputCam --> ConvRGB
    ConvRGB --> DetectFace
    DetectFace --> CheckFace
    
    CheckFace -- Ya --> ExtractFeat
    CheckFace -- Tidak --> ResNoFace
    
    ExtractFeat --> FetchDB
    FetchDB --> CalcDist
    CalcDist --> FindMin
    FindMin --> CheckDist
    
    CheckDist -- Ya --> CheckAbsen
    CheckDist -- Tidak --> ResUnk
    
    CheckAbsen -- Tidak --> SaveDB
    CheckAbsen -- Ya --> ResDup
    
    SaveDB --> ResSuccess
    
    ResNoFace --> End
    ResUnk --> End
    ResDup --> End
    ResSuccess --> End
```
