# app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import cv2
import numpy as np
from ultralytics import YOLO
import gc  # Thư viện dọn rác bộ nhớ (Quan trọng cho Render Free)

# 1. KHỞI TẠO APP
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# 2. LOAD MODEL (Tối ưu cho Server yếu)
# Render Free chỉ có 512MB RAM. Dùng bản 'n' (Nano) là tốt nhất.
model = None
try:
    print("🔄 Đang tải model YOLOv11 Nano...")
    model = YOLO('yolov11n.pt') 
except Exception as e:
    print(f"⚠️ Lỗi tải v11n, chuyển sang v8n: {e}")
    model = YOLO('yolov8n.pt')

# 3. CƠ SỞ DỮ LIỆU BỆNH
DISEASE_INFO = {
    'tea_plant': {
        'status': 'safe',
        'disease': 'Cây khỏe mạnh',
        'cause': 'Môi trường, độ ẩm, ánh sáng đạt chuẩn.',
        'solution': 'Tiếp tục duy trì chế độ chăm sóc hiện tại.'
    },
    'dom_la': {
        'status': 'danger',
        'disease': 'Bệnh đốm lá',
        'cause': 'Nấm bệnh (Pestalozzia theae, Colletotrichum camelliae...)',
        'solution': 'Dọn sạch cỏ dại, tiêu hủy tàn dư. Tỉa thưa, cắt tỉa cành.'
    },
    'cham_xam': {
        'status': 'danger',
        'disease': 'Bệnh chấm xám',
        'cause': 'Nấm Pestalozzia theae',
        'solution': 'Dọn sạch cỏ dại, cày vùi lá bệnh. Dùng chế phẩm Trichoderma.'
    },
    'phong_la': {
        'status': 'danger',
        'disease': 'Bệnh phồng lá',
        'cause': 'Nấm Exobasidium vexans',
        'solution': 'Phun thuốc phòng trừ khi độ ẩm cao. Đảm bảo thông thoáng.'
    },
    'chay_la': {
        'status': 'danger',
        'disease': 'Bệnh cháy lá',
        'cause': 'Nấm Rhizoctonia solani, Exobasidium spp',
        'solution': 'Cắt bỏ lá bệnh. Dùng lưới che hoặc di chuyển cây vào bóng râm.'
    },
    'thoi_bup': {
        'status': 'danger',
        'disease': 'Bệnh thối búp',
        'cause': 'Nấm Colletotrichum theae-sinensis',
        'solution': 'Thu gom cây bệnh. Bón phân cân đối, giảm đạm.'
    },
    'unknown': {
        'status': 'unknown',
        'disease': 'Không nhận diện được',
        'cause': 'Camera chưa nhìn rõ cây hoặc không phải cây chè.',
        'solution': 'Vui lòng đưa camera lại gần lá cây và giữ yên.'
    }
}

# 4. ROUTE TRANG CHỦ (Để kiểm tra Server sống hay chết)
@app.route('/')
def home():
    return "<h1>🌿 HPU2 Farm Backend is Running! 🚀</h1>"

# 5. ROUTE XỬ LÝ NHẬN DIỆN (Duy nhất 1 hàm)
@app.route('/detect', methods=['POST'])
def detect():
    img = None
    results = None
    try:
        # --- BƯỚC 1: NHẬN ẢNH TỪ FRONTEND ---
        # Frontend gửi lên dạng JSON: { "image": "chuỗi_base64_ở_đây" }
        data = request.json.get('image')
        
        if not data:
            return jsonify({'error': 'Không nhận được dữ liệu ảnh'}), 400

        # --- BƯỚC 2: GIẢI MÃ BASE64 THÀNH ẢNH OPENCV ---
        # Vì Frontend đã cắt phần 'data:image...' rồi, nên ta decode trực tiếp
        img_bytes = base64.b64decode(data)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        # --- BƯỚC 3: RESIZE ẢNH (Tối ưu tốc độ) ---
        # Resize về 640x640 giúp AI chạy nhanh hơn
        img = cv2.resize(img, (640, 640))

        # --- BƯỚC 4: CHẠY YOLO ---
        results = model(img)
        
        # --- BƯỚC 5: LẤY KẾT QUẢ ---
        detected_classes = []
        max_conf = 0
        
        for result in results:
            for box in result.boxes:
                class_id = int(box.cls[0])
                conf = float(box.conf[0])
                
                if class_id < len(model.names):
                    class_name = model.names[class_id]
                    detected_classes.append(class_name)
                    if conf > max_conf:
                        max_conf = conf

        print("🔍 AI thấy:", detected_classes) 

        # --- BƯỚC 6: LOGIC ƯU TIÊN (Quan trọng) ---
        # Ưu tiên báo BỆNH trước -> Nếu không có bệnh mới báo KHỎE -> Không thấy gì báo UNKNOWN
        
        response_data = DISEASE_INFO['unknown'] # Mặc định là không rõ
        
        found_disease = False 

        # 6.1. Quét tìm bệnh
        for name in detected_classes:
            if name in DISEASE_INFO and name != 'tea_plant' and name != 'unknown':
                response_data = DISEASE_INFO[name]
                found_disease = True
                break # Thấy bệnh là chốt luôn

        # 6.2. Nếu không có bệnh, kiểm tra xem có phải cây chè khỏe không
        if not found_disease:
            if 'tea_plant' in detected_classes:
                response_data = DISEASE_INFO['tea_plant']

        # Gắn thêm độ tin cậy vào kết quả trả về
        response_data['confidence'] = max_conf
        response_data['disease_name'] = response_data['disease'] # Để khớp với Frontend

        return jsonify(response_data)

    except Exception as e:
        print("❌ Lỗi Server:", str(e))
        return jsonify({'error': str(e)}), 500

    finally:
        # --- BƯỚC 7: DỌN DẸP BỘ NHỚ (Bắt buộc cho Render) ---
        try:
            del img
            del results
            gc.collect() 
        except:
            pass

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
