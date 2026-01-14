from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import cv2
import numpy as np
from ultralytics import YOLO
import gc # <--- QUAN TRỌNG: Thư viện dọn rác bộ nhớ

# 1. Khởi tạo Flask App
app = Flask(__name__)
CORS(app) 

# --- TỐI ƯU 1: Dùng Model Nano (Nhẹ nhất) ---
# Thay vì 'yolov11s.pt', hãy dùng 'yolo11n.pt' (Nano) hoặc 'yolov8n.pt'
# Model này chỉ tốn khoảng 100-200MB Ram khi chạy
try:
    model = YOLO('yolo11n.pt') 
except:
    # Phòng trường hợp chưa có v11 thì dùng v8n
    model = YOLO('yolov8n.pt')

# 3. Cơ sở dữ liệu bệnh
DISEASE_INFO = {
    'safe': {
        'status': 'safe',
        'disease': 'Cây khỏe mạnh',
        'cause': 'Môi trường, độ ẩm, ánh sáng đạt chuẩn.',
        'solution': 'Tiếp tục duy trì chế độ chăm sóc hiện tại.'
    },
    'danger_bug': {
        'status': 'danger',
        'disease': 'Phát hiện sâu bệnh/Côn trùng',
        'cause': 'Có sự xuất hiện của côn trùng gây hại.',
        'solution': 'Sử dụng lưới chắn hoặc thuốc sinh học Neem Oil.'
    },
    'unknown': {
        'status': 'safe',
        'disease': 'Chưa phát hiện cây',
        'cause': 'Camera chưa nhìn thấy cây trồng.',
        'solution': 'Điều chỉnh góc quay camera vào cây.'
    }
}

@app.route('/detect', methods=['POST'])
def detect():
    img = None
    results = None
    try:
        # 1. Nhận dữ liệu ảnh từ Web (Base64)
        data = request.json['image']
        header, encoded = data.split(",", 1)
        
        # 2. Chuyển Base64 thành ảnh OpenCV
        nparr = np.frombuffer(base64.b64decode(encoded), np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        # --- TỐI ƯU 2: Resize ảnh về 640x640 ---
        # Giảm kích thước ma trận ảnh giúp giảm 80% RAM tiêu thụ
        img = cv2.resize(img, (640, 640))

        # 3. Chạy YOLO để nhận diện
        results = model(img)
        
        # 4. Phân tích kết quả
        detected_classes = []
        for result in results:
            for box in result.boxes:
                class_id = int(box.cls[0])
                class_name = model.names[class_id]
                detected_classes.append(class_name)

        print("YOLO thấy:", detected_classes) 

        # --- LOGIC XỬ LÝ (MẪU) ---
        response_data = DISEASE_INFO['unknown']

        # Logic giả định: Nếu thấy chậu cây (potted plant) -> Khỏe
        # Bạn cần in cái `detected_classes` ra xem model của bạn nhận diện ra chữ gì nhé
        if 'potted plant' in detected_classes or 'vase' in detected_classes:
            response_data = DISEASE_INFO['safe']
        
        # Logic giả định: Thấy chim, mèo -> Cảnh báo
        if 'bird' in detected_classes or 'cat' in detected_classes: 
            response_data = DISEASE_INFO['danger_bug']

        return jsonify(response_data)

    except Exception as e:
        print("Lỗi:", e)
        return jsonify({'error': str(e)}), 500

    finally:
        # --- TỐI ƯU 3: Dọn rác bộ nhớ bắt buộc ---
        # Dù chạy thành công hay thất bại đều phải xóa biến
        try:
            del img
            del results
            gc.collect() # Ép hệ thống thu hồi RAM ngay lập tức
        except:
            pass

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
