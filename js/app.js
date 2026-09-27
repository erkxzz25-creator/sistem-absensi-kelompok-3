document.addEventListener('DOMContentLoaded', () => {
    // Application State
    const state = {
        currentView: 'dashboard',
        cameraStream: null,
        isSessionActive: false,
        registrationImages: 0,
        maxRegistrationImages: 5,
        presentCount: 0
    };

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
        'live-attendance': { title: 'Sesi Absensi', subtitle: 'Sesi pengenalan wajah otomatis' },
        'face-registration': { title: 'Registrasi Wajah', subtitle: 'Daftarkan data wajah mahasiswa baru' },
        'student-history': { title: 'Riwayat Saya', subtitle: 'Pengecekan absensi mandiri' }
    };

    // 1. Navigation Logic
    window.app = {
        navigateTo: function(targetId) {
            // Update active state in sidebar
            navItems.forEach(item => {
                if(item.dataset.target === targetId) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });

            // Show target view
            views.forEach(view => {
                if(view.id === targetId) {
                    view.classList.add('active');
                } else {
                    view.classList.remove('active');
                }
            });

            // Update Header
            if(pageMeta[targetId]) {
                pageTitle.textContent = pageMeta[targetId].title;
                pageSubtitle.textContent = pageMeta[targetId].subtitle;
            }
            
            // Clean up when leaving certain views
            if (state.currentView === 'live-attendance' && targetId !== 'live-attendance') {
                stopCamera('webcam-feed', 'camera-placeholder', '.scanning-overlay');
                if(window.mockDetectionInterval) clearInterval(window.mockDetectionInterval);
            }
            if (state.currentView === 'face-registration' && targetId !== 'face-registration') {
                stopCamera('reg-webcam', 'reg-camera-placeholder');
            }

            state.currentView = targetId;
        },
        showToast: function(message, type = 'info') {
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            
            let icon = 'ri-information-line';
            if(type === 'success') icon = 'ri-check-line';
            if(type === 'error') icon = 'ri-error-warning-line';
            
            toast.innerHTML = `
                <i class="${icon}"></i>
                <span>${message}</span>
            `;
            
            toastContainer.appendChild(toast);
            
            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }
    };

    // Initialize Navigation Listeners
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const target = e.currentTarget.dataset.target;
            app.navigateTo(target);
        });
    });

    // 2. Camera Logic (Mock for Frontend Only)
    async function startCamera(videoElementId, placeholderId, overlaySelector = null) {
        const video = document.getElementById(videoElementId);
        const placeholder = document.getElementById(placeholderId);
        const overlay = overlaySelector ? document.querySelector(overlaySelector) : null;
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
            video.style.display = 'block';
            placeholder.style.display = 'none';
            if (overlay) overlay.style.display = 'block';
            state.cameraStream = stream;
            return true;
        } catch (err) {
            console.error("Error accessing camera:", err);
            app.showToast("Tidak dapat mengakses kamera. Harap berikan izin akses.", "error");
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
        
        if (video) {
            video.style.display = 'none';
            video.srcObject = null;
        }
        if (placeholder) placeholder.style.display = 'flex';
        if (overlay) overlay.style.display = 'none';
    }

    // 3. Live Attendance Specific Logic
    const btnStartCamera = document.getElementById('btn-start-camera');
    const btnStopSession = document.getElementById('btn-stop-session');
    const presentCountLabel = document.getElementById('present-count');

    if (btnStartCamera) {
        btnStartCamera.addEventListener('click', async () => {
            const started = await startCamera('webcam-feed', 'camera-placeholder', '.scanning-overlay');
            if (started) {
                state.isSessionActive = true;
                app.showToast("Sesi dimulai. Memantau wajah...", "success");
                
                // Mock live detection
                window.mockDetectionInterval = setInterval(() => {
                    const names = ["Ahmad Fauzi", "Budi Santoso", "Citra Kirana", "Dewi Lestari"];
                    const randomName = names[Math.floor(Math.random() * names.length)];
                    const time = new Date().toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}) + ' WIB';
                    
                    addLogEntry(randomName, `1011900${Math.floor(Math.random() * 9)}`, time);
                }, 5000);
            }
        });
    }

    if (btnStopSession) {
        btnStopSession.addEventListener('click', () => {
            if (!state.isSessionActive) {
                app.showToast("Tidak ada sesi aktif untuk dihentikan.", "info");
                return;
            }
            stopCamera('webcam-feed', 'camera-placeholder', '.scanning-overlay');
            clearInterval(window.mockDetectionInterval);
            state.isSessionActive = false;
            
            // Reset state
            state.presentCount = 0;
            if(presentCountLabel) presentCountLabel.textContent = `0 Hadir`;
            const logList = document.getElementById('recognition-log-list');
            if(logList) {
                logList.innerHTML = `
                    <div class="log-item empty-state">
                        <i class="ri-scan-2-line"></i>
                        <p>Menunggu deteksi wajah...</p>
                    </div>
                `;
            }
            
            app.showToast("Sesi berhasil diakhiri.", "info");
        });
    }

    function addLogEntry(name, nim, time) {
        const logList = document.getElementById('recognition-log-list');
        const emptyState = logList.querySelector('.empty-state');
        if (emptyState) emptyState.remove();

        const logItem = document.createElement('div');
        logItem.className = 'log-item';
        logItem.innerHTML = `
            <img src="https://ui-avatars.com/api/?name=${name.replace(' ', '+')}&background=random" class="avatar-small">
            <div class="log-info">
                <div class="log-name">${name}</div>
                <div class="log-nim">${nim}</div>
            </div>
            <div class="log-time">${time}</div>
            <span class="badge badge-success"><i class="ri-check-line"></i></span>
        `;
        
        logList.insertBefore(logItem, logList.firstChild);
        
        // Update count
        state.presentCount++;
        if(presentCountLabel) presentCountLabel.textContent = `${state.presentCount} Hadir`;
        
        // Keep only last 10 logs
        if (logList.children.length > 10) {
            logList.removeChild(logList.lastChild);
        }
    }

    // 4. Registration Logic
    const btnProceedCapture = document.getElementById('btn-proceed-capture');
    const regCaptureSection = document.getElementById('reg-capture-section');
    const btnCapturePhoto = document.getElementById('btn-capture-photo');
    const btnSaveRegistration = document.getElementById('btn-save-registration');
    const captureProgressBar = document.getElementById('capture-progress-bar');
    const captureCountText = document.getElementById('capture-count');

    if (btnProceedCapture) {
        btnProceedCapture.addEventListener('click', async () => {
            const nim = document.getElementById('reg-nim').value;
            const name = document.getElementById('reg-name').value;
            
            if (!nim || !name) {
                app.showToast("Harap isi NIM dan Nama terlebih dahulu.", "warning");
                return;
            }

            regCaptureSection.classList.remove('disabled');
            const started = await startCamera('reg-webcam', 'reg-camera-placeholder');
            if (started) {
                btnCapturePhoto.disabled = false;
                app.showToast("Kamera siap. Harap lihat ke depan dan ambil foto.", "info");
            }
        });
    }

    if (btnCapturePhoto) {
        btnCapturePhoto.addEventListener('click', () => {
            if (state.registrationImages < state.maxRegistrationImages) {
                state.registrationImages++;
                
                // Visual feedback (flash)
                const video = document.getElementById('reg-webcam');
                video.style.opacity = '0.3';
                setTimeout(() => video.style.opacity = '1', 100);

                // Update Progress
                const percentage = (state.registrationImages / state.maxRegistrationImages) * 100;
                captureProgressBar.style.width = `${percentage}%`;
                captureCountText.textContent = `${state.registrationImages}/${state.maxRegistrationImages}`;
                
                app.showToast(`Foto ${state.registrationImages} berhasil diambil.`);

                if (state.registrationImages === state.maxRegistrationImages) {
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
        btnSaveRegistration.addEventListener('click', () => {
            app.showToast("Data wajah berhasil disandikan dan disimpan ke database!", "success");
            
            // Reset form
            setTimeout(() => {
                document.getElementById('reg-nim').value = '';
                document.getElementById('reg-name').value = '';
                document.getElementById('reg-class').value = '';
                
                regCaptureSection.classList.add('disabled');
                btnCapturePhoto.style.display = 'block';
                btnCapturePhoto.disabled = true;
                btnSaveRegistration.style.display = 'none';
                
                state.registrationImages = 0;
                captureProgressBar.style.width = '0%';
                captureCountText.textContent = '0/5';
                
                document.getElementById('reg-camera-placeholder').innerHTML = `
                    <i class="ri-camera-off-line"></i>
                    <p>Isi form untuk mengaktifkan kamera</p>
                `;
                
                app.navigateTo('students');
            }, 1500);
        });
    }

    // 5. Student History Logic
    const btnCheckHistory = document.getElementById('btn-check-history');
    const historyResults = document.getElementById('history-results');

    if (btnCheckHistory) {
        btnCheckHistory.addEventListener('click', () => {
            const nim = document.getElementById('history-nim').value;
            if (!nim) {
                app.showToast("Harap masukkan NIM yang valid.", "warning");
                return;
            }
            
            // Show loading state
            btnCheckHistory.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Mengecek...';
            btnCheckHistory.disabled = true;
            
            // Mock API delay
            setTimeout(() => {
                btnCheckHistory.innerHTML = 'Cek Riwayat';
                btnCheckHistory.disabled = false;
                
                historyResults.style.display = 'block';
                // Scroll to results
                historyResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 800);
        });
    }
});
