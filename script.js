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
let stream = null;
let scanningInterval = null;
let isProcessing = false;

// --- 1. CHUYỂN MÀN HÌNH ---
function switchView(viewName) {
    // Ẩn hết
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('registerScreen').classList.add('hidden');
    document.getElementById('dashboardScreen').classList.add('hidden');

    // Hiện cái cần hiện
    const target = document.getElementById(viewName + 'Screen');
    if (target) target.classList.remove('hidden');

    if (viewName === 'dashboard') startClock();
}

// --- 2. ĐĂNG KÝ ---
function handleRegister() {
    const name = document.getElementById('regName').value;
    const contact = document.getElementById('regContact').value;
    const pass = document.getElementById('regPass').value;

    if (!name || !contact || !pass) {
        alert("Vui lòng điền hết các ô!");
        return;
    }

    // Lưu user vào bộ nhớ trình duyệt
    const user = { name, contact, pass };
    localStorage.setItem('user_' + contact, JSON.stringify(user));
    
    alert("Đăng ký thành công! Hãy đăng nhập nhé.");
    switchView('login');
}

// --- 3. ĐĂNG NHẬP ---
function handleLogin() {
    const contact = document.getElementById('loginContact').value;
    const pass = document.getElementById('loginPass').value;

    if (!contact || !pass) {
        alert("Nhập số điện thoại và mật khẩu đi bạn ơi!");
        return;
    }

    // Lấy user từ bộ nhớ
    const savedUser = localStorage.getItem('user_' + contact);
    
    if (savedUser) {
        const user = JSON.parse(savedUser);
        if (user.pass === pass) {
            // Đăng nhập đúng -> Vào Dashboard
            document.getElementById('userNameDisplay').innerText = user.name;
            switchView('dashboard');
        } else {
            alert("Sai mật khẩu rồi!");
        }
    } else {
        alert("Tài khoản này chưa đăng ký!");
    }
}

function handleLogout() {
    stopScanning();
    switchView('login');
}

// --- 4. CAMERA & AI ---
async function startRealTimeCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
        });
        const video = document.getElementById('video');
        video.srcObject = stream;
        video.style.display = 'block'; // Hiện video lên
        
        document.getElementById('realtime-result').innerText = "🔍 Đang soi...";
        
        if (scanningInterval) clearInterval(scanningInterval);
        scanningInterval = setInterval(processFrame, 2000); // 2 giây gửi 1 lần

    } catch (err) {
        alert("Lỗi camera: " + err);
    }
}

async function processFrame() {
    if (isProcessing || !stream) return;
    isProcessing = true;

    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        
        const base64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
        await sendToAI(base64);
    }
    isProcessing = false;
}

async function sendToAI(image) {
    const resDiv = document.getElementById('realtime-result');
    try {
        const req = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: image })
        });
        const data = await req.json();
        
        // Hiển thị kết quả
        if(data.disease_name) {
            resDiv.innerHTML = `🌿 ${data.disease_name} (${(data.confidence*100).toFixed(0)}%)`;
            resDiv.style.color = (data.disease_name === 'Healthy') ? 'green' : 'red';
            
            // Cập nhật báo cáo
            document.getElementById('aiDiseaseName').innerText = data.disease_name;
            document.getElementById('aiSolution').innerText = data.solution || "Đang cập nhật...";
            
            const statusEl = document.getElementById('plantStatus');
            if(data.disease_name === 'Healthy' || data.disease_name === 'Cây khỏe mạnh') {
                 statusEl.innerText = "✅ CÂY KHỎE";
                 statusEl.style.color = "green";
            } else {
                 statusEl.innerText = "⚠️ CÂY BỆNH";
                 statusEl.style.color = "red";
            }
        }
    } catch (e) {
        console.log(e);
    }
}

function stopScanning() {
    if (scanningInterval) clearInterval(scanningInterval);
    if (stream) stream.getTracks().forEach(t => t.stop());
    document.getElementById('video').style.display = 'none';
    document.getElementById('realtime-result').innerText = "Đã dừng.";
}

function startClock() {
    setInterval(() => {
        document.getElementById('clock').innerText = new Date().toLocaleTimeString('vi-VN');
    }, 1000);
}

// Khởi chạy: Vào màn hình Login
document.addEventListener('DOMContentLoaded', () => {
    switchView('login');
});

