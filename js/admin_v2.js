// ============================================================
// FaceSync Admin Panel v2 — Jadwal Kuliah Otomatis
// ============================================================

// ============================================================
// Application State
// ============================================================
const state = {
    currentView: 'dashboard',
    cameraStream: null,
    registrationImages: [],
    maxRegistrationImages: 5
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
    'dashboard': { title: 'Dashboard', subtitle: 'Ringkasan sistem absensi Anda' },
    'jadwal': { title: 'Jadwal Kuliah Pendidikan Vokasional Mekatronika 24', subtitle: 'Atur jadwal mingguan berulang' },
    'riwayat': { title: 'Riwayat Pertemuan', subtitle: 'Pertemuan yang dibuat otomatis oleh sistem' },
    'students': { title: 'Data Mahasiswa', subtitle: 'Kelola data mahasiswa terdaftar' },
    'face-registration': { title: 'Registrasi Wajah', subtitle: 'Daftarkan data wajah mahasiswa baru' }
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

        // Cleanup saat meninggalkan view
        if (state.currentView === 'face-registration' && targetId !== 'face-registration') {
            stopCamera('reg-webcam', 'reg-camera-placeholder');
        }

        state.currentView = targetId;

        // Load data
        if (targetId === 'dashboard') loadDashboard();
        if (targetId === 'jadwal') loadJadwal();
        if (targetId === 'riwayat') loadRiwayat();
        if (targetId === 'students') loadStudents();
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
// Dashboard
// ============================================================
async function loadDashboard() {
    const statsRes = await apiFetch('/api/dashboard/stats');
    if (statsRes.success) {
        const d = statsRes.data;
        const statNumbers = document.querySelectorAll('#dashboard .stat-number');
        if (statNumbers[0]) statNumbers[0].textContent = d.total_students;
        if (statNumbers[1]) statNumbers[1].textContent = d.avg_attendance + '%';
        if (statNumbers[2]) statNumbers[2].textContent = d.total_sessions;
        if (statNumbers[3]) statNumbers[3].textContent = d.total_jadwal || 0;
    }

    const recentRes = await apiFetch('/api/dashboard/recent');
    if (recentRes.success) {
        const sessionList = document.querySelector('#dashboard .session-list');
        if (sessionList) {
            if (recentRes.data.length === 0) {
                sessionList.innerHTML = '<p class="text-muted" style="text-align:center; padding:2rem;">Belum ada pertemuan.</p>';
            } else {
                sessionList.innerHTML = recentRes.data.map(s => {
                    const d = new Date(s.tanggal);
                    const day = d.getDate();
                    const month = d.toLocaleString('id-ID', { month: 'short' });
                    const statusClass = s.status_sesi === 'buka' ? 'active' : 'closed';
                    const statusText = s.status_sesi === 'buka' ? 'Aktif' : 'Selesai';
                    return `
                        <div class="session-item">
                            <div class="session-date"><span class="day">${day}</span><span class="month">${month}</span></div>
                            <div class="session-info"><h4>${s.judul}</h4><p>${s.jam_mulai} - ${s.jam_selesai} WIB</p></div>
                            <div class="session-status ${statusClass}">${statusText}</div>
                            <div class="session-attendance">${s.hadir_count}/${s.total_students}</div>
                        </div>
                    `;
                }).join('');
            }
        }
    }
}


// ============================================================
// Jadwal Kuliah (NEW)
// ============================================================
const HARI_NAMA = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

async function loadJadwal() {
    const res = await apiFetch('/api/jadwal');
    if (!res.success) return;

    const container = document.getElementById('jadwal-container');
    if (!container) return;

    if (res.data.length === 0) {
        container.innerHTML = `
            <div class="glass-card" style="text-align:center; padding:3rem;">
                <i class="ri-calendar-close-line" style="font-size:3rem; color:var(--text-muted); margin-bottom:1rem;"></i>
                <p class="text-muted">Belum ada jadwal kuliah. Klik "Tambah Jadwal" untuk memulai.</p>
            </div>
        `;
        return;
    }

    // Kelompokkan jadwal per hari
    const grouped = {};
    for (const j of res.data) {
        if (!grouped[j.hari]) grouped[j.hari] = [];
        grouped[j.hari].push(j);
    }

    let html = '';
    for (const [hari, items] of Object.entries(grouped)) {
        const hariNama = HARI_NAMA[parseInt(hari)];
        html += `
            <div class="jadwal-day-group glass-card">
                <div class="jadwal-day-header">
                    <i class="ri-calendar-event-fill"></i>
                    <h3>${hariNama}</h3>
                </div>
                <div class="jadwal-items">
        `;

        for (const item of items) {
            html += `
                <div class="jadwal-item">
                    <div class="jadwal-time">
                        <span class="time-start">${item.jam_mulai}</span>
                        <span class="time-divider">—</span>
                        <span class="time-end">${item.jam_selesai}</span>
                    </div>
                    <div class="jadwal-details">
                        <h4>${item.mata_kuliah}</h4>
                        <div class="jadwal-meta">
                            ${item.dosen ? `<span><i class="ri-user-star-line"></i> ${item.dosen}</span>` : ''}
                            ${item.ruangan ? `<span><i class="ri-map-pin-line"></i> ${item.ruangan}</span>` : ''}
                        </div>
                    </div>
                    <div class="jadwal-actions">
                        <button class="icon-btn-small" title="Edit" onclick='editJadwal(${JSON.stringify(item)})'>
                            <i class="ri-pencil-line"></i>
                        </button>
                        <button class="icon-btn-small danger" title="Hapus" onclick="deleteJadwal(${item.id}, '${item.mata_kuliah.replace(/'/g, "\\'")}')">
                            <i class="ri-delete-bin-line"></i>
                        </button>
                    </div>
                </div>
            `;
        }

        html += `</div></div>`;
    }

    container.innerHTML = html;
}

// Modal Jadwal
let editingJadwalId = null;

window.showJadwalModal = function(data = null) {
    editingJadwalId = data ? data.id : null;
    document.getElementById('jadwal-modal').style.display = 'flex';

    // Update modal title
    const modalTitle = document.querySelector('#jadwal-modal .modal-header h2');
    if (modalTitle) {
        modalTitle.innerHTML = editingJadwalId
            ? '<i class="ri-pencil-line"></i> Edit Jadwal Kuliah'
            : '<i class="ri-calendar-event-line"></i> Tambah Jadwal Kuliah';
    }

    // Fill or reset form
    document.getElementById('jadwal-hari').value = data ? data.hari : '0';
    document.getElementById('jadwal-mulai').value = data ? data.jam_mulai : '07:30';
    document.getElementById('jadwal-selesai').value = data ? data.jam_selesai : '10:05';
    document.getElementById('jadwal-matkul').value = data ? data.mata_kuliah : '';
    document.getElementById('jadwal-dosen').value = data ? (data.dosen || '') : '';
    document.getElementById('jadwal-ruangan').value = data ? (data.ruangan || '') : '';

    // Update save button text
    const saveBtn = document.getElementById('btn-save-jadwal');
    saveBtn.innerHTML = editingJadwalId
        ? '<i class="ri-save-line"></i> Simpan Perubahan'
        : '<i class="ri-save-line"></i> Simpan Jadwal';
};

window.editJadwal = function(jadwalData) {
    showJadwalModal(jadwalData);
};

window.closeJadwalModal = function(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('jadwal-modal').style.display = 'none';
    editingJadwalId = null;
};

window.saveJadwal = async function() {
    const hari = document.getElementById('jadwal-hari').value;
    const jam_mulai = document.getElementById('jadwal-mulai').value;
    const jam_selesai = document.getElementById('jadwal-selesai').value;
    const mata_kuliah = document.getElementById('jadwal-matkul').value.trim();
    const dosen = document.getElementById('jadwal-dosen').value.trim();
    const ruangan = document.getElementById('jadwal-ruangan').value.trim();

    if (!mata_kuliah || !jam_mulai || !jam_selesai) {
        app.showToast('Mata kuliah, jam mulai, dan jam selesai wajib diisi.', 'error');
        return;
    }

    const btn = document.getElementById('btn-save-jadwal');
    btn.disabled = true;
    btn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Menyimpan...';

    const isEditing = editingJadwalId !== null;
    const url = isEditing ? `/api/jadwal/${editingJadwalId}` : '/api/jadwal';
    const method = isEditing ? 'PUT' : 'POST';

    const res = await apiFetch(url, {
        method: method,
        body: JSON.stringify({ hari, jam_mulai, jam_selesai, mata_kuliah, dosen, ruangan })
    });

    btn.disabled = false;
    btn.innerHTML = isEditing
        ? '<i class="ri-save-line"></i> Simpan Perubahan'
        : '<i class="ri-save-line"></i> Simpan Jadwal';

    if (res.success) {
        app.showToast(res.message, 'success');
        closeJadwalModal();
        loadJadwal();
    } else {
        app.showToast(res.message || 'Gagal menyimpan jadwal.', 'error');
    }
};

window.deleteJadwal = async function(id, nama) {
    if (!confirm(`Yakin ingin menghapus jadwal "${nama}"?`)) return;
    const res = await apiFetch(`/api/jadwal/${id}`, { method: 'DELETE' });
    if (res.success) {
        app.showToast(res.message, 'success');
        loadJadwal();
    }
};


// ============================================================
// Riwayat Pertemuan (Renamed from Sessions)
// ============================================================
async function loadRiwayat() {
    const res = await apiFetch('/api/sessions');
    if (res.success) {
        const tbody = document.querySelector('#riwayat .data-table tbody');
        if (!tbody) return;

        if (res.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem;" class="text-muted">Belum ada riwayat pertemuan. Pertemuan dibuat otomatis saat jadwal berlangsung.</td></tr>';
        } else {
            tbody.innerHTML = res.data.map(s => {
                const badgeClass = s.status_sesi === 'buka' ? 'badge-success' : 'badge-neutral';
                const badgeText = s.status_sesi === 'buka' ? 'Aktif' : 'Selesai';

                return `
                    <tr style="cursor:pointer;" onclick="viewSessionDetail(${s.id})">
                        <td data-label="Mata Kuliah">${s.judul}</td>
                        <td data-label="Tanggal">${s.tanggal}</td>
                        <td data-label="Waktu">${s.jam_mulai} - ${s.jam_selesai}</td>
                        <td data-label="Status"><span class="badge ${badgeClass}">${badgeText}</span></td>
                        <td data-label="Hadir">${s.hadir_count}/${s.total_students}</td>
                        <td>
                            <button class="icon-btn-small" title="Detail" onclick="event.stopPropagation(); viewSessionDetail(${s.id})"><i class="ri-eye-line"></i></button>
                            <button class="icon-btn-small" title="Ekspor" onclick="event.stopPropagation(); exportSession(${s.id})"><i class="ri-download-2-line"></i></button>
                            <button class="icon-btn-small danger" title="Hapus" onclick="event.stopPropagation(); deleteSession(${s.id})"><i class="ri-delete-bin-line"></i></button>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }
}

window.deleteSession = async function(id) {
    if (!confirm('Yakin ingin menghapus pertemuan ini beserta semua data absensinya?')) return;
    const res = await apiFetch(`/api/sessions/${id}`, { method: 'DELETE' });
    if (res.success) { app.showToast(res.message, 'success'); loadRiwayat(); }
};

window.exportSession = function(id) {
    window.open(`${API_BASE}/api/export/${id}`, '_blank');
};

window.viewSessionDetail = async function(id) {
    const modal = document.getElementById('session-detail-modal');
    const infoGrid = document.getElementById('detail-info-grid');
    const attendanceList = document.getElementById('detail-attendance-list');
    const hadirCount = document.getElementById('detail-hadir-count');
    const detailTitle = document.getElementById('detail-title');

    // Show modal with loading state
    modal.style.display = 'flex';
    infoGrid.innerHTML = '<p class="text-muted" style="text-align:center;padding:1rem;">Memuat data...</p>';
    attendanceList.innerHTML = '';

    const res = await apiFetch(`/api/sessions/${id}/attendance`);
    if (!res.success) {
        infoGrid.innerHTML = '<p class="text-muted" style="text-align:center;padding:1rem;">Gagal memuat data.</p>';
        return;
    }

    const session = res.session;
    const records = res.data;
    const totalHadir = res.total_hadir;

    // Update title
    detailTitle.textContent = session.judul || 'Detail Pertemuan';

    // Format date nicely
    const dateObj = new Date(session.tanggal);
    const tanggalFormatted = dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const statusClass = session.status_sesi === 'buka' ? 'badge-success' : 'badge-neutral';
    const statusText = session.status_sesi === 'buka' ? 'Aktif' : 'Selesai';

    // Render info cards
    infoGrid.innerHTML = `
        <div class="detail-info-card">
            <div class="detail-info-icon"><i class="ri-calendar-line"></i></div>
            <div class="detail-info-text">
                <span class="detail-info-label">Tanggal</span>
                <span class="detail-info-value">${tanggalFormatted}</span>
            </div>
        </div>
        <div class="detail-info-card">
            <div class="detail-info-icon"><i class="ri-time-line"></i></div>
            <div class="detail-info-text">
                <span class="detail-info-label">Waktu</span>
                <span class="detail-info-value">${session.jam_mulai} - ${session.jam_selesai} WIB</span>
            </div>
        </div>
        <div class="detail-info-card">
            <div class="detail-info-icon"><i class="ri-map-pin-line"></i></div>
            <div class="detail-info-text">
                <span class="detail-info-label">Ruangan</span>
                <span class="detail-info-value">${session.ruangan || '-'}</span>
            </div>
        </div>
        <div class="detail-info-card">
            <div class="detail-info-icon"><i class="ri-shield-check-line"></i></div>
            <div class="detail-info-text">
                <span class="detail-info-label">Status</span>
                <span class="badge ${statusClass}">${statusText}</span>
            </div>
        </div>
    `;

    // Render attendance count
    hadirCount.textContent = `${totalHadir} Hadir`;

    // Render attendance list
    if (records.length === 0) {
        attendanceList.innerHTML = `
            <div class="detail-empty-state">
                <i class="ri-user-unfollow-line"></i>
                <p>Belum ada mahasiswa yang absen pada pertemuan ini.</p>
            </div>
        `;
    } else {
        attendanceList.innerHTML = records.map((r, index) => {
            const waktu = r.waktu_absen ? new Date(r.waktu_absen).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-';
            const confidence = r.confidence_score ? (r.confidence_score * 100).toFixed(1) + '%' : '-';
            const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(r.mahasiswa_nama || 'U')}&background=random&size=40`;

            return `
                <div class="detail-attendance-item">
                    <div class="detail-attendance-num">${index + 1}</div>
                    <img src="${avatarUrl}" class="detail-attendance-avatar" alt="">
                    <div class="detail-attendance-info">
                        <span class="detail-attendance-name">${r.mahasiswa_nama || '-'}</span>
                        <span class="detail-attendance-nim">${r.mahasiswa_nim || '-'}</span>
                    </div>
                    <div class="detail-attendance-meta">
                        <span class="detail-attendance-time"><i class="ri-time-line"></i> ${waktu}</span>
                        <span class="detail-attendance-confidence"><i class="ri-shield-star-line"></i> ${confidence}</span>
                    </div>
                    <span class="badge badge-success"><i class="ri-check-line"></i> Hadir</span>
                </div>
            `;
        }).join('');
    }
};

window.closeSessionDetail = function(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('session-detail-modal').style.display = 'none';
};


// ============================================================
// Students (Mahasiswa) — Unchanged
// ============================================================
async function loadStudents() {
    const res = await apiFetch('/api/students');
    if (res.success) {
        const tbody = document.querySelector('#students .data-table tbody');
        if (!tbody) return;

        if (res.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2rem;" class="text-muted">Belum ada mahasiswa terdaftar.</td></tr>';
        } else {
            tbody.innerHTML = res.data.map(s => {
                const faceClass = s.has_face_data ? 'badge-success' : 'badge-warning';
                const faceIcon = s.has_face_data ? 'ri-check-line' : 'ri-error-warning-line';
                const faceText = s.has_face_data ? 'Terdaftar' : 'Belum Ada';
                const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(s.nama)}&background=random`;

                return `
                    <tr>
                        <td data-label="NIM">${s.nim}</td>
                        <td data-label="Nama">
                            <div class="student-name-cell">
                                <img src="${avatarUrl}" class="avatar-small">
                                <span>${s.nama}</span>
                            </div>
                        </td>
                        <td data-label="Kelas">${s.kelas}</td>
                        <td data-label="Wajah"><span class="badge ${faceClass}"><i class="${faceIcon}"></i> ${faceText}</span></td>
                        <td>
                            <button class="icon-btn-small danger" title="Hapus" onclick="deleteStudent(${s.id}, '${s.nama.replace(/'/g, "\\'")}')"><i class="ri-delete-bin-line"></i></button>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }
}

window.deleteStudent = async function(id, nama) {
    if (!confirm(`Yakin ingin menghapus data mahasiswa "${nama}"?`)) return;
    const res = await apiFetch(`/api/students/${id}`, { method: 'DELETE' });
    if (res.success) { app.showToast(res.message, 'success'); loadStudents(); }
};


// ============================================================
// Camera Utility — Unchanged
// ============================================================
async function startCamera(videoElementId, placeholderId) {
    const video = document.getElementById(videoElementId);
    const placeholder = document.getElementById(placeholderId);
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" } });
        video.srcObject = stream;
        video.style.display = 'block';
        placeholder.style.display = 'none';
        state.cameraStream = stream;
        return true;
    } catch (err) {
        app.showToast('Tidak dapat mengakses kamera. Harap berikan izin akses.', 'error');
        return false;
    }
}

function stopCamera(videoElementId, placeholderId) {
    if (state.cameraStream) {
        state.cameraStream.getTracks().forEach(track => track.stop());
        state.cameraStream = null;
    }
    const video = document.getElementById(videoElementId);
    const placeholder = document.getElementById(placeholderId);
    if (video) { video.style.display = 'none'; video.srcObject = null; }
    if (placeholder) placeholder.style.display = 'flex';
}

function captureFrame(videoElementId) {
    const video = document.getElementById(videoElementId);
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d').drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.8);
}


// ============================================================
// Face Registration — Unchanged
// ============================================================
const btnProceedCapture = document.getElementById('btn-proceed-capture');
const regCaptureSection = document.getElementById('reg-capture-section');
const btnCapturePhoto = document.getElementById('btn-capture-photo');
const btnSaveRegistration = document.getElementById('btn-save-registration');
const captureProgressBar = document.getElementById('capture-progress-bar');
const captureCountText = document.getElementById('capture-count');

if (btnProceedCapture) {
    btnProceedCapture.addEventListener('click', async () => {
        const nim = document.getElementById('reg-nim').value.trim();
        const name = document.getElementById('reg-name').value.trim();

        if (!nim || !name) {
            app.showToast('Harap isi NIM dan Nama terlebih dahulu.', 'warning');
            return;
        }

        regCaptureSection.classList.remove('disabled');
        const started = await startCamera('reg-webcam', 'reg-camera-placeholder');
        if (started) {
            state.registrationImages = [];
            btnCapturePhoto.disabled = false;
            captureProgressBar.style.width = '0%';
            captureCountText.textContent = `0/${state.maxRegistrationImages}`;
            app.showToast('Kamera siap. Harap lihat ke depan dan ambil foto.', 'info');
        }
    });
}

if (btnCapturePhoto) {
    btnCapturePhoto.addEventListener('click', () => {
        if (state.registrationImages.length < state.maxRegistrationImages) {
            const video = document.getElementById('reg-webcam');
            video.style.opacity = '0.3';
            setTimeout(() => video.style.opacity = '1', 100);

            const frameData = captureFrame('reg-webcam');
            state.registrationImages.push(frameData);

            const count = state.registrationImages.length;
            const percentage = (count / state.maxRegistrationImages) * 100;
            captureProgressBar.style.width = `${percentage}%`;
            captureCountText.textContent = `${count}/${state.maxRegistrationImages}`;
            app.showToast(`Foto ${count} berhasil diambil.`);

            if (count >= state.maxRegistrationImages) {
                btnCapturePhoto.style.display = 'none';
                btnSaveRegistration.style.display = 'block';
                stopCamera('reg-webcam', 'reg-camera-placeholder');
                document.getElementById('reg-camera-placeholder').innerHTML = `
                    <i class="ri-check-double-line text-success"></i>
                    <p class="text-success">Semua foto berhasil diambil!</p>
                `;
            }
        }
    });
}

if (btnSaveRegistration) {
    btnSaveRegistration.addEventListener('click', async () => {
        const nim = document.getElementById('reg-nim').value.trim();
        const nama = document.getElementById('reg-name').value.trim();
        const kelas = document.getElementById('reg-class').value.trim();

        if (!nim || !nama || !kelas) { app.showToast('Harap lengkapi semua field.', 'warning'); return; }

        btnSaveRegistration.disabled = true;
        btnSaveRegistration.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Menyimpan...';

        const res = await apiFetch('/api/students/register', {
            method: 'POST',
            body: JSON.stringify({ nim, nama, kelas, images: state.registrationImages })
        });

        btnSaveRegistration.disabled = false;
        btnSaveRegistration.innerHTML = '<i class="ri-save-line"></i> Simpan Data Wajah';

        if (res.success) {
            app.showToast(res.message, 'success');
            setTimeout(() => {
                document.getElementById('reg-nim').value = '';
                document.getElementById('reg-name').value = '';
                document.getElementById('reg-class').value = '';
                regCaptureSection.classList.add('disabled');
                btnCapturePhoto.style.display = 'block';
                btnCapturePhoto.disabled = true;
                btnSaveRegistration.style.display = 'none';
                state.registrationImages = [];
                captureProgressBar.style.width = '0%';
                captureCountText.textContent = '0/5';
                document.getElementById('reg-camera-placeholder').innerHTML = `<i class="ri-camera-off-line"></i><p>Isi form untuk mengaktifkan kamera</p>`;
                app.navigateTo('students');
            }, 1500);
        } else {
            app.showToast(res.message || 'Gagal menyimpan data.', 'error');
        }
    });
}


// ============================================================
// Initial Load
// ============================================================
loadDashboard();
