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
    'tea_plant': {
        'status': 'An toàn',
        'disease': 'Cây khỏe mạnh',
        'cause': 'Môi trường, độ ẩm, ánh sáng đạt chuẩn.',
        'solution': 'Tiếp tục duy trì chế độ chăm sóc hiện tại.'
    },
    'dom_la': {
        'status': 'Bị bệnh',
        'disease': 'Bệnh đốm lá',
        'cause': 'Nấm bệnh (Pestalozzia theae, Colletotrichum camelliae, Cercospora theae)',
        'solution': 'Dọn sạch cỏ dại, tiêu hủy tàn dư cây bệnh.
                    Tỉa thưa, cắt tỉa cành để vườn chè thông thoáng, đón nắng.
                    Tưới nước hợp lý, tránh tưới vào chiều tối làm ướt lá kéo dài.
                    Cân đối dinh dưỡng, tăng cường lân và kali, tránh bón quá nhiều đạm.
                    Sử dụng các chế phẩm nấm đối kháng như Trichoderma spp., Bacillus subtilis, Pseudomonas spp...'
    },
    'cham_xam': {
        'status': 'Bị bệnh',
        'disease': 'Bệnh chấm xám',
        'cause': 'Nấm Pestalozzia theae',
        'solution': 'Dọn sạch cỏ dại, lá bệnh, cành khô; cày vùi lá chè sau đốn để tiêu diệt nguồn nấm
                    Cắt tỉa, loại bỏ cành bệnh
                    Cân đối dinh dưỡng, tưới nước hợp lý,đảm bảo vường chè thông thoáng
                    Sử dụng các chế phẩm nấm đối kháng như Trichoderma spp., Bacillus subtilis'
    },
    'phong_la': {
        'status': 'Bị bệnh',
        'disease': 'Bệnh phồng lá',
        'cause': 'Nấm Exobasidium vexans',
        'solution': 'Dọn sạch cỏ dại, lá bệnh, cành khô
                    Cắt tỉa, vệ sinh vườn chè tránh để cỏ dại um tùm
                    Cân đối dinh dưỡng, tưới nước hợp lý,đảm bảo vường chè thông thoáng
                    Sử dụng các chế phẩm nấm đối kháng như Trichoderma spp., Bacillus subtilis, Pseudomonas spp'
    },
    'chay_la': {
        'status': 'Bị bệnh',
        'disease': 'Bệnh cháy lá',
        'cause': 'Nấm Rhizoctonia solani, Exobasidium spp',
        'solution': 'Cắt bỏ lá bị bệnh, tỉa cành thông thoáng.
                    Dùng lưới che hoặc di chuyển cây đến bóng râm.
                    Tưới vào sáng sớm/chiều mát, giữ đất ẩm đều, tránh úng
                    Bón phân cân đối, bổ sung vi lượng, đặc biệt khi cây thiếu lân, kali.'
    },
    'thoi_bup': {
        'status': 'Bị bệnh',
        'disease': 'Bệnh thối búp',
        'cause': 'Nấm Colletotrichum theae-sinensis',
        'solution': 'Thu gom, tiêu hủy cây bệnh, lá rụng
                    Trồng thưa hoặc tỉa cành để giảm độ ẩm
                    Tưới vào sáng sớm/chiều mát, giữ đất ẩm đều, tránh úng
                    Bón phân cân đối, bổ sung lân và kali, không lạm dụng đạm'
    },
 
    'unknown': {
        'status': 'Chưa phát hiện cây',
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
        if 'tea_plant' in detected_classes :
            response_data = DISEASE_INFO['tea-plant']
        
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


