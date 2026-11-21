const canvas = document.getElementById('aquariumCanvas');
const ctx = canvas.getContext('2d');
const loadingEl = document.getElementById('loading');

let width, height;
function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Danh sách tài nguyên ảnh và hướng mặc định của đầu con vật trong ảnh gốc ('left', 'right', hoặc 'none')
const assetConfig = [
    { name: 'bg', src: 'images/bg.jpg', removeBg: false },
    { name: 'crab', src: 'images/crab.jpg', removeBg: true, facing: 'none', type: 'bottom', scale: 0.14 },
    { name: 'starfish', src: 'images/starfish.jpg', removeBg: true, facing: 'none', type: 'bottom', scale: 0.11 },
    { name: 'stingray', src: 'images/stingray.jpg', removeBg: true, facing: 'right', type: 'swim', scale: 0.24 },
    { name: 'pufferfish', src: 'images/pufferfish.jpg', removeBg: true, facing: 'right', type: 'swim', scale: 0.14 },
    { name: 'clownfish', src: 'images/clownfish.jpg', removeBg: true, facing: 'right', type: 'swim', scale: 0.11 },
    { name: 'moorish', src: 'images/moorish.jpg', removeBg: true, facing: 'left', type: 'swim', scale: 0.15 },
    { name: 'bluetang', src: 'images/bluetang.jpg', removeBg: true, facing: 'left', type: 'swim', scale: 0.14 },
    { name: 'seahorse', src: 'images/seahorse.jpg', removeBg: true, facing: 'right', type: 'float', scale: 0.13 },
    { name: 'turtle', src: 'images/turtle.jpg', removeBg: true, facing: 'right', type: 'swim', scale: 0.25 }
];

const loadedAssets = {};

/**
 * Thuật toán Flood-Fill từ các cạnh ảnh để tách nền trắng / nền caro giả PNG
 * Giữ lại hoàn hảo các chi tiết trắng bên trong con vật (như sọc cá hề, gai cá nóc)
 */
function removeBackground(img) {
    const offCanvas = document.createElement('canvas');
    const w = offCanvas.width = img.width;
    const h = offCanvas.height = img.height;
    const offCtx = offCanvas.getContext('2d');
    offCtx.drawImage(img, 0, 0);

    const imgData = offCtx.getImageData(0, 0, w, h);
    const data = imgData.data;
    const visited = new Uint8Array(w * h);
    const queue = [];

    // Kiểm tra pixel có phải màu nền không (trắng sáng hoặc xám nhạt của lưới caro)
    function isBgPixel(idx) {
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        // Độ sáng cao và độ bão hòa màu thấp (màu trung tính trắng/xám)
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        return max > 195 && (max - min) < 28;
    }

    // Đưa toàn bộ viền ngoài cùng vào hàng đợi loang
    for (let x = 0; x < w; x++) {
        queue.push(x, 0);
        queue.push(x, h - 1);
    }
    for (let y = 0; y < h; y++) {
        queue.push(0, y);
        queue.push(w - 1, y);
    }

    let head = 0;
    while (head < queue.length) {
        const x = queue[head++];
        const y = queue[head++];
        if (x < 0 || x >= w || y < 0 || y >= h) continue;

        const pos = y * w + x;
        if (visited[pos]) continue;
        visited[pos] = 1;

        const idx = pos * 4;
        if (isBgPixel(idx)) {
            data[idx + 3] = 0; // Làm trong suốt hoàn toàn
            queue.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
        } else {
            // Làm mềm viền (Anti-aliasing nhẹ) để con vật hòa vào nền nước mượt mà
            data[idx + 3] = 220;
        }
    }

    offCtx.putImageData(imgData, 0, 0);
    return offCanvas;
}

// Tải toàn bộ hình ảnh
function loadAllAssets() {
    const promises = assetConfig.map(item => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => {
                loadedAssets[item.name] = {
                    ...item,
                    image: item.removeBg ? removeBackground(img) : img
                };
                resolve();
            };
            img.onerror = () => {
                console.warn(`Không tìm thấy ảnh: ${item.src}`);
                resolve();
            };
            img.src = item.src;
        });
    });
    return Promise.all(promises);
}

// ================= CLASS SINH VẬT BIỂN =================
class SeaCreature {
    constructor(asset, customScale = null) {
        this.asset = asset;
        this.img = asset.image;
        const baseSize = Math.min(width, height) * (customScale || asset.scale);
        const ratio = this.img.width / this.img.height;
        
        if (ratio >= 1) {
            this.w = baseSize;
            this.h = baseSize / ratio;
        } else {
            this.h = baseSize;
            this.w = baseSize * ratio;
        }

        this.type = asset.type;
        this.facing = asset.facing;
        this.phase = Math.random() * Math.PI * 2;
        this.resetPosition(true);
    }

    resetPosition(initial = false) {
        if (this.type === 'bottom') {
            // Cua và sao biển ở dưới đáy san hô
            this.x = Math.random() * (width - this.w) + this.w / 2;
            this.y = height - this.h * 0.65 - Math.random() * (height * 0.08);
            this.vx = (this.asset.name === 'crab') ? (Math.random() > 0.5 ? 0.4 : -0.4) : 0;
            this.vy = 0;
        } else if (this.type === 'float') {
            // Cá ngựa nhấp nhô nhẹ nhàng
            this.x = Math.random() * width;
            this.y = height * 0.35 + Math.random() * (height * 0.4);
            this.vx = (Math.random() > 0.5 ? 1 : -1) * (0.3 + Math.random() * 0.4);
            this.vy = 0;
        } else {
            // Các loài cá bơi lội tự do
            const goRight = Math.random() > 0.5;
            this.vx = (goRight ? 1 : -1) * (0.7 + Math.random() * 1.3);
            this.x = initial ? Math.random() * width : (goRight ? -this.w : width + this.w);
            this.y = height * 0.15 + Math.random() * (height * 0.65);
            this.vy = 0;
        }
    }

    update(time) {
        this.phase += 0.04;

        if (this.type === 'bottom') {
            if (this.asset.name === 'crab') {
                // Cua bò ngang qua lại dưới đáy
                this.x += this.vx;
                if (this.x < this.w || this.x > width - this.w) this.vx *= -1;
                this.tilt = Math.sin(this.phase * 2) * 0.05;
            } else {
                // Sao biển bám đá nhúc nhích nhẹ
                this.tilt = Math.sin(this.phase * 0.5) * 0.04;
            }
        } else if (this.type === 'float') {
            // Cá ngựa trôi dập dềnh theo sóng
            this.x += this.vx;
            this.y += Math.sin(this.phase) * 0.6;
            this.tilt = Math.sin(this.phase * 0.8) * 0.12;
            if (this.x < -this.w) this.x = width + this.w;
            if (this.x > width + this.w) this.x = -this.w;
        } else {
            // Cá bơi lượn sóng sin mượt mà
            this.x += this.vx;
            this.y += Math.sin(this.phase) * 0.7;
            this.tilt = Math.cos(this.phase) * 0.06;

            // Đổi hướng hoặc quay lại khi chạm biên
            if (this.vx > 0 && this.x > width + this.w) {
                if (Math.random() > 0.4) {
                    this.vx = -this.vx; // Quay đầu bơi ngược lại
                } else {
                    this.x = -this.w;
                    this.y = height * 0.15 + Math.random() * (height * 0.65);
                }
            } else if (this.vx < 0 && this.x < -this.w) {
                if (Math.random() > 0.4) {
                    this.vx = -this.vx;
                } else {
                    this.x = width + this.w;
                    this.y = height * 0.15 + Math.random() * (height * 0.65);
                }
            }
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Lật ảnh tự động theo hướng bơi thực tế
        let flipX = 1;
        if (this.facing === 'right' && this.vx < 0) flipX = -1;
        if (this.facing === 'left' && this.vx > 0) flipX = -1;

        ctx.scale(flipX, 1);
        ctx.rotate(this.tilt || 0);

        // Hiệu ứng uốn lượn nhẹ khi bơi (co giãn nhẹ chiều ngang)
        const swimStretch = 1 + Math.sin(this.phase * 2) * 0.02;
        ctx.scale(swimStretch, 1);

        ctx.drawImage(this.img, -this.w / 2, -this.h / 2, this.w, this.h);
        ctx.restore();
    }
}

// ================= HỆ THỐNG BONG BÓNG & CHỮ "YEN NHI" =================
class Bubble {
    constructor(targetX = null, targetY = null, isTextBubble = false) {
        this.isTextBubble = isTextBubble;
        this.targetX = targetX;
        this.targetY = targetY;

        this.x = Math.random() * width;
        this.y = height + Math.random() * 200;
        this.r = isTextBubble ? (Math.random() * 2.5 + 3.2) : (Math.random() * 4 + 1.5);
        this.speed = Math.random() * 1.5 + 0.8;
        this.wobble = Math.random() * Math.PI * 2;
    }

    update(time) {
        this.wobble += 0.05;
        if (this.isTextBubble) {
            // Bong bóng bay từ đáy lên và tụ lại thành hình chữ "YEN NHI" lơ lửng
            const floatY = this.targetY + Math.sin(time * 0.002 + this.targetX * 0.02) * 6;
            const floatX = this.targetX + Math.cos(time * 0.002 + this.targetY * 0.02) * 3;

            this.x += (floatX - this.x) * 0.035;
            this.y += (floatY - this.y) * 0.035;
        } else {
            // Bong bóng nền bay tự nhiên lên mặt nước
            this.y -= this.speed;
            this.x += Math.sin(this.wobble) * 0.6;
            if (this.y < -20) {
                this.y = height + 20;
                this.x = Math.random() * width;
            }
        }
    }

    draw() {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);

        // Tạo hiệu ứng bong bóng nước trong suốt có ánh sáng phản chiếu
        const grad = ctx.createRadialGradient(
            this.x - this.r * 0.3, this.y - this.r * 0.3, this.r * 0.1,
            this.x, this.y, this.r
        );
        if (this.isTextBubble) {
            grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
            grad.addColorStop(0.5, 'rgba(173, 232, 244, 0.55)');
            grad.addColorStop(1, 'rgba(0, 180, 216, 0.25)');
        } else {
            grad.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
            grad.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
        }

        ctx.fillStyle = grad;
        ctx.fill();

        ctx.strokeStyle = this.isTextBubble ? 'rgba(255, 255, 255, 0.75)' : 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Điểm sáng lấp lánh trên bong bóng
        ctx.beginPath();
        ctx.arc(this.x - this.r * 0.35, this.y - this.r * 0.35, this.r * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fill();
        ctx.restore();
    }
}

// Lấy tọa độ các điểm tạo thành chữ "YEN NHI"
function createTextBubbles(text) {
    const textCanvas = document.createElement('canvas');
    textCanvas.width = width;
    textCanvas.height = height;
    const tCtx = textCanvas.getContext('2d');

    const fontSize = Math.min(width * 0.13, 135);
    tCtx.font = `900 ${fontSize}px "Arial Black", Impact, sans-serif`;
    tCtx.fillStyle = '#ffffff';
    tCtx.textAlign = 'center';
    tCtx.textBaseline = 'middle';
    tCtx.fillText(text, width / 2, height * 0.26);

    const imgData = tCtx.getImageData(0, 0, width, height).data;
    const bubbles = [];
    const gap = Math.max(7, Math.floor(fontSize / 15)); // Khoảng cách giữa các bong bóng chữ

    for (let y = 0; y < height; y += gap) {
        for (let x = 0; x < width; x += gap) {
            const alpha = imgData[(y * width + x) * 4 + 3];
            if (alpha > 128) {
                bubbles.push(new Bubble(x, y, true));
            }
        }
    }
    return bubbles;
}

// Vẽ tia nắng xuyên qua mặt nước (God Rays) tăng độ chân thực
function drawLightRays(time) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 4; i++) {
        const x = width * (0.2 + i * 0.2) + Math.sin(time * 0.0008 + i) * 60;
        const grad = ctx.createLinearGradient(x, 0, x + 120, height * 0.85);
        grad.addColorStop(0, 'rgba(130, 220, 255, 0.14)');
        grad.addColorStop(1, 'rgba(130, 220, 255, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(x - 40, 0);
        ctx.lineTo(x + 60, 0);
        ctx.lineTo(x + 240, height * 0.85);
        ctx.lineTo(x - 100, height * 0.85);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();
}

// ================= KHỞI CHẠY HỒ CÁ =================
let creatures = [];
let bgBubbles = [];
let textBubbles = [];

loadAllAssets().then(() => {
    loadingEl.style.opacity = '0';

    // Tạo đàn sinh vật biển đa dạng số lượng
    const spawnPlan = [
        { name: 'turtle', count: 1 },
        { name: 'stingray', count: 1 },
        { name: 'pufferfish', count: 2 },
        { name: 'clownfish', count: 4 },
        { name: 'moorish', count: 3 },
        { name: 'bluetang', count: 3 },
        { name: 'seahorse', count: 2 },
        { name: 'crab', count: 2 },
        { name: 'starfish', count: 2 }
    ];

    spawnPlan.forEach(item => {
        const asset = loadedAssets[item.name];
        if (asset && asset.image) {
            for (let i = 0; i < item.count; i++) {
                // Tạo kích thước hơi khác nhau giữa các con cùng loài cho tự nhiên
                const randomScale = asset.scale * (0.85 + Math.random() * 0.3);
                creatures.push(new SeaCreature(asset, randomScale));
            }
        }
    });

    // Tạo 70 bong bóng nền bay lên
    for (let i = 0; i < 70; i++) {
        bgBubbles.push(new Bubble());
    }

    // Tạo chữ bong bóng "YEN NHI"
    textBubbles = createTextBubbles("YEN NHI");

    // Vòng lặp Animation 60fps
    function animate(time) {
        ctx.clearRect(0, 0, width, height);

        // 1. Vẽ nền đại dương phủ kín màn hình
        if (loadedAssets.bg && loadedAssets.bg.image) {
            const bg = loadedAssets.bg.image;
            const scale = Math.max(width / bg.width, height / bg.height);
            const nw = bg.width * scale;
            const nh = bg.height * scale;
            ctx.drawImage(bg, (width - nw) / 2, (height - nh) / 2, nw, nh);
        }

        // 2. Vẽ hiệu ứng ánh sáng mặt trời dưới nước
        drawLightRays(time);

        // 3. Vẽ bong bóng nền
        bgBubbles.forEach(b => {
            b.update(time);
            b.draw();
        });

        // 4. Vẽ chữ bong bóng "YEN NHI" lơ lửng
        textBubbles.forEach(b => {
            b.update(time);
            b.draw();
        });

        // 5. Vẽ các sinh vật biển bơi lội
        creatures.forEach(c => {
            c.update(time);
            c.draw();
        });

        requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
});

// Cập nhật lại vị trí chữ bong bóng khi thay đổi kích thước cửa sổ
window.addEventListener('resize', () => {
    if (textBubbles.length > 0) {
        textBubbles = createTextBubbles("YEN NHI");
    }
});
