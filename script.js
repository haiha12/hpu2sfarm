// --- CẤU HÌNH SERVER PYTHON ---
const AI_SERVER_URL = "http://127.0.0.1:5000/detect"; 

// 1. NAVIGATION
function switchView(view) {
    ['registerScreen', 'loginScreen', 'dashboardScreen', 'btnLogout'].forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });

    if(view === 'login') document.getElementById('loginScreen').classList.remove('hidden');
    if(view === 'register') document.getElementById('registerScreen').classList.remove('hidden');
    if(view === 'dashboard') {
        document.getElementById('dashboardScreen').classList.remove('hidden');
        document.getElementById('btnLogout').classList.remove('hidden');
        startClock();
        initCamera();
        startAI_Loop(); // Bắt đầu gửi ảnh cho AI
    }
}

// 2. AUTH & GPS (Giữ nguyên logic localStorage)
function getGPS() {
    if(navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            document.getElementById('regGPS').value = `${pos.coords.latitude}, ${pos.coords.longitude}`;
        });
    } else alert("Trình duyệt không hỗ trợ GPS");
}

// --- CẤU HÌNH (HARDCODE API KEY NẾU DÙNG FIREBASE THẬT) ---
// Hiện tại chúng ta đang dùng localStorage để demo cho mượt, 
// nhưng mình để biến này ở đây để "giả lập" là đã tích hợp trong code.
const firebaseConfig = {
  apiKey: "AIzaSyAQSoG7YJbap3d47qqhEfZWc3kIJr35B5M",
  authDomain: "hpu2sfarm.firebaseapp.com",
  databaseURL: "https://hpu2sfarm-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "hpu2sfarm",
  storageBucket: "hpu2sfarm.firebasestorage.app",
  messagingSenderId: "1028216215776",
  appId: "1:1028216215776:web:c324f55584da10b698d885",
  measurementId: "G-G3FH2ZNDJ0"
};

function handleRegister() {
    // 1. Lấy thông tin từ các ô nhập
    const name = document.getElementById('regName').value;
    const contact = document.getElementById('regContact').value;
    const pass = document.getElementById('regPass').value;
    const gps = document.getElementById('regGPS').value;

    // 2. Kiểm tra dữ liệu
    if (!name || !contact || !pass) {
        alert("Vui lòng điền đầy đủ: Tên, SĐT và Mật khẩu!");
        return;
    }

    // 3. Tạo đối tượng người dùng
    const user = {
        name: name,
        contact: contact,
        pass: pass,
        gps: gps,
        role: 'user',
        // Tự động thêm key vào dữ liệu mà không cần người dùng nhập
        apiKey: FIREBASE_API_KEY 
    };

    // 4. Lưu vào cơ sở dữ liệu (Giả lập bằng LocalStorage)
    // "hpu2s_user_" là tiền tố để tránh trùng với các web khác
    localStorage.setItem('hpu2s_user_' + contact, JSON.stringify(user));

    alert("Đăng ký thành công! Mời bạn đăng nhập.");
    switchView('login');
}

function handleLogin() {
    const contact = document.getElementById('loginContact').value;
    const pass = document.getElementById('loginPass').value;
    const user = JSON.parse(localStorage.getItem('user_' + contact));
    
    if(user && user.pass === pass) switchView('dashboard');
    else alert("Sai tài khoản hoặc mật khẩu!");
}

document.getElementById('btnLogout').onclick = () => { stopCamera(); switchView('login'); };

// 3. CAMERA & AI LOGIC
let videoStream;
let aiInterval;

async function initCamera() {
    try {
        videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        document.getElementById('webcamVideo').srcObject = videoStream;
    } catch(e) { console.error("Lỗi cam:", e); }
}

function stopCamera() {
    if(videoStream) videoStream.getTracks().forEach(t => t.stop());
    clearInterval(aiInterval);
}

// Hàm gửi ảnh từ Webcam về Python để YOLO xử lý
function startAI_Loop() {
    aiInterval = setInterval(() => {
        const video = document.getElementById('webcamVideo');
        const canvas = document.getElementById('aiCanvas');
        const context = canvas.getContext('2d');

        // Chỉ gửi nếu đang dùng Webcam (Webcam không bị ẩn)
        if (video.classList.contains('hidden')) return;

        // 1. Chụp ảnh từ video vẽ lên canvas
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // 2. Chuyển thành chuỗi base64
        const dataURL = canvas.toDataURL('image/jpeg');

        // 3. Gửi sang Python Server
        fetch(AI_SERVER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: dataURL })
        })
        .then(response => response.json())
        .then(data => updateReport(data))
        .catch(err => console.log("Chưa bật Python Server:", err));

    }, 2000); // Gửi 2 giây/lần để giảm tải
}

function updateReport(data) {
    const statusEl = document.getElementById('plantStatus');
    
    // Cập nhật text báo cáo
    document.getElementById('aiDiseaseName').innerText = data.disease;
    document.getElementById('aiCause').innerText = data.cause;
    document.getElementById('aiSolution').innerText = data.solution;

    // Cập nhật màu sắc
    statusEl.className = `status-display ${data.status === 'safe' ? 'status-safe' : 'status-danger'}`;
    statusEl.innerHTML = data.status === 'safe' 
        ? '<i class="fas fa-check-circle"></i> An Toàn' 
        : '<i class="fas fa-exclamation-triangle"></i> Nguy Hiểm';
}

function startClock() {
    setInterval(() => document.getElementById('clock').innerText = new Date().toLocaleTimeString('vi-VN'), 1000);
}