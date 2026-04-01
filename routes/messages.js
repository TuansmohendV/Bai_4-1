var express = require("express");
var router = express.Router();
let { uploadImage } = require('../utils/uploadHandler');

// Dữ liệu giả lập lưu trong bộ nhớ tạm (Array)
let fakeMessages = [];

// ID giả lập của người dùng hiện tại (Current User)
// Thay vì dùng CheckLogin cần Token và MongoDB, ta gán cứng ID này
const CURRENT_USER_ID = "user_me_001"; 

// Middleware giả lập Auth: gán req.user bằng một user ảo
router.use((req, res, next) => {
    req.user = { 
        _id: CURRENT_USER_ID, 
        username: "MockCurrentUser" 
    };
    next();
});

// 1. GET / - lấy message cuối cùng của mỗi user mà user hiện tại nhắn tin hoặc ngược lại
router.get('/', function(req, res, next) {
    try {
        let currentUserId = req.user._id;
        
        // Lấy tất cả tin nhắn liên quan tới mình
        let myMessages = fakeMessages.filter(
            m => m.from === currentUserId || m.to === currentUserId
        );
        
        // Sắp xếp theo thứ tự mới nhất (từ cuối tới đầu mảng)
        let map = new Map();
        
        myMessages.slice().reverse().forEach(m => {
            // Xác định người chat cùng là ai (partner)
            let partnerId = m.from === currentUserId ? m.to : m.from;
            
            // Nếu partner này chưa có trong Map, thì đây là tin nhắn mới nhất
            if (!map.has(partnerId)) {
                map.set(partnerId, {
                    partnerId: partnerId,
                    message: m
                });
            }
        });

        res.status(200).send({
            success: true,
            data: Array.from(map.values())
        });
    } catch(error) {
        res.status(500).send({ message: error.message });
    }
});

// 2. GET /:userID - lấy toàn bộ message giữa currentUser và userID (từ 2 phía)
router.get('/:userID', function(req, res, next) {
    try {
        let currentUserId = req.user._id;
        let targetUserId = req.params.userID;

        let messages = fakeMessages.filter(
            m => 
                (m.from === currentUserId && m.to === targetUserId) ||
                (m.from === targetUserId && m.to === currentUserId)
        );

        res.status(200).send({
            success: true,
            data: messages
        });
    } catch(error) {
        res.status(500).send({ message: error.message });
    }
});

// 3. POST / - Gửi message mới (có hỗ trợ gửi file hoặc text)
router.post('/', uploadImage.single('file'), function(req, res, next) {
    try {
        let currentUserId = req.user._id;
        let { to, text } = req.body;
        
        if (!to) {
             return res.status(400).send({ message: "Người nhận (to) không được để trống. Vui lòng gửi field 'to' trong body." });
        }

        let messageData = {
            id: new Date().getTime().toString(), // Tạo ID giả
            from: currentUserId,
            to: to,
            messageContent: {},
            createdAt: new Date()
        };

        if (req.file) {
            // Trường hợp có file upload
            messageData.messageContent = {
                type: 'file',
                text: req.file.path
            };
        } else {
            // Trường hợp gửi text thường
            if (!text) {
                return res.status(400).send({ message: "Nội dung tin nhắn không được để trống. Cần truyền file hoặc field 'text'." });
            }
            messageData.messageContent = {
                type: 'text',
                text: text
            };
        }

        fakeMessages.push(messageData);

        res.status(201).send({
            success: true,
            message: "Gửi tin nhắn thành công!",
            data: messageData
        });
    } catch(error) {
        res.status(500).send({ message: error.message });
    }
});

module.exports = router;
