# app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import cv2
import numpy as np
from ultralytics import YOLO
import gc  

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

model = None
try:
    print("🔄 Đang tải model YOLOv11 Nano...")
    model = YOLO('yolov11n.pt') 
except Exception as e:
    print(f"⚠️ Lỗi tải v11n, chuyển sang v8n: {e}")
    model = YOLO('yolov8n.pt')

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

@app.route('/')
def home():
    return "<h1>🌿 HPU2 Farm Backend is Running! 🚀</h1>"

@app.route('/detect', methods=['POST'])
def detect():
    img = None
    results = None
    try:
     { "image": "chuỗi_base64_ở_đây" }
        data = request.json.get('image')
        
        if not data:
            return jsonify({'error': 'Không nhận được dữ liệu ảnh'}), 400

        img_bytes = base64.b64decode(data)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        img = cv2.resize(img, (640, 640))

        results = model(img)

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
        
        response_data = DISEASE_INFO['unknown']
        
        found_disease = False 

        for name in detected_classes:
            if name in DISEASE_INFO and name != 'tea_plant' and name != 'unknown':
                response_data = DISEASE_INFO[name]
                found_disease = True
                break 

        if not found_disease:
            if 'tea_plant' in detected_classes:
                response_data = DISEASE_INFO['tea_plant']

        response_data['confidence'] = max_conf
        response_data['disease_name'] = response_data['disease'] 

        return jsonify(response_data)

    except Exception as e:
        print("❌ Lỗi Server:", str(e))
        return jsonify({'error': str(e)}), 500

    finally:
        try:
            del img
            del results
            gc.collect() 
        except:
            pass

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)

