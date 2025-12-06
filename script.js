// ======================================================
// 🌷 SMART FARM HPU2S - FULL SCRIPT (FINAL)
// ======================================================

// 1. IMPORT FIREBASE (Dùng bản online để không cần cài đặt)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ⚠️ CẤU HÌNH FIREBASE (DÁN MÃ CỦA BẠN VÀO ĐÂY) ⚠️
 const firebaseConfig = { 
  apiKey : "AIzaSyAQSoG7YJbap3d47qqhEfZWc3kIJr35B5M" , 
  authDomain : "hpu2sfarm.firebaseapp.com" , 
  projectId : "hpu2sfarm" , 
  storageBucket : "hpu2sfarm.firebasestorage.app" , 
  messagingSenderId : "1028216215776" , 
  appId : "1:1028216215776:web:c324f55584da10b698d885" , 
  measurementId : "G-G3FH2ZNDJ0" 
};

// Khởi tạo biến
let app, auth, db;
let isOfflineMode = true; // Mặc định chế độ offline nếu chưa có config

try {
    if (firebaseConfig.apiKey) {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        isOfflineMode = false;
        console.log("🔥 Firebase đã kết nối!");
    } else {
        console.warn("⚠️ Chưa có mã Firebase -> Chạy chế độ Offline (LocalStorage)");
    }
} catch (e) {
    console.error("Lỗi khởi tạo:", e);
}

// ======================================================
// 🔐 PHẦN 1: QUẢN LÝ TÀI KHOẢN (AUTH)
// ======================================================

// Chuyển đổi qua lại giữa Đăng nhập / Đăng ký
window.toggleAuthMode = (mode) => {
    document.getElementById('register-form').classList.toggle('hidden', mode === 'login');
    document.getElementById('login-form').classList.toggle('hidden', mode !== 'login');
};

// Xử lý ĐĂNG KÝ
window.handleRegister = async (e) => {
    e.preventDefault();
    
    // Lấy dữ liệu từ form
    const user = {
        name: document.getElementById('reg-name').value,
        contact: document.getElementById('reg-contact').value, // SĐT gốc
        pass: document.getElementById('reg-pass').value,
        dob: document.getElementById('reg-dob').value,
        loc: document.getElementById('reg-loc').value,
        color: '#ffe3e8' // Màu mặc định
    };

    // Tạo email giả nếu người dùng nhập SĐT
    let emailAuth = user.contact;
    if (!emailAuth.includes('@')) emailAuth += "@smartfarm.local";

    const btn = document.querySelector('#register-form .btn-submit');
    btn.innerText = "Đang xử lý...";

    try {
        if (!isOfflineMode) {
            // Lưu lên Firebase
            const cred = await createUserWithEmailAndPassword(auth, emailAuth, user.pass);
            await setDoc(doc(db, "users", cred.user.uid), { ...user, emailAuth });
        } else {
            // Lưu vào máy (Offline)
            localStorage.setItem('sfUser', JSON.stringify(user));
        }
        
        alert("✅ Đăng ký thành công! Đang chuyển hướng...");
        window.toggleAuthMode('login'); // Chuyển sang màn đăng nhập
    } catch (err) {
        let msg = err.message;
        if(msg.includes("email-already-in-use")) msg = "Tài khoản này đã tồn tại!";
        if(msg.includes("weak-password")) msg = "Mật khẩu yếu quá (cần 6 ký tự)!";
        alert("❌ Lỗi: " + msg);
    }
    btn.innerText = "Đăng Ký ✨";
};

// Xử lý ĐĂNG NHẬP
window.handleLogin = async (e) => {
    e.preventDefault();
    const contact = document.getElementById('login-contact').value;
    const pass = document.getElementById('login-pass').value;
    
    let emailAuth = contact;
    if (!emailAuth.includes('@')) emailAuth += "@smartfarm.local";

    const btn = document.querySelector('#login-form .btn-submit');
    btn.innerText = "Đang vào...";

    try {
        if (!isOfflineMode) {
            await signInWithEmailAndPassword(auth, emailAuth, pass);
            // onAuthStateChanged sẽ tự chạy sau khi đăng nhập xong
        } else {
            const user = JSON.parse(localStorage.getItem('sfUser'));
            if (user && user.contact === contact && user.pass === pass) {
                window.loginSuccess(user);
            } else {
                alert("❌ Sai tài khoản hoặc mật khẩu!");
            }
        }
    } catch (err) {
        alert("Lỗi đăng nhập: " + err.message);
    }
    btn.innerText = "Vào Ngay 🔓";
};

// Theo dõi trạng thái đăng nhập (Chỉ dùng cho Firebase)
if (!isOfflineMode) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const docSnap = await getDoc(doc(db, "users", user.uid));
            if (docSnap.exists()) window.loginSuccess(docSnap.data());
        } else {
            // Nếu chưa đăng nhập, hiện màn hình Auth
            document.getElementById('auth-screen').style.display = 'flex';
            document.getElementById('main-app').classList.remove('active');
        }
    });
}

// Hàm chạy khi đăng nhập thành công
window.loginSuccess = (user) => {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('main-app').classList.add('active');
    window.updateUI(user);
    if(user.color) window.changeColor(user.color, false);
};

// Cập nhật giao diện với thông tin người dùng
window.updateUI = (user) => {
    document.getElementById('welcome-msg').innerText = `👋 Hi, ${user.name}!`;
    document.getElementById('sidebar-name').innerText = user.name;
    document.getElementById('sidebar-avatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=ff8fa3&color=fff`;
    
    // Điền thông tin vào phần Cài đặt
    document.getElementById('info-name-box').innerText = user.name;
    document.getElementById('info-contact-box').innerText = user.contact;
    document.getElementById('info-dob-box').innerText = "🎂 " + user.dob;
    
    // Cập nhật vị trí lên Camera
    if(user.loc) {
        document.getElementById('cam-loc-label').innerText = user.loc;
    }
};

window.logout = () => {
    if(confirm("Bạn muốn đăng xuất?")) {
        if (!isOfflineMode) signOut(auth);
        else location.reload();
    }
};

// ======================================================
// ⚙️ PHẦN 2: CÁC CHỨC NĂNG CÀI ĐẶT & HỆ THỐNG
// ======================================================

// Chuyển Tab
window.switchTab = (tabId, el) => {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.menu li').forEach(l => l.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    el.classList.add('active');
};

// Đổi màu nền
window.changeColor = async (color, save=true) => {
    document.documentElement.style.setProperty('--bg-color', color);
    if(save && !isOfflineMode && auth.currentUser) {
        await updateDoc(doc(db, "users", auth.currentUser.uid), { color: color });
    }
};

// Đổi cỡ chữ
window.changeFontSize = (size) => {
    document.body.classList.remove('font-small', 'font-medium', 'font-large');
    document.body.classList.add(size);
};

// Chế độ tối
window.toggleTheme = () => {
    document.body.classList.toggle('dark-mode');
};

// Tự động lấy vị trí
window.autoGetLocation = () => {
    const icon = document.querySelector('.btn-loc-icon');
    icon.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    
    if (!navigator.geolocation) {
        alert("Trình duyệt không hỗ trợ vị trí!");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const txt = `Lat: ${pos.coords.latitude.toFixed(2)}, Long: ${pos.coords.longitude.toFixed(2)}`;
            document.getElementById('reg-loc').value = txt;
            icon.innerHTML = '<i class="fa-solid fa-check" style="color:green"></i>';
        },
        (err) => {
            alert("Lỗi lấy vị trí: " + err.message);
            icon.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i>';
        }
    );
};

// Chỉnh sửa thông tin cá nhân
window.openEditModal = async () => {
    let user;
    if(!isOfflineMode && auth.currentUser) {
        const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
        user = snap.data();
    } else {
        user = JSON.parse(localStorage.getItem('sfUser'));
    }
    
    if(user) {
        document.getElementById('edit-name').value = user.name;
        document.getElementById('edit-contact').value = user.contact;
        document.getElementById('edit-dob').value = user.dob;
        document.getElementById('edit-modal').classList.remove('hidden');
    }
};

window.closeEditModal = () => document.getElementById('edit-modal').classList.add('hidden');

window.saveEditInfo = async () => {
    const newData = {
        name: document.getElementById('edit-name').value,
        contact: document.getElementById('edit-contact').value,
        dob: document.getElementById('edit-dob').value
    };
    
    if(!isOfflineMode && auth.currentUser) {
        await updateDoc(doc(db, "users", auth.currentUser.uid), newData);
        const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
        window.updateUI(snap.data());
    } else {
        let user = JSON.parse(localStorage.getItem('sfUser'));
        Object.assign(user, newData);
        localStorage.setItem('sfUser', JSON.stringify(user));
        window.updateUI(user);
    }
    window.closeEditModal();
    alert("✅ Đã cập nhật thông tin!");
};

// ======================================================
// 🎥 PHẦN 3: CAMERA (WEBCAM)
// ======================================================

window.toggleCam = async () => {
    const btn = document.getElementById('btn-cam');
    const img = document.getElementById('cam-img');
    const video = document.getElementById('webcam-feed');
    
    if(btn.innerText === "Kết nối") {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
            // Ẩn ảnh, hiện video
            img.classList.add('hidden'); 
            video.classList.remove('hidden'); 
            document.querySelector('.live-tag').style.display = 'block';
            
            btn.innerText = "Ngắt"; 
            btn.style.background = "red";
        } catch (err) {
            alert("Lỗi Camera: " + err.message + "\nHãy cấp quyền camera cho trình duyệt!");
        }
    } else {
        // Tắt camera
        if(video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
        }
        video.srcObject = null;
        
        // Hiện ảnh, ẩn video
        img.classList.remove('hidden'); 
        video.classList.add('hidden');
        document.querySelector('.live-tag').style.display = 'none';
        
        btn.innerText = "Kết nối"; 
        btn.style.background = "var(--primary-color)";
    }
};

// ======================================================
// 🎵 PHẦN 4: HỆ THỐNG ÂM THANH (AUDIO ENGINE)
// ======================================================

let audioCtx = null;
let customFileUrl = null;
let fileAudioElement = null;

// Hàm khởi tạo bộ âm thanh (AudioContext)
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

// 1. Tạo tiếng Còi Hú (Siren)
function playSiren() {
    initAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sawtooth'; // Âm thanh sắc nhọn
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(1200, audioCtx.currentTime + 0.4);
    osc.frequency.linearRampToValueAtTime(600, audioCtx.currentTime + 0.8);

    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.8);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.8);
}

// 2. Tạo nhạc Chill (Wind Chime)
function playChillMusic() {
    console.log("Đang kích hoạt máy phát nhạc...");
    
    // Tìm thẻ audio trong HTML
    var audio = document.getElementById("player-chill");
    
    if (audio) {
        audio.volume = 1.0; // Bật Max volume
        audio.currentTime = 0; // Tua về đầu
        
        // Lệnh phát nhạc
        var promise = audio.play();
        
        if (promise !== undefined) {
            promise.then(_ => {
                console.log("✅ Đang phát nhạc!");
            }).catch(error => {
                // Nếu lỗi, nó sẽ hiện thông báo chi tiết ra màn hình
                alert("⚠️ Lỗi chặn âm thanh: " + error.message);
                console.log(error);
            });
        }
    } else {
        alert("❌ Lỗi Code: Không tìm thấy thẻ <audio id='player-chill'> trong HTML");
    }
}

// 3. Xử lý file tải lên từ điện thoại
window.handleFileUpload = (input) => {
    const file = input.files[0];
    if(file) {
        customFileUrl = URL.createObjectURL(file);
        document.getElementById('ringtone-select').value = 'custom';
        alert("✅ Đã tải file: " + file.name + "\nBấm nút 'Test Cảnh Báo' để nghe!");
    }
};

function playCustomFile() {
    if(!customFileUrl) {
        alert("Bạn chưa tải file nhạc nào lên! Bấm nút '📂 Tải nhạc' nhé.");
        return;
    }
    
    if (fileAudioElement) {
        fileAudioElement.pause();
        fileAudioElement.currentTime = 0;
    }

    fileAudioElement = new Audio(customFileUrl);
    fileAudioElement.play().catch(e => {
        alert("⚠️ Điện thoại chặn tự phát. Hãy chạm vào màn hình 1 lần rồi thử lại!");
    });
}
// --- DÁN ĐÈ ĐOẠN NÀY VÀO FILE SCRIPT CỦA BẠN ---

window.triggerWarning = () => {
    // [BẪY SỐ 1] Kiểm tra xem nút bấm có ăn không
    alert("📢 BƯỚC 1: Nút bấm ĐÃ nhận lệnh!");

    // 1. Đổi giao diện (giữ nguyên code cũ)
    const statusBox = document.getElementById('health-status');
    if(statusBox) {
        statusBox.className = "alert-box danger";
        statusBox.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> <span>NGUY HIỂM!</span>';
    }

    // 2. Lấy giá trị từ ô chọn nhạc
    const selectBox = document.getElementById('ringtone-select');
    if (!selectBox) {
        alert("❌ LỖI: Không tìm thấy thẻ <select> có id='ringtone-select' trong HTML");
        return;
    }

    const type = selectBox.value;
    
    // [BẪY SỐ 2] Kiểm tra xem code đọc được giá trị gì
    alert("📢 BƯỚC 2: Loại nhạc code đọc được là: [" + type + "]");

    // 3. So sánh và phát nhạc
    if (type === 'siren') {
        alert("➡️ Đang gọi hàm Còi Hú");
        playSiren();
    } 
    else if (type === 'chill') {
        // [BẪY SỐ 3] Đây là đích đến quan trọng nhất
        alert("✅ BƯỚC 3: Tuyệt vời! Code đã chạy vào đúng chỗ phát nhạc Chill.");
        playChillMusic();
    } 
    else if (type === 'custom') {
        alert("➡️ Đang gọi hàm Nhạc Tải Lên");
        playCustomFile();
    } 
    else {
        // [BẪY SỐ 4] Nếu chạy vào đây nghĩa là HTML bị sai value
        alert("❌ LỖI LOGIC: Bạn chọn nhạc Chill nhưng code lại đọc được là [" + type + "]. Hai cái này không giống nhau!");
    }
};
// --- HÀM KÍCH HOẠT CẢNH BÁO ---
window.triggerWarning = () => {
    // 1. Đổi giao diện
    document.getElementById('health-status').className = "alert-box danger";
    document.getElementById('health-status').innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> <span>NGUY HIỂM: Nấm bệnh!</span>';
    
    document.getElementById('val-benh').innerText = "Nấm Phấn Trắng"; 
    document.getElementById('val-benh').style.color = "red";
    document.getElementById('val-mucdo').innerText = "85% (Cao)"; 
    document.getElementById('val-mucdo').style.color = "red";
    document.getElementById('val-thuoc').innerText = "Nano Bạc"; 
    document.getElementById('val-lieu').innerText = "50ml/16L";
    document.getElementById('val-gio').innerText = "Phun ngay!";

    // 2. Phát nhạc
    const type = document.getElementById('ringtone-select').value;

    if (type === 'siren') {
        playSiren(); 
        setTimeout(playSiren, 800); 
        setTimeout(playSiren, 1600);
    } else if (type === 'chill') {
        playChillMusic();
    } else {
        playCustomFile();
    }
};

// Đồng hồ hệ thống
setInterval(()=>{
    const now = new Date();
    document.getElementById('clock').innerText = now.toLocaleTimeString();
    if(document.getElementById('cam-time-label')) 
        document.getElementById('cam-time-label').innerText = now.toLocaleTimeString();
}, 1000);
