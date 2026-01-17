// ============================================================
// 1. CẤU HÌNH HỆ THỐNG
// ============================================================
// Lưu ý: Kiểm tra lại link backend xem là 1ho4 hay 1p74 (lấy link đang chạy ổn định)
const API_URL = "https://hpu2sfarm-backend-1ho4.onrender.com/detect"; 
// API Key (Dùng để xác thực người dùng - Giả lập)
const FIREBASE_API_KEY = "AIzaSyAQSoG7YJbap3d47qqhEfZWc3kIJr35B5M";
const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: "hpu2sfarm.firebaseapp.com",
  databaseURL: "https://hpu2sfarm-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "hpu2sfarm",
  storageBucket: "hpu2sfarm.firebasestorage.app",
  messagingSenderId: "1028216215776",
  appId: "1:1028216215776:web:c324f55584da10b698d885",
  measurementId: "G-G3FH2ZNDJ0"
};
// Biến toàn cục cho Camera
let stream = null;
let scanningInterval = null;
let isProcessing = false;

// ============================================================
// 2. ĐIỀU HƯỚNG & XỬ LÝ TÀI KHOẢN (Auth & Navigation)
// ============================================================

// Hàm chuyển đổi màn hình
function switchView(viewName) {
    // 1. Ẩn tất cả các màn hình
    const screens = ['loginScreen', 'registerScreen', 'dashboardScreen'];
    screens.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    // 2. Hiện màn hình được chọn
    const selectedScreen = document.getElementById(viewName + 'Screen');
    if (selectedScreen) {
        selectedScreen.style.display = 'block'; // Hoặc 'flex' tùy CSS
    }

    // 3. Xử lý logic riêng cho Dashboard
    if (viewName === 'dashboard') {
        startClock();
        // Không tự bật camera ngay, để người dùng bấm nút mới bật
    }
}

// Hàm Đăng Ký
function handleRegister() {
    const name = document.getElementById('regName').value;
    const contact = document.getElementById('regContact').value;
    const pass = document.getElementById('regPass').value;

    if (!name || !contact || !pass) {
        alert("Vui lòng điền đầy đủ thông tin!");
        return;
    }

    const user = { name, contact, pass };
    localStorage.setItem('hpu2s_user_' + contact, JSON.stringify(user));
    
    alert("Đăng ký thành công! Vui lòng đăng nhập.");
    switchView('login');
}

// Hàm Đăng Nhập
function handleLogin() {
    const contact = document.getElementById('loginContact').value;
    const pass = document.getElementById('loginPass').value;

    if (!contact || !pass) {
        alert("Vui lòng nhập đầy đủ thông tin!");
        return;
    }

    const storedUser = localStorage.getItem('hpu2s_user_' + contact);
    if (storedUser) {
        const user = JSON.parse(storedUser);
        if (user.pass === pass) {
            // Đăng nhập thành công -> Vào Dashboard
            alert("Xin chào " + user.name + "!");
            switchView('dashboard');
        } else {
            alert("Sai mật khẩu!");
        }
    } else {
        alert("Tài khoản không tồn tại!");
    }
}

// Hàm Đăng Xuất
function handleLogout() {
    stopScanning(); // Tắt camera nếu đang bật
    switchView('login');
}

// ============================================================
// 3. CAMERA & AI (Real-time Logic)
// ============================================================

// Bật Camera
async function startRealTimeCamera() {
    const videoEl = document.getElementById('video');
    const resultDiv = document.getElementById('realtime-result');

    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { 
                facingMode: 'environment', // Ưu tiên cam sau
                width: { ideal: 640 },
                height: { ideal: 480 }
            }
        });

        videoEl.srcObject = stream;
        videoEl.style.display = 'block';
        if(resultDiv) resultDiv.innerText = "🔍 Đang khởi động AI...";

        // Bắt đầu vòng lặp gửi ảnh
        startScanningLoop();

    } catch (err) {
        console.error("Lỗi Camera:", err);
        alert("Không mở được Camera. Vui lòng cấp quyền!");
    }
}

// Vòng lặp gửi ảnh (2 giây/lần)
function startScanningLoop() {
    if (scanningInterval) clearInterval(scanningInterval);
    scanningInterval = setInterval(processFrame, 2000);
}

// Xử lý từng khung hình
async function processFrame() {
    if (isProcessing || !stream) return;
    
    const videoEl = document.getElementById('video');
    
    // Kiểm tra video đã sẵn sàng chưa
    if (videoEl.readyState !== videoEl.HAVE_ENOUGH_DATA) return;

    try {
        isProcessing = true; // Khóa tiến trình

        const canvasEl = document.getElementById('canvas');
        canvasEl.width = videoEl.videoWidth;
        canvasEl.height = videoEl.videoHeight;
        
        const ctx = canvasEl.getContext('2d');
        ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);

        // Nén ảnh gửi đi
        const base64Image = canvasEl.toDataURL('image/jpeg', 0.6);
        
        await sendToServer(base64Image);

    } catch (err) {
        console.error("Lỗi xử lý ảnh:", err);
    } finally {
        isProcessing = false; // Mở khóa
    }
}

// Gửi lên Server AI
async function sendToServer(base64String) {
    const imageCode = base64String.split(',')[1]; // Bỏ header base64
    const resultDiv = document.getElementById('realtime-result');

    try {
        if(resultDiv) {
            resultDiv.innerHTML = "📡 Đang phân tích...";
            resultDiv.style.color = "orange";
        }

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: imageCode })
        });

        const data = await response.json();

        // Cập nhật kết quả dưới video
        if (data.disease_name && resultDiv) {
            resultDiv.innerHTML = `🌿 <b>${data.disease_name}</b> (${(data.confidence * 100).toFixed(0)}%)
