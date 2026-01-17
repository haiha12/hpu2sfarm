const AI_SERVER_URL = "https://hpu2sfarm-backend-eecw.onrender.com/detect"; 

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

function switchView(view) {
    ['registerScreen', 'loginScreen', 'dashboardScreen', 'btnLogout'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.classList.add('hidden');
    });

    if(view === 'login') {
        document.getElementById('loginScreen').classList.remove('hidden');
    }
    if(view === 'register') {
        document.getElementById('registerScreen').classList.remove('hidden');
    }
    if(view === 'dashboard') {
        document.getElementById('dashboardScreen').classList.remove('hidden');
        document.getElementById('btnLogout').classList.remove('hidden');

        startClock();
        initCamera();
        startAI_Loop(); 
    }
}

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

function handleRegister() {
    const name = document.getElementById('regName').value;
    const contact = document.getElementById('regContact').value;
    const pass = document.getElementById('regPass').value;
    const gps = document.getElementById('regGPS').value;

    if (!name || !contact || !pass) {
        alert("Vui lòng điền đầy đủ: Tên, SĐT và Mật khẩu!");
        return;
    }

    const user = {
        name: name,
        contact: contact,
        pass: pass,
        gps: gps,
        role: 'user',
        apiKey: FIREBASE_API_KEY, // Tự động gắn Key vào
        createdAt: new Date().toISOString()
    };

    localStorage.setItem('hpu2s_user_' + contact, JSON.stringify(user));
    
    alert("Đăng ký thành công! Mời bạn đăng nhập.");
    switchView('login');
}

function handleLogin() {
    const contact = document.getElementById('loginContact').value;
    const pass = document.getElementById('loginPass').value;

  if (!contact || !pass) {
        alert("Vui lòng nhập SĐT và Mật khẩu!");
        return;
    }

    const storedUser = localStorage.getItem('hpu2s_user_' + contact);

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

document.getElementById('btnLogout').onclick = () => { 
    stopCamera(); 
    switchView('login'); 
};

let videoStream;
let aiInterval;

async function initCamera() {
    try {
        videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        document.getElementById('webcamVideo').srcObject = videoStream;
    } catch(e) { 
        console.error("Lỗi Camera:", e); 
        alert("Không bật được Camera. Hãy kiểm tra quyền truy cập!");
    }
}

function stopCamera() {
    if(videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
    }
    clearInterval(aiInterval); // Dừng gửi ảnh cho AI
}

function startAI_Loop() {
    aiInterval = setInterval(() => {
        const video = document.getElementById('webcamVideo');
        const canvas = document.getElementById('aiCanvas');
        const context = canvas.getContext('2d');

        if (video.classList.contains('hidden') || !videoStream) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const dataURL = canvas.toDataURL('image/jpeg', 0.7); // Nén chất lượng 0.7 cho nhẹ

        fetch(AI_SERVER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: dataURL })
        })
        .then(response => response.json())
        .then(data => updateReport(data))
        .catch(err => console.log("AI Server chưa bật hoặc lỗi:", err));

    }, 2000); 
}

function updateReport(data) {
    const statusEl = document.getElementById('plantStatus');

    document.getElementById('aiDiseaseName').innerText = data.disease;
    document.getElementById('aiCause').innerText = data.cause;
    document.getElementById('aiSolution').innerText = data.solution;
  
    if (data.status === 'safe') {
        statusEl.className = 'status-display status-safe';
        statusEl.innerHTML = '<i class="fas fa-check-circle"></i> AN TOÀN';
    } else {
        statusEl.className = 'status-display status-danger';
        statusEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i> NGUY HIỂM';
    }
}

function startClock() {
    setInterval(() => {
        const now = new Date();
        document.getElementById('clock').innerText = now.toLocaleTimeString('vi-VN');
    }, 1000);
}

document.addEventListener("DOMContentLoaded", () => {
    switchView('login');
});


