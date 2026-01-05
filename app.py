from flask import Flask, render_template, Response, request, redirect, url_for, session
import cv2
import pyrebase
import datetime

app = Flask(__name__)
app.secret_key = 'hpu2s_farm_secret'

config = {
    "apiKey": "AIzaSyAQSoG7YJbap3d47qqhEfZWc3kIJr35B5M",
    "authDomain": "hpu2sfarm.firebaseapp.com",
    "databaseURL": "https://hpu2sfarm-default-rtdb.asia-southeast1.firebasedatabase.app/",
    "projectId":  "hpu2sfarm",
    "storageBucket": "hpu2sfarm.firebasestorage.app",
    "messagingSenderId": "1028216215776",
    "appId": "1:1028216215776:web:c324f55584da10b698d885"
}
firebase = pyrebase.initialize_app(config)
db = firebase.database()
# ---------------------------------------------------------

# --- XỬ LÝ CAMERA IOT ---
def generate_frames():
    camera = cv2.VideoCapture(0) # 0 là webcam máy tính
    while True:
        success, frame = camera.read()
        if not success: break
        
        # Giả lập thêm thông tin lên hình ảnh camera
        cv2.putText(frame, "HPU2S Farm CAM-01", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        
        ret, buffer = cv2.imencode('.jpg', frame)
        frame = buffer.tobytes()
        yield (b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

# --- ĐIỀU HƯỚNG WEB ---

@app.route('/')
def index():
    if 'user' in session: return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        # Tìm user trên Firebase
        user = db.child("users").child(username).get().val()
        
        if user and user['password'] == password:
            session['user'] = user['name']
            return redirect(url_for('dashboard'))
        else:
            return render_template('index.html', error="Sai tên đăng nhập hoặc mật khẩu!")
            
    return render_template('index.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        # Lấy tất cả thông tin từ form
        data = {
            "username": request.form.get('username'), # Dùng làm ID
            "password": request.form.get('password'),
            "name": request.form.get('name'),
            "dob": request.form.get('dob'),
            "phone": request.form.get('phone'),
            "gps": request.form.get('gps')
        }
        
        # Kiểm tra trùng lặp
        if db.child("users").child(data['username']).get().val():
            return render_template('register.html', error="Tên đăng nhập này đã có người dùng!")
        
        # Lưu lên Cloud
        db.child("users").child(data['username']).set(data)
        return render_template('index.html', success="Đăng ký thành công! Mời đăng nhập.")
        
    return render_template('register.html')

@app.route('/dashboard')
def dashboard():
    if 'user' not in session: return redirect(url_for('login'))
    
    # Giả lập số liệu báo cáo nông trại
    report = {
        "temp": "26°C",
        "humidity": "75%",
        "soil": "Ổn định",
        "status": "Cây đang phát triển tốt 🌿"
    }
    return render_template('dashboard.html', name=session['user'], report=report)

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/logout')
def logout():
    session.pop('user', None)
    return redirect(url_for('login'))

if __name__ == "__main__":
    app.run(debug=True)

