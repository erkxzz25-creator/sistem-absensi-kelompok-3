// ============================================================
// FaceSync User Portal v2 — Auto Camera + Auto Absen
// ============================================================

// ============================================================
// Application State
// ============================================================
const state = {
    currentView: 'live-attendance',
    cameraStream: null,
    isScanning: false,
    isRecognizing: false,
    activeSessionId: null,
    presentCount: 0,
    recognitionInterval: null,
    sessionCheckInterval: null
};

const API_BASE = '';

// DOM Elements
const navItems = document.querySelectorAll('.nav-item');
const views = document.querySelectorAll('.view');
const pageTitle = document.getElementById('current-page-title');
const pageSubtitle = document.getElementById('current-page-subtitle');
const toastContainer = document.getElementById('toast-container');

// Page Metadata
const pageMeta = {
    'live-attendance': { title: 'Absensi Wajah', subtitle: 'Deteksi wajah otomatis secara real-time' },
    'student-history': { title: 'Riwayat Absen', subtitle: 'Pengecekan absensi mandiri' }
};

// ============================================================
// Navigation & UI Logic
// ============================================================
window.app = {
    navigateTo: function(targetId) {
        navItems.forEach(item => {
            item.classList.toggle('active', item.dataset.target === targetId);
        });

        views.forEach(view => {
            view.classList.toggle('active', view.id === targetId);
        });

        if (pageMeta[targetId]) {
            pageTitle.textContent = pageMeta[targetId].title;
            pageSubtitle.textContent = pageMeta[targetId].subtitle;
        }

        // Cleanup saat meninggalkan view tertentu
        if (state.currentView === 'live-attendance' && targetId !== 'live-attendance') {
            stopScanning();
        }

        // Re-init saat kembali ke live attendance
        if (targetId === 'live-attendance') {
            checkActiveSession();
        }

        state.currentView = targetId;
    },

    showToast: function(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        let icon = type === 'success' ? 'ri-check-line' : type === 'error' ? 'ri-error-warning-line' : 'ri-information-line';
        toast.innerHTML = `<i class="${icon}"></i><span>${message}</span>`;
        toastContainer.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
    }
};


// ============================================================
// API Helper
// ============================================================
async function apiFetch(url, options = {}) {
    try {
        const res = await fetch(API_BASE + url, { headers: { 'Content-Type': 'application/json' }, ...options });
        return await res.json();
    } catch (err) {
        app.showToast('Gagal menghubungi server.', 'error');
        return { success: false };
    }
}


// ============================================================
// Camera Utility
// ============================================================
async function startCamera() {
    const video = document.getElementById('webcam-feed');
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480, facingMode: "user" }
        });
        video.srcObject = stream;
        video.style.display = 'block';
        state.cameraStream = stream;
        return true;
    } catch (err) {
        app.showToast('Tidak dapat mengakses kamera. Harap berikan izin akses.', 'error');
        return false;
    }
}

function stopCamera() {
    if (state.cameraStream) {
        state.cameraStream.getTracks().forEach(track => track.stop());
        state.cameraStream = null;
    }
    const video = document.getElementById('webcam-feed');
    if (video) { video.style.display = 'none'; video.srcObject = null; }
}

function captureFrame() {
    const video = document.getElementById('webcam-feed');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d').drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.8);
}


// ============================================================
// Auto Session Detection
// ============================================================
async function checkActiveSession() {
    const res = await apiFetch('/api/active-session');
    if (!res.success) return;

    const classInfoBanner = document.getElementById('class-info-banner');
    const noClassState = document.getElementById('no-class-state');
    const attendanceContainer = document.getElementById('attendance-container');

    if (res.active) {
        // Ada kelas yang sedang berlangsung!
        const jadwal = res.jadwal;
        const session = res.session;

        // Tampilkan info kelas
        document.getElementById('current-matkul').textContent = jadwal.mata_kuliah;
        document.getElementById('current-dosen').textContent = jadwal.dosen || '-';
        document.getElementById('current-ruangan').textContent = jadwal.ruangan || '-';
        document.getElementById('current-waktu').textContent = `${jadwal.jam_mulai} - ${jadwal.jam_selesai} WIB`;
        document.getElementById('live-hadir-count').textContent = `${res.hadir_count} Hadir`;
        document.getElementById('session-title-header').textContent = jadwal.mata_kuliah;

        classInfoBanner.style.display = 'flex';
        noClassState.style.display = 'none';
        attendanceContainer.style.display = 'grid';

        // Simpan session ID dan mulai scanning
        state.activeSessionId = session.id;
        state.presentCount = res.hadir_count;
        document.getElementById('present-count').textContent = `${res.hadir_count} Hadir`;

        // Auto-start kamera dan mulai scanning
        if (!state.cameraStream) {
            const started = await startCamera();
            if (started) {
                startScanning();
            }
        } else if (!state.isScanning) {
            startScanning();
        }
    } else {
        // Tidak ada kelas saat ini
        classInfoBanner.style.display = 'none';
        attendanceContainer.style.display = 'none';
        noClassState.style.display = 'flex';

        // Tampilkan info jadwal berikutnya
        if (res.next_jadwal) {
            const nj = res.next_jadwal;
            document.getElementById('next-class-info').textContent =
                `Jadwal berikutnya: ${nj.hari_nama}, ${nj.jam_mulai} - ${nj.jam_selesai} (${nj.mata_kuliah})`;
        } else {
            document.getElementById('next-class-info').textContent = 'Belum ada jadwal kuliah yang diatur.';
        }

        stopScanning();
        state.activeSessionId = null;
    }
}


// ============================================================
// Recognition Scanning Loop
// ============================================================
function startScanning() {
    if (state.isScanning) return;
    state.isScanning = true;

    state.recognitionInterval = setInterval(async () => {
        if (!state.isScanning || state.isRecognizing || !state.cameraStream) return;
        state.isRecognizing = true;

        try {
            const frameData = captureFrame();
            const res = await apiFetch('/api/recognize', {
                method: 'POST',
                body: JSON.stringify({
                    image: frameData,
                    session_id: state.activeSessionId
                })
            });

            if (res.success && res.results) {
                for (const result of res.results) {
                    if (result.recognized && !result.already_recorded) {
                        // Absensi berhasil dicatat!
                        showSuccessOverlay(result.student.nama, result.message);
                        addLogEntry(
                            result.student.nama,
                            result.student.nim,
                            new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
                        );
                        playNotificationSound();
                        // Update counter
                        updateHadirCount();
                    } else if (result.recognized && result.already_recorded) {
                        // Sudah tercatat hadir
                        showAlreadyOverlay(result.student.nama);
                    }
                }
            }
        } catch (err) {
            // Silently ignore fetch errors during scanning
        } finally {
            state.isRecognizing = false;
        }
    }, 3000); // Scan setiap 3 detik
}

function stopScanning() {
    state.isScanning = false;
    if (state.recognitionInterval) {
        clearInterval(state.recognitionInterval);
        state.recognitionInterval = null;
    }
    stopCamera();
}

function updateHadirCount() {
    state.presentCount++;
    const countLabel = document.getElementById('present-count');
    const liveCount = document.getElementById('live-hadir-count');
    if (countLabel) countLabel.textContent = `${state.presentCount} Hadir`;
    if (liveCount) liveCount.textContent = `${state.presentCount} Hadir`;
}


// ============================================================
// Success & Already Overlays
// ============================================================
function showSuccessOverlay(studentName, message) {
    const overlay = document.getElementById('success-overlay');
    document.getElementById('success-student-name').textContent = studentName;

    const matkulEl = document.getElementById('current-matkul');
    document.getElementById('success-matkul-name').textContent = matkulEl ? matkulEl.textContent : '';

    overlay.style.display = 'flex';

    // Pause scanning selama overlay ditampilkan
    state.isScanning = false;

    setTimeout(() => {
        overlay.style.display = 'none';
        state.isScanning = true; // Resume scanning
    }, 4000);
}

function showAlreadyOverlay(studentName) {
    const overlay = document.getElementById('already-overlay');
    document.getElementById('already-student-name').textContent = studentName;
    overlay.style.display = 'flex';

    state.isScanning = false;

    setTimeout(() => {
        overlay.style.display = 'none';
        state.isScanning = true;
    }, 3000);
}


// ============================================================
// Notification Sound
// ============================================================
function playNotificationSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        // Nada sukses (dua nada ascending)
        oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime);       // C5
        oscillator.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.15); // E5
        oscillator.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.3);  // G5

        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
        // Audio not supported, ignore
    }
}


// ============================================================
// Log Entry
// ============================================================
function addLogEntry(name, nim, time) {
    const logList = document.getElementById('recognition-log-list');
    const emptyState = logList.querySelector('.empty-state');
    if (emptyState) emptyState.remove();

    const logItem = document.createElement('div');
    logItem.className = 'log-item';
    logItem.innerHTML = `
        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random" class="avatar-small">
        <div class="log-info"><div class="log-name">${name}</div><div class="log-nim">${nim}</div></div>
        <div class="log-time">${time}</div>
        <span class="badge badge-success"><i class="ri-check-line"></i></span>
    `;
    logList.insertBefore(logItem, logList.firstChild);

    if (logList.children.length > 10) logList.removeChild(logList.lastChild);
}


// ============================================================
// Student History (unchanged)
// ============================================================
const btnCheckHistory = document.getElementById('btn-check-history');
const historyResults = document.getElementById('history-results');

if (btnCheckHistory) {
    btnCheckHistory.addEventListener('click', async () => {
        const nim = document.getElementById('history-nim').value.trim();
        if (!nim) { app.showToast('Harap masukkan NIM yang valid.', 'warning'); return; }

        btnCheckHistory.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Mengecek...';
        btnCheckHistory.disabled = true;

        const res = await apiFetch(`/api/history/${nim}`);

        btnCheckHistory.innerHTML = 'Cek Riwayat';
        btnCheckHistory.disabled = false;

        if (res.success) {
            const d = res.data;
            const student = d.student;
            const profileHeader = document.querySelector('.student-profile-header');
            
            if (profileHeader) {
                profileHeader.querySelector('img').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(student.nama)}&background=6366f1&color=fff&size=80`;
                profileHeader.querySelector('.profile-info h2').textContent = student.nama;
                profileHeader.querySelector('.profile-info p').textContent = `NIM: ${student.nim} | Kelas: ${student.kelas}`;

                const summaryValues = profileHeader.querySelectorAll('.summary-item .value');
                if (summaryValues[0]) summaryValues[0].textContent = d.total_sessions;
                if (summaryValues[1]) summaryValues[1].textContent = d.total_hadir;
                if (summaryValues[2]) summaryValues[2].textContent = d.rate + '%';
            }

            const tbody = document.querySelector('#history-results .data-table tbody');
            if (tbody) {
                if (d.history.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:2rem;" class="text-muted">Belum ada riwayat kehadiran.</td></tr>';
                } else {
                    tbody.innerHTML = d.history.map(h => {
                        const badgeClass = h.status === 'hadir' ? 'badge-success' : 'badge-danger';
                        const statusText = h.status === 'hadir' ? 'Hadir' : 'Alpa';
                        return `
                            <tr>
                                <td>${h.tanggal}</td>
                                <td>${h.pertemuan_judul}</td>
                                <td>${h.waktu_absen}</td>
                                <td><span class="badge ${badgeClass}">${statusText}</span></td>
                            </tr>
                        `;
                    }).join('');
                }
            }
            historyResults.style.display = 'block';
            historyResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            historyResults.style.display = 'none';
            app.showToast(res.message || 'Mahasiswa tidak ditemukan.', 'error');
        }
    });
}


// ============================================================
// Initialization: Auto-start pada saat halaman dibuka
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    // Langsung cek sesi aktif saat halaman dibuka
    checkActiveSession();

    // Polling setiap 30 detik untuk mendeteksi perubahan jadwal
    state.sessionCheckInterval = setInterval(() => {
        if (state.currentView === 'live-attendance') {
            checkActiveSession();
        }
    }, 30000);
});
