from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import cv2
import numpy as np
from ultralytics import YOLO

# 1. Khởi tạo Flask App
app = Flask(__name__)
CORS(app)  # Cho phép Web gọi API

model = YOLO('yolov11s.pt') 

# 3. Cơ sở dữ liệu bệnh (Giả lập logic map từ vật thể sang bệnh)
# Trong thực tế, model của bạn sẽ trả về class "dom_la", "chay_la"...
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
    try:
        # 1. Nhận dữ liệu ảnh từ Web (Base64)
        data = request.json['image']
        # Bỏ phần header "data:image/jpeg;base64,"
        header, encoded = data.split(",", 1)
        
        # 2. Chuyển Base64 thành ảnh OpenCV
        nparr = np.frombuffer(base64.b64decode(encoded), np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        # 3. Chạy YOLO để nhận diện
        results = model(img)
        
        # 4. Phân tích kết quả
        # Lấy danh sách các class id mà YOLO nhìn thấy
        detected_classes = []
        for result in results:
            for box in result.boxes:
                class_id = int(box.cls[0])
                class_name = model.names[class_id]
                detected_classes.append(class_name)

        print("YOLO thấy:", detected_classes) # In ra terminal để debug

        # --- LOGIC XỬ LÝ BỆNH (TÙY BIẾN) ---
        # Đây là ví dụ logic. Nếu bạn train model riêng, hãy sửa tên class tương ứng
        response_data = DISEASE_INFO['unknown']

        if 'tea-plant' in detected_classes or 'vase' in detected_classes:
            response_data = DISEASE_INFO['safe']
        
        # Ví dụ: Nếu YOLO thấy cái gì đó lạ (ví dụ 'bird' giả làm sâu) thì báo nguy hiểm
        # Bạn có thể thay bằng logic thực tế của model bạn train
        if 'bird' in detected_classes or 'cat' in detected_classes: 
            response_data = DISEASE_INFO['danger_bug']

        return jsonify(response_data)

    except Exception as e:
        print("Lỗi:", e)
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Chạy server ở cổng 5000
    app.run(debug=True, port=5000)