// Địa chỉ server Python (Bộ não AI)
const AI_SERVER_URL = "https://hpu2sfarm-backend-1p74.onrender.com/detect"; 

// API Key (Dùng để xác thực người dùng - Giả lập)
const FIREBASE_API_KEY = "AIzaSyAQSoG7YJbap3d47qqhEfZWc3kIJr35B5M";

// Cấu hình Firebase (Để hiển thị hoặc mở rộng sau này)
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

// ============================================================
// 2. ĐIỀU HƯỚNG MÀN HÌNH (NAVIGATION)
// ============================================================
function switchView(view) {
    // Ẩn tất cả các màn hình trước
    ['registerScreen', 'loginScreen', 'dashboardScreen', 'btnLogout'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.classList.add('hidden');
    });

    // Hiển thị màn hình được chọn
    if(view === 'login') {
        document.getElementById('loginScreen').classList.remove('hidden');
    }
    if(view === 'register') {
        document.getElementById('registerScreen').classList.remove('hidden');
    }
    if(view === 'dashboard') {
        document.getElementById('dashboardScreen').classList.remove('hidden');
        document.getElementById('btnLogout').classList.remove('hidden');
        
        // Khởi động các chức năng chính khi vào Dashboard
        startClock();
        initCamera();
        startAI_Loop(); 
    }
}

// ============================================================
// 3. XỬ LÝ TÀI KHOẢN & GPS (AUTHENTICATION)
// ============================================================

// Hàm lấy tọa độ GPS
function getGPS() {
    if(navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            document.getElementById('regGPS').value = `${pos.coords.latitude}, ${pos.coords.longitude}`;
        }, () => {
            alert("Không thể lấy vị trí. Hãy kiểm tra quyền truy cập!");
        });
    } else {
        alert("Trình duyệt không hỗ trợ GPS");
    }
}

// --- HÀM ĐĂNG KÝ (Đã sửa lỗi logic) ---
function handleRegister() {
    // 1. Lấy dữ liệu (Phải nằm TRONG hàm để lấy giá trị mới nhất lúc bấm nút)
    const name = document.getElementById('regName').value;
    const contact = document.getElementById('regContact').value;
    const pass = document.getElementById('regPass').value;
    const gps = document.getElementById('regGPS').value;

    // 2. Kiểm tra dữ liệu rỗng
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
        apiKey: FIREBASE_API_KEY, // Tự động gắn Key vào
        createdAt: new Date().toISOString()
    };

    // 4. Lưu vào LocalStorage
    localStorage.setItem('hpu2s_user_' + contact, JSON.stringify(user));
    
    alert("Đăng ký thành công! Mời bạn đăng nhập.");
    switchView('login');
}

// --- HÀM ĐĂNG NHẬP ---
function handleLogin() {
    // 1. Lấy thông tin nhập vào
    const contact = document.getElementById('loginContact').value;
    const pass = document.getElementById('loginPass').value;

    // 2. Kiểm tra rỗng
    if (!contact || !pass) {
        alert("Vui lòng nhập SĐT và Mật khẩu!");
        return;
    }

    // 3. Tìm kiếm trong LocalStorage
    const storedUser = localStorage.getItem('hpu2s_user_' + contact);

    // 4. Xử lý kết quả
    if (storedUser) {
        const user = JSON.parse(storedUser);
        if (user.pass === pass) {
            alert("Đăng nhập thành công! Xin chào " + user.name);
            switchView('dashboard');
        } else {
            alert("Sai mật khẩu rồi! Vui lòng thử lại.");
        }
    } else {
        alert("Tài khoản chưa tồn tại. Vui lòng đăng ký trước!");
    }
}

// Xử lý nút Đăng xuất
document.getElementById('btnLogout').onclick = () => { 
    stopCamera(); 
    switchView('login'); 
};

// ============================================================
// 4. CAMERA & TRÍ TUỆ NHÂN TẠO (AI LOGIC)
// ============================================================
let videoStream;
let aiInterval;

// Khởi động Camera
async function initCamera() {
    try {
        videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        document.getElementById('webcamVideo').srcObject = videoStream;
    } catch(e) { 
        console.error("Lỗi Camera:", e); 
        alert("Không bật được Camera. Hãy kiểm tra quyền truy cập!");
    }
}

// Tắt Camera
function stopCamera() {
    if(videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
    }
    clearInterval(aiInterval); // Dừng gửi ảnh cho AI
}

// Vòng lặp gửi ảnh cho AI (2 giây/lần)
function startAI_Loop() {
    aiInterval = setInterval(() => {
       const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const capturedImage = document.getElementById('captured-image');
const btnCapture = document.getElementById('btn-capture');
let stream = null;

// 1. Hàm bật Camera
async function startCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { 
                facingMode: 'environment', // Ưu tiên Camera sau
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        });
        video.srcObject = stream;
        video.style.display = 'block';
        capturedImage.style.display = 'none';
        btnCapture.style.display = 'inline-block';
    } catch (err) {
        alert("Không bật được Camera! (Hãy kiểm tra quyền truy cập)");
    }
}

// 2. Hàm chụp ảnh và gửi về Server
async function captureImage() {
    if (!stream) return;

    // Vẽ hình từ video lên canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    // Chuyển thành dạng dữ liệu Base64
    const base64Image = canvas.toDataURL('image/jpeg');

    // Hiển thị ảnh vừa chụp
    capturedImage.src = base64Image;
    capturedImage.style.display = 'block';
    video.style.display = 'none';
    
    // Tắt camera cho đỡ tốn pin
    stream.getTracks().forEach(track => track.stop());
    btnCapture.style.display = 'none';

    // Gửi lên Server (Backend)
    sendToServer(base64Image);
}

async function sendToServer(base64String) {
    // Tách phần đầu "data:image/jpeg;base64," ra, chỉ lấy mã code
    const imageCode = base64String.split(',')[1];

    try {
        console.log("Đang gửi ảnh...");
        const response = await fetch('https://hpu2sfarm-backend-1p74.onrender.com/detect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: imageCode }) // Gửi dạng JSON
        });

        const data = await response.json();
        console.log("Kết quả:", data);
        alert(`Bệnh: ${data.disease_name}\nĐộ tin cậy: ${data.confidence}`);
        
    } catch (error) {
        console.error(error);
        alert("Lỗi kết nối Server!");
    }
}

// Cập nhật giao diện kết quả
function updateReport(data) {
    const statusEl = document.getElementById('plantStatus');
    
    // Hiển thị thông tin
    document.getElementById('aiDiseaseName').innerText = data.disease;
    document.getElementById('aiCause').innerText = data.cause;
    document.getElementById('aiSolution').innerText = data.solution;

    // Đổi màu sắc cảnh báo
    if (data.status === 'safe') {
        statusEl.className = 'status-display status-safe';
        statusEl.innerHTML = '<i class="fas fa-check-circle"></i> AN TOÀN';
    } else {
        statusEl.className = 'status-display status-danger';
        statusEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i> NGUY HIỂM';
    }
}

// Đồng hồ hệ thống
function startClock() {
    setInterval(() => {
        const now = new Date();
        document.getElementById('clock').innerText = now.toLocaleTimeString('vi-VN');
    }, 1000);
}

// --- KHỞI CHẠY MẶC ĐỊNH ---
// Khi mở web lên, vào màn hình Đăng nhập đầu tiên
document.addEventListener("DOMContentLoaded", () => {
    switchView('login');
});




