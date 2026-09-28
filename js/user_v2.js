// Initialize script
    // ============================================================
    // Application State
    // ============================================================
    const state = {
        currentView: 'live-attendance',
        cameraStream: null,
        isSessionActive: false,
        activeSessionId: null,
        presentCount: 0,
        recognitionInterval: null
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
        'live-attendance': { title: 'Absensi Wajah', subtitle: 'Sesi pengenalan wajah otomatis' },
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
                stopCamera('webcam-feed', 'camera-placeholder', '.scanning-overlay');
                if (state.recognitionInterval) clearInterval(state.recognitionInterval);
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
    async function startCamera(videoElementId, placeholderId, overlaySelector = null) {
        const video = document.getElementById(videoElementId);
        const placeholder = document.getElementById(placeholderId);
        const overlay = overlaySelector ? document.querySelector(overlaySelector) : null;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" } });
            video.srcObject = stream;
            video.style.display = 'block';
            placeholder.style.display = 'none';
            if (overlay) overlay.style.display = 'block';
            state.cameraStream = stream;
            return true;
        } catch (err) {
            app.showToast('Tidak dapat mengakses kamera. Harap berikan izin akses.', 'error');
            return false;
        }
    }

    function stopCamera(videoElementId, placeholderId, overlaySelector = null) {
        if (state.cameraStream) {
            state.cameraStream.getTracks().forEach(track => track.stop());
            state.cameraStream = null;
        }
        const video = document.getElementById(videoElementId);
        const placeholder = document.getElementById(placeholderId);
        const overlay = overlaySelector ? document.querySelector(overlaySelector) : null;

        if (video) { video.style.display = 'none'; video.srcObject = null; }
        if (placeholder) placeholder.style.display = 'flex';
        if (overlay) overlay.style.display = 'none';
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
    // Live Attendance (Sesi Absensi)
    // ============================================================
    const btnStartCamera = document.getElementById('btn-start-camera');
    const btnStopSession = document.getElementById('btn-stop-session');
    const presentCountLabel = document.getElementById('present-count');
    const sessionTitleHeader = document.getElementById('session-title-header');

    if (btnStartCamera) {
        btnStartCamera.addEventListener('click', async () => {
            const sessionsRes = await apiFetch('/api/sessions');
            if (!sessionsRes.success) return;

            const activeSession = sessionsRes.data.find(s => s.status_sesi === 'buka');
            if (!activeSession) {
                app.showToast('Sesi absensi belum dibuka oleh Dosen/Admin.', 'error');
                if (sessionTitleHeader) sessionTitleHeader.textContent = 'Belum Ada Sesi Aktif';
                return;
            }

            state.activeSessionId = activeSession.id;
            if (sessionTitleHeader) sessionTitleHeader.textContent = `Sesi: ${activeSession.judul}`;

            const started = await startCamera('webcam-feed', 'camera-placeholder', '.scanning-overlay');
            if (started) {
                state.isSessionActive = true;
                state.presentCount = 0;
                if (presentCountLabel) presentCountLabel.textContent = '0 Hadir';
                app.showToast('Kamera aktif. Silakan posisikan wajah Anda.', 'success');

                state.recognitionInterval = setInterval(async () => {
                    if (!state.isSessionActive) return;

                    const frameData = captureFrame('webcam-feed');
                    const res = await apiFetch('/api/recognize', {
                        method: 'POST',
                        body: JSON.stringify({ image: frameData, session_id: state.activeSessionId })
                    });

                    if (res.success && res.results) {
                        res.results.forEach(result => {
                            if (result.recognized && !result.already_recorded) {
                                addLogEntry(
                                    result.student.nama,
                                    result.student.nim,
                                    new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
                                );
                                app.showToast(`${result.student.nama} berhasil hadir!`, 'success');
                            }
                        });
                    }
                }, 2000);
            }
        });
    }

    if (btnStopSession) {
        btnStopSession.addEventListener('click', () => {
            if (!state.isSessionActive) {
                app.showToast('Kamera sedang tidak aktif.', 'info');
                return;
            }
            stopCamera('webcam-feed', 'camera-placeholder', '.scanning-overlay');
            if (state.recognitionInterval) clearInterval(state.recognitionInterval);
            state.isSessionActive = false;
            state.activeSessionId = null;

            state.presentCount = 0;
            if (presentCountLabel) presentCountLabel.textContent = '0 Hadir';
            const logList = document.getElementById('recognition-log-list');
            if (logList) {
                logList.innerHTML = `<div class="log-item empty-state"><i class="ri-scan-2-line"></i><p>Menunggu wajah terdeteksi...</p></div>`;
            }
            if (sessionTitleHeader) sessionTitleHeader.textContent = 'Kamera Dihentikan';
            app.showToast('Kamera berhasil dimatikan.', 'info');
        });
    }

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

        state.presentCount++;
        if (presentCountLabel) presentCountLabel.textContent = `${state.presentCount} Hadir`;
        if (logList.children.length > 10) logList.removeChild(logList.lastChild);
    }

    // ============================================================
    // Student History
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
                                    <td>Pertemuan</td>
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
