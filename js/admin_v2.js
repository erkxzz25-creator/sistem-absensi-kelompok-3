// Initialize script
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
        'sessions': { title: 'Kelola Pertemuan', subtitle: 'Buat dan pantau sesi kelas' },
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
            if (targetId === 'sessions') loadSessions();
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
    // Sessions (Pertemuan)
    // ============================================================
    async function loadSessions() {
        const res = await apiFetch('/api/sessions');
        if (res.success) {
            const tbody = document.querySelector('#sessions .data-table tbody');
            if (!tbody) return;

            if (res.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem;" class="text-muted">Belum ada pertemuan. Klik "Buat Pertemuan" untuk memulai.</td></tr>';
            } else {
                tbody.innerHTML = res.data.map(s => {
                    const badgeClass = s.status_sesi === 'buka' ? 'badge-success' : 'badge-neutral';
                    const badgeText = s.status_sesi === 'buka' ? 'Aktif' : 'Selesai';
                    const toggleText = s.status_sesi === 'buka' ? 'Tutup' : 'Buka';
                    const toggleIcon = s.status_sesi === 'buka' ? 'ri-lock-line' : 'ri-lock-unlock-line';

                    return `
                        <tr>
                            <td data-label="Judul">${s.judul}</td>
                            <td data-label="Tanggal">${s.tanggal}</td>
                            <td data-label="Waktu">${s.jam_mulai} - ${s.jam_selesai}</td>
                            <td data-label="Status"><span class="badge ${badgeClass}">${badgeText}</span></td>
                            <td data-label="Hadir">${s.hadir_count}/${s.total_students}</td>
                            <td>
                                <button class="icon-btn-small" title="${toggleText} Sesi" onclick="toggleSession(${s.id}, '${s.status_sesi === 'buka' ? 'tutup' : 'buka'}')"><i class="${toggleIcon}"></i></button>
                                <button class="icon-btn-small" title="Ekspor" onclick="exportSession(${s.id})"><i class="ri-download-2-line"></i></button>
                                <button class="icon-btn-small danger" title="Hapus" onclick="deleteSession(${s.id})"><i class="ri-delete-bin-line"></i></button>
                            </td>
                        </tr>
                    `;
                }).join('');
            }
        }
    }

    window.createSession = async function() {
        const judul = prompt('Judul Pertemuan:');
        if (!judul) return;
        const tanggal = prompt('Tanggal (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
        if (!tanggal) return;
        const jam_mulai = prompt('Jam Mulai (HH:MM):', '10:00');
        if (!jam_mulai) return;
        const jam_selesai = prompt('Jam Selesai (HH:MM):', '12:00');
        if (!jam_selesai) return;

        const res = await apiFetch('/api/sessions', { method: 'POST', body: JSON.stringify({ judul, tanggal, jam_mulai, jam_selesai }) });
        if (res.success) { app.showToast(res.message, 'success'); loadSessions(); } 
        else { app.showToast(res.message || 'Gagal membuat pertemuan.', 'error'); }
    };

    window.toggleSession = async function(id, status) {
        const res = await apiFetch(`/api/sessions/${id}/status`, { method: 'PUT', body: JSON.stringify({ status_sesi: status }) });
        if (res.success) { app.showToast(res.message, 'success'); loadSessions(); } 
        else { app.showToast(res.message || 'Gagal mengubah status.', 'error'); }
    };

    window.deleteSession = async function(id) {
        if (!confirm('Yakin ingin menghapus pertemuan ini beserta semua data absensinya?')) return;
        const res = await apiFetch(`/api/sessions/${id}`, { method: 'DELETE' });
        if (res.success) { app.showToast(res.message, 'success'); loadSessions(); }
    };

    window.exportSession = function(id) {
        window.open(`${API_BASE}/api/export/${id}`, '_blank');
    };

    const btnCreateSession = document.querySelector('#btn-create-session');
    if (btnCreateSession) btnCreateSession.addEventListener('click', createSession);

    // ============================================================
    // Students (Mahasiswa)
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
                                <button class="icon-btn-small danger" title="Hapus" onclick="deleteStudent(${s.id}, '${s.nama}')"><i class="ri-delete-bin-line"></i></button>
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
    // Camera Utility
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
    // Face Registration
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

    // Initial Load
    loadDashboard();
