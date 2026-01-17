// Địa chỉ server Python (Bộ não AI)
const AI_SERVER_URL = "https://hpu2sfarm-backend-1ho4.onrender.com/detect"; 

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

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const resultText = document.getElementById('result-text'); // Cần thêm thẻ này bên HTML
let stream = null;
let scanningInterval = null;
let isProcessing = false; // Cờ đánh dấu để không gửi spam nếu mạng lag

// ======================================================
// BIẾN TOÀN CỤC & CẤU HÌNH
// ======================================================
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
let stream = null;
let scanningInterval = null;
let isProcessing = false;

// ĐỔI LINK NÀY THÀNH LINK SERVER ĐÚNG CỦA BẠN (Lấy từ ảnh chụp màn hình)
const API_URL = 'https://hpu2sfarm-backend-1ho4.onrender.com/detect'; 

// ======================================================
// 1. HÀM BẬT CAMERA VÀ TỰ ĐỘNG QUÉT
// ======================================================
async function startRealTimeCamera() {
    try {
        const videoEl = document.getElementById('video');
        
        // Xin quyền truy cập Camera
        stream = await navigator.mediaDevices.getUserMedia({
            video: { 
                facingMode: 'environment', // Ưu tiên cam sau
                width: { ideal: 640 },
                height: { ideal: 480 }
            }
        });

        videoEl.srcObject = stream;
        videoEl.style.display = 'block';
        
        // Bắt đầu vòng lặp quét (2 giây/lần)
        startScanningLoop();

    } catch (err) {
        console.error("Lỗi Camera:", err);
        alert("Không mở được Camera. Hãy kiểm tra quyền truy cập!");
    }
}

// ======================================================
// 2. VÒNG LẶP GỬI ẢNH
// ======================================================
function startScanningLoop() {
    if (scanningInterval) clearInterval(scanningInterval);
    // Cài đặt 2 giây gửi 1 lần
    scanningInterval = setInterval(processFrame, 2000);
}

// ======================================================
// 3. XỬ LÝ KHUNG HÌNH (CẮT ẢNH TỪ VIDEO)
// ======================================================
async function processFrame() {
    // Nếu đang bận xử lý ảnh trước hoặc chưa có luồng video -> Bỏ qua
    if (isProcessing || !stream) return;

    try {
        isProcessing = true; // Khóa lại, đánh dấu đang bận

        const videoEl = document.getElementById('video');
        const canvasEl = document.getElementById('canvas');
        
        if (videoEl.readyState !== videoEl.HAVE_ENOUGH_DATA) {
            isProcessing = false;
            return;
        }

        // Vẽ video lên canvas
        canvasEl.width = videoEl.videoWidth;
        canvasEl.height = videoEl.videoHeight;
        const ctx = canvasEl.getContext('2d');
        ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);

        // Nén ảnh thành Base64 (chất lượng 0.6 cho nhẹ)
        const base64Image = canvasEl.toDataURL('image/jpeg', 0.6);
        
        // Gửi lên Server
        await sendToServer(base64Image);

    } catch (err) {
        console.error("Lỗi xử lý frame:", err);
    } finally {
        isProcessing = false; // Mở khóa để xử lý ảnh tiếp theo
    }
}

// ======================================================
// 4. GỬI DỮ LIỆU LÊN SERVER AI
// ======================================================
async function sendToServer(base64String) {
    // Cắt bỏ phần đầu "data:image/jpeg;base64,"
    const imageCode = base64String.split(',')[1];
    const resultDiv = document.getElementById('realtime-result');

    try {
        // Hiện chữ đang quét
        if(resultDiv) {
            resultDiv.innerHTML = "🔍 Đang phân tích...";
            resultDiv.style.color = "orange";
        }

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: imageCode })
        });

        const data = await response.json();

        // --- CẬP NHẬT GIAO DIỆN ---
        
        // 1. Cập nhật dòng chữ dưới video
        if (data.disease_name && resultDiv) {
            resultDiv.innerHTML = `🌿 <b>${data.disease_name}</b> (${(data.confidence * 100).toFixed(0)}%)`;
            resultDiv.style.color = (data.disease_name === "Healthy") ? "green" : "red";
        }

        // 2. Cập nhật bảng báo cáo chi tiết (Hàm updateReport cũ của bạn)
        // Chuẩn hóa dữ liệu để khớp với hàm updateReport
        const reportData = {
            disease: data.disease_name || "Không rõ",
            cause: data.cause || "Đang cập nhật...",
            solution: data.solution || "Đang cập nhật...",
            status: (data.disease_name === "Healthy" || data.disease_name === "Khỏe mạnh") ? "safe" : "danger"
        };
        
        updateReport(reportData);

    } catch (error) {
        console.error("Lỗi kết nối:", error);
        if(resultDiv) resultDiv.innerHTML = "⚠️ Mất kết nối Server";
    }
}

// ======================================================
// 5. CẬP NHẬT BẢNG KẾT QUẢ CHI TIẾT (UI)
// ======================================================
function updateReport(data) {
    // Kiểm tra xem các thẻ HTML có tồn tại không trước khi gán
    const nameEl = document.getElementById('aiDiseaseName');
    const causeEl = document.getElementById('aiCause');
    const solEl = document.getElementById('aiSolution');
    const statusEl = document.getElementById('plantStatus');

    if (nameEl) nameEl.innerText = data.disease;
    if (causeEl) causeEl.innerText = data.cause;
    if (solEl) solEl.innerText = data.solution;

    if (statusEl) {
        if (data.status === 'safe') {
            statusEl.className = 'status-display status-safe';
            statusEl.innerHTML = '<i class="fas fa-check-circle"></i> AN TOÀN';
        } else {
            statusEl.className = 'status-display status-danger';
            statusEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i> NGUY HIỂM';
        }
    }
}

// ======================================================
// 6. DỪNG QUÉT
// ======================================================
function stopScanning() {
    if (scanningInterval) clearInterval(scanningInterval);
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    stream = null;
    
    const videoEl = document.getElementById('video');
    const resultDiv = document.getElementById('realtime-result');
    
    if(videoEl) videoEl.style.display = 'none';
    if(resultDiv) resultDiv.innerHTML = "🛑 Đã dừng";
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






