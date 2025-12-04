// --- 1. QUẢN LÝ ĐĂNG NHẬP / ĐĂNG KÝ (LOCALSTORAGE) ---

function toggleAuthMode(mode) {
    document.getElementById('register-form').classList.toggle('hidden', mode === 'login');
    document.getElementById('login-form').classList.toggle('hidden', mode !== 'login');
}

function handleRegister(e) {
    e.preventDefault();
    const user = {
        name: document.getElementById('reg-name').value,
        contact: document.getElementById('reg-contact').value,
        pass: document.getElementById('reg-pass').value,
        dob: document.getElementById('reg-dob').value,
        loc: document.getElementById('reg-loc').value,
        color: '#ffe3e8' // Màu mặc định
    };

    // Lưu vào trình duyệt
    localStorage.setItem('sfUser', JSON.stringify(user));
    
    alert("Đăng ký thành công! Hãy đăng nhập ngay.");
    toggleAuthMode('login'); // Chuyển sang màn đăng nhập
}

function handleLogin(e) {
    e.preventDefault();
    const contact = document.getElementById('login-contact').value;
    const pass = document.getElementById('login-pass').value;

    // Lấy dữ liệu đã lưu
    const storedUser = JSON.parse(localStorage.getItem('sfUser'));

    if (storedUser && storedUser.contact === contact && storedUser.pass === pass) {
        loginSuccess(storedUser);
    } else {
        alert("Sai thông tin đăng nhập hoặc chưa đăng ký!");
    }
}

function loginSuccess(user) {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('main-app').classList.add('active');

    updateUI(user);
    // Áp dụng màu nền đã lưu
    if(user.color) changeColor(user.color, false); 
}

function updateUI(user) {
    document.getElementById('welcome-msg').innerText = `👋 Hi, ${user.name}!`;
    document.getElementById('sidebar-name').innerText = user.name;
    document.getElementById('sidebar-avatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=ff8fa3&color=fff`;
    
    // Cập nhật Box thông tin trong Cài đặt
    document.getElementById('info-name-box').innerText = user.name;
    document.getElementById('info-contact-box').innerText = user.contact;
    document.getElementById('info-dob-box').innerText = "🎂 " + user.dob;
}

function logout() {
    if(confirm("Bạn muốn đăng xuất?")) {
        location.reload();
    }
}

// --- 2. EDIT INFO (SỬA THÔNG TIN) ---
function openEditModal() {
    const user = JSON.parse(localStorage.getItem('sfUser'));
    if(!user) return;
    document.getElementById('edit-name').value = user.name;
    document.getElementById('edit-contact').value = user.contact;
    document.getElementById('edit-dob').value = user.dob;
    document.getElementById('edit-modal').classList.remove('hidden');
}

function closeEditModal() { document.getElementById('edit-modal').classList.add('hidden'); }

function saveEditInfo() {
    let user = JSON.parse(localStorage.getItem('sfUser'));
    user.name = document.getElementById('edit-name').value;
    user.contact = document.getElementById('edit-contact').value;
    user.dob = document.getElementById('edit-dob').value;
    
    localStorage.setItem('sfUser', JSON.stringify(user)); // Lưu lại
    updateUI(user); // Cập nhật giao diện
    closeEditModal();
    alert("Đã cập nhật thông tin!");
}

// --- 3. TÍNH NĂNG CÀI ĐẶT ---

function changeColor(color, save=true) {
    document.documentElement.style.setProperty('--bg-color', color);
    if(save) {
        let user = JSON.parse(localStorage.getItem('sfUser'));
        if(user) { user.color = color; localStorage.setItem('sfUser', JSON.stringify(user)); }
    }
}

function changeFontSize(size) {
    document.body.classList.remove('font-small', 'font-medium', 'font-large');
    document.body.classList.add(size);
}

function toggleTheme(){ document.body.classList.toggle('dark-mode'); }

// --- 4. CAMERA THẬT (WEBCAM) ---
async function toggleCam() {
    const btn = document.getElementById('btn-cam');
    const img = document.getElementById('cam-img');
    const video = document.getElementById('webcam-feed');
    const liveTag = document.getElementById('live-tag');

    if(btn.innerText === "Kết nối") {
        try {
            // Xin quyền truy cập Camera
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
            
            // Hiển thị Video, ẩn ảnh
            img.classList.add('hidden');
            video.classList.remove('hidden');
            liveTag.style.display = "block";
            
            btn.innerText = "Ngắt";
            btn.style.background = "red";
        } catch (err) {
            alert("Không tìm thấy Camera hoặc bạn chưa cấp quyền! (Lỗi: " + err.message + ")");
        }
    } else {
        // Tắt Camera
        const stream = video.srcObject;
        if(stream) {
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop()); // Dừng luồng
        }
        video.srcObject = null;
        
        img.classList.remove('hidden');
        video.classList.add('hidden');
        liveTag.style.display = "none";
        
        btn.innerText = "Kết nối";
        btn.style.background = "var(--primary-color)";
    }
}

// --- 5. TIỆN ÍCH KHÁC ---

function autoGetLocation() {
    const icon = document.querySelector('.btn-loc-icon');
    icon.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            document.getElementById('reg-loc').value = `${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)}`;
            icon.innerHTML = '<i class="fa-solid fa-check" style="color:green"></i>';
        },
        (err) => { alert("Lỗi vị trí: " + err.message); icon.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i>'; }
    );
}

function switchTab(tabId, el) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.menu li').forEach(l => l.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    el.classList.add('active');
}

let currentAudio = null;
function triggerWarning() {
    document.getElementById('health-status').className = "alert-box danger";
    const soundType = document.getElementById('ringtone-select').value;
    let soundUrl = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.m4a"; // Siren
    if(soundType === 'tiktok') soundUrl = "https://assets.mixkit.co/active_storage/sfx/209/209-preview.m4a";
    
    if (currentAudio) { currentAudio.pause(); currentAudio.currentTime = 0; }
    currentAudio = new Audio(soundUrl);
    currentAudio.play();
}

// Đồng hồ chạy
setInterval(()=>{document.getElementById('clock').innerText=new Date().toLocaleTimeString();},1000);
