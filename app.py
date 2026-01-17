from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import cv2
import numpy as np
from ultralytics import YOLO
import gc # Dọn rác bộ nhớ

# 1. Khởi tạo Flask App
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response
# --- TỐI ƯU 1: BẮT BUỘC Dùng Model Nano (n) ---
# Render Free chỉ có 512MB RAM. Dùng bản 's' là sập ngay lập tức.
try:
    print("Đang tải model Nano...")
    model = YOLO('yolov11n.pt') 
except:
    print("Không có v11n, dùng tạm v11n...")
    model = YOLO('yolov8n.pt')

# 2. CƠ SỞ DỮ LIỆU BỆNH (Đã sửa lỗi xuống dòng)
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
        'cause': 'Nấm bệnh (Pestalozzia theae, Colletotrichum camelliae...)',
        'solution': '''Dọn sạch cỏ dại, tiêu hủy tàn dư cây bệnh.
                       Tỉa thưa, cắt tỉa cành để vườn chè thông thoáng.
                       Tưới nước hợp lý, tránh tưới chiều tối.
                       Cân đối dinh dưỡng, tăng lân và kali.'''
    },
    'cham_xam': {
        'status': 'Bị bệnh',
        'disease': 'Bệnh chấm xám',
        'cause': 'Nấm Pestalozzia theae',
        'solution': '''Dọn sạch cỏ dại, lá bệnh, cành khô.
                       Cày vùi lá chè sau đốn để tiêu diệt nguồn nấm.
                       Sử dụng chế phẩm nấm đối kháng (Trichoderma).'''
    },
    'phong_la': {
        'status': 'Bị bệnh',
        'disease': 'Bệnh phồng lá',
        'cause': 'Nấm Exobasidium vexans',
        'solution': '''Vệ sinh vườn chè tránh để cỏ dại um tùm.
                       Cân đối dinh dưỡng, đảm bảo vườn chè thông thoáng.
                       Phun thuốc phòng trừ khi độ ẩm cao.'''
    },
    'chay_la': {
        'status': 'Bị bệnh',
        'disease': 'Bệnh cháy lá',
        'cause': 'Nấm Rhizoctonia solani, Exobasidium spp',
        'solution': '''Cắt bỏ lá bị bệnh, tỉa cành thông thoáng.
                       Dùng lưới che hoặc di chuyển cây đến bóng râm.
                       Giữ đất ẩm đều, tránh úng.'''
    },
    'thoi_bup': {
        'status': 'Bị bệnh',
        'disease': 'Bệnh thối búp',
        'cause': 'Nấm Colletotrichum theae-sinensis',
        'solution': '''Thu gom, tiêu hủy cây bệnh.
                       Trồng thưa hoặc tỉa cành giảm độ ẩm.
                       Bón phân cân đối, không lạm dụng đạm.'''
    },
    'unknown': {
        'status': 'Chưa phát hiện cây',
        'disease': 'Không nhận diện được',
        'cause': 'Camera chưa nhìn rõ cây.',
        'solution': 'Vui lòng đưa camera lại gần lá cây và giữ yên.'
    }
}

# --- THÊM ROUTE TRANG CHỦ (Để hết lỗi 404 khi vào bằng trình duyệt) ---
@app.route('/')
def home():
    return "<h1>HPU2 Farm Backend đang chạy! 🚀</h1><p>Gửi POST request đến /detect để nhận diện.</p>"

@app.route('/detect', methods=['POST'])
def detect():
    img = None
    results = None
    try:
        # 1. Nhận dữ liệu ảnh từ Web (Base64)
        data = request.json.get('image')
        if not data:
             return jsonify({'error': 'No image sent'}), 400

        header, encoded = data.split(",", 1)
        
        # 2. Chuyển Base64 thành ảnh OpenCV
        nparr = np.frombuffer(base64.b64decode(encoded), np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        # --- TỐI ƯU 2: Resize ảnh về 640x640 ---
        img = cv2.resize(img, (640, 640))

        # 3. Chạy YOLO để nhận diện
        results = model(img)
        
        # 4. Lấy danh sách tên class
        detected_classes = []
        for result in results:
            for box in result.boxes:
                class_id = int(box.cls[0])
                # Kiểm tra id có hợp lệ không
                if class_id < len(model.names):
                    class_name = model.names[class_id]
                    detected_classes.append(class_name)

        print("YOLO thấy:", detected_classes) 

        # --- LOGIC XỬ LÝ ƯU TIÊN (Priority Logic) ---
        response_data = DISEASE_INFO['unknown']
        found_disease = False 

        # BƯỚC 1: Tìm BỆNH trước (Quan trọng nhất)
        for name in detected_classes:
            # Nếu tên đó nằm trong từ điển VÀ không phải cây khỏe, không phải unknown
            if name in DISEASE_INFO and name != 'tea_plant' and name != 'unknown':
                response_data = DISEASE_INFO[name]
                found_disease = True
                break # Thấy bệnh là dừng ngay, báo luôn

        # BƯỚC 2: Nếu không có bệnh, mới kiểm tra xem có cây chè không
        if not found_disease:
            if 'tea_plant' in detected_classes:
                response_data = DISEASE_INFO['tea_plant']

        return jsonify(response_data)

    except Exception as e:
        print("Lỗi:", e)
        return jsonify({'error': str(e)}), 500

    finally:
        # --- TỐI ƯU 3: Dọn rác bộ nhớ ---
        try:
            del img
            del results
            gc.collect() 
        except:
            pass

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)




