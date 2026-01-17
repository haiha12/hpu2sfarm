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
// CÁC HÀM XỬ LÝ
// ======================================================

// 1. Hàm bật Camera và TỰ ĐỘNG QUÉT
async function startRealTimeCamera() {
    try {
        const videoEl = document.getElementById('video');
        
        // Mở Camera sau
        stream = await navigator.mediaDevices.getUserMedia({
            video: { 
                facingMode: 'environment',
                width: { ideal: 640 },  // Giảm độ phân giải chút cho nhẹ
                height: { ideal: 480 }
            }
        });

        videoEl.srcObject = stream;
        videoEl.style.display = 'block';
        
        // Bắt đầu vòng lặp quét (2 giây 1 lần)
        startScanningLoop();

    } catch (err) {
        console.error("Lỗi Camera:", err);
        alert("Không mở được Camera. Vui lòng cấp quyền!");
    }
}

// 2. Vòng lặp tự động gửi ảnh (Core của Real-time)
function startScanningLoop() {
    // Nếu đang chạy rồi thì thôi
    if (scanningInterval) clearInterval(scanningInterval);

    // Cài đặt: Cứ 2000ms (2 giây) thì chạy hàm processFrame 1 lần
    scanningInterval = setInterval(processFrame, 2000);
}

// 3. Hàm xử lý từng khung hình
async function processFrame() {
    // Nếu đang bận xử lý ảnh trước hoặc camera chưa bật -> Bỏ qua
    if (isProcessing || !stream) return;

    try {
        isProcessing = true; // Đánh dấu là đang bận

        // Lấy khung hình từ video vẽ lên canvas ẩn
        const videoEl = document.getElementById('video');
        const canvasEl = document.getElementById('canvas');
        
        if (videoEl.readyState !== videoEl.HAVE_ENOUGH_DATA) {
            isProcessing = false;
            return;
        }

        canvasEl.width = videoEl.videoWidth;
        canvasEl.height = videoEl.videoHeight;
        const ctx = canvasEl.getContext('2d');
        ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);

        // Chuyển thành Base64
        const base64Image = canvasEl.toDataURL('image/jpeg', 0.7); // Nén chất lượng 0.7 cho nhẹ
        
        // Gửi lên Server
        await sendToServer(base64Image);

    } catch (err) {
        console.error("Lỗi xử lý frame:", err);
    } finally {
        isProcessing = false; // Xử lý xong, mở cờ để nhận ảnh tiếp theo
    }
}

// 4. Gửi dữ liệu lên AI Server
async function sendToServer(base64String) {
    const API_URL = 'https://hpu2sfarm-backend-1ho4.onrender.com/detect';
    const imageCode = base64String.split(',')[1];
    const resultDiv = document.getElementById('realtime-result');

    try {
        // Hiện trạng thái đang quét...
        resultDiv.innerHTML = "🔍 Đang phân tích...";
        resultDiv.style.color = "orange";

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: imageCode })
        });

        const data = await response.json();

        // Cập nhật kết quả lên màn hình mà không cần reload
        if (data.disease_name) {
            resultDiv.innerHTML = `🌿 <b>${data.disease_name}</b><br><small>Độ tin cậy: ${(data.confidence * 100).toFixed(1)}%</small>`;
            
            // Đổi màu chữ tùy kết quả
            if (data.disease_name === "Healthy" || data.disease_name === "Khỏe mạnh") {
                resultDiv.style.color = "green";
            } else {
                resultDiv.style.color = "red";
            }
        } else {
            resultDiv.innerHTML = "❓ Không nhận diện được";
        }

    } catch (error) {
        console.error(error);
        resultDiv.innerHTML = "⚠️ Mất kết nối Server";
    }
}

// 5. Hàm dừng quét (khi tắt trang hoặc bấm dừng)
function stopScanning() {
    if (scanningInterval) clearInterval(scanningInterval);
    if (stream) stream.getTracks().forEach(track => track.stop());
    stream = null;
    document.getElementById('video').style.display = 'none';
    document.getElementById('realtime-result').innerHTML = "";
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





