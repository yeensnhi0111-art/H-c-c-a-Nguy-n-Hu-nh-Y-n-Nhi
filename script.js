const canvas = document.getElementById('aquariumCanvas');
const ctx = canvas.getContext('2d');
const bgAudio = document.getElementById('bgAudio');
const audioToggle = document.getElementById('audioToggle');
const soundHint = document.getElementById('soundHint');

// Khung ngang 16:9 chuẩn sắc nét
let width = 1280;
let height = 720;

function updateLandscapeLayout() {
    const padX = 24;
    const padY = 64;
    const availW = Math.max(280, window.innerWidth - padX);
    const availH = Math.max(180, window.innerHeight - padY);

    const targetRatio = 16 / 9;
    let displayW = availW;
    let displayH = displayW / targetRatio;

    if (displayH > availH) {
        displayH = availH;
        displayW = displayH * targetRatio;
    }

    canvas.style.width = `${Math.round(displayW)}px`;
    canvas.style.height = `${Math.round(displayH)}px`;

    canvas.width = width;
    canvas.height = height;
}

window.addEventListener('resize', updateLandscapeLayout);
updateLandscapeLayout();

// ================= ÂM THANH (.M4A) CHẠM NHẸ LÀ PHÁT =================
let isPlaying = false;

if (bgAudio) {
    bgAudio.src = 'phimtat.vn-audio-3657.m4a';
    bgAudio.load();
}

function playAudioNow() {
    if (!bgAudio) return;
    bgAudio.play().then(() => {
        isPlaying = true;
        if (audioToggle) audioToggle.textContent = '🔊 Tắt âm thanh';
        if (soundHint) soundHint.classList.add('hidden');
    }).catch(() => {
        isPlaying = false;
    });
}

function toggleAudio() {
    if (!bgAudio) return;
    if (bgAudio.paused) {
        playAudioNow();
    } else {
        bgAudio.pause();
        isPlaying = false;
        if (audioToggle) audioToggle.textContent = '🔇 Bật âm thanh';
    }
}

if (audioToggle) {
    audioToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleAudio();
    });
}

window.addEventListener('DOMContentLoaded', playAudioNow);

['pointerdown', 'touchstart', 'click', 'keydown'].forEach(evtName => {
    document.addEventListener(evtName, () => {
        if (!isPlaying && bgAudio && bgAudio.paused) {
            playAudioNow();
        }
    }, { passive: true });
});

// ================= CẤU HÌNH 8 FILE ẢNH TRÊN GITHUB =================
// facing: chiều đầu của sinh vật trong ảnh gốc ('right' = nhìn sang phải, 'left' = nhìn sang trái)
// Nếu có con nào trong số 3101..3114 có đầu hướng ngược lại với khai báo dưới đây,
// bạn chỉ cần đổi 'right' <-> 'left' của đúng dòng đó là chuẩn 100%.
const assetConfig = [
    { name: 'goldfish', src: 'IMG_3096.jpeg', removeBg: true, facing: 'right', type: 'companion', scale: 0.095 },
    { name: 'turtle',   src: 'IMG_3100.jpeg', removeBg: true, facing: 'right', type: 'leader',    scale: 0.23 },
    { name: 'fish1',    src: 'IMG_3101.jpeg', removeBg: true, facing: 'right', type: 'swim',      scale: 0.13 },
    { name: 'fish2',    src: 'IMG_3103.jpeg', removeBg: true, facing: 'right', type: 'swim',      scale: 0.12 },
    { name: 'fish3',    src: 'IMG_3104.jpeg', removeBg: true, facing: 'left',  type: 'swim',      scale: 0.14 },
    { name: 'fish4',    src: 'IMG_3105.jpeg', removeBg: true, facing: 'left',  type: 'swim',      scale: 0.13 },
    { name: 'bg',       src: 'IMG_3113.jpeg', removeBg: false },
    { name: 'bottom1',  src: 'IMG_3114.jpeg', removeBg: true, facing: 'right', type: 'bottom',    scale: 0.13 }
];

const loadedAssets = {};

/**
 * Tách nền thông minh + làm mịn viền (Anti-Aliased Flood-Fill)
 * Tự lấy mẫu màu nền từ 4 góc ảnh, xóa sạch nền trắng/caro và làm mềm mép biên
 * để con vật không bị viền trắng răng cưa hay mất chi tiết thân.
 */
function removeBackgroundPro(img) {
    try {
        const offCanvas = document.createElement('canvas');
        const w = offCanvas.width = img.naturalWidth || img.width;
        const h = offCanvas.height = img.naturalHeight || img.height;
        if (!w || !h) return img;

        const offCtx = offCanvas.getContext('2d');
        offCtx.drawImage(img, 0, 0);

        const imgData = offCtx.getImageData(0, 0, w, h);
        const data = imgData.data;
        const visited = new Uint8Array(w * h);
        const isBgMask = new Uint8Array(w * h);
        const queue = [];

        // Lấy màu nền trung bình tại 4 góc ảnh
        const corners = [
            0,
            (w - 1) * 4,
            ((h - 1) * w) * 4,
            ((h - 1) * w + (w - 1)) * 4
        ];
        let bgR = 255, bgG = 255, bgB = 255;
        let validCorners = 0, sumR = 0, sumG = 0, sumB = 0;
        corners.forEach(c => {
            if (data[c + 3] > 200) {
                sumR += data[c];
                sumG += data[c + 1];
                sumB += data[c + 2];
                validCorners++;
            }
        });
        if (validCorners > 0) {
            bgR = sumR / validCorners;
            bgG = sumG / validCorners;
            bgB = sumB / validCorners;
        }

        function isBgPixel(idx) {
            if (data[idx + 3] < 40) return true;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);

            // Khoảng cách màu tới màu nền ở góc ảnh
            const dist = Math.hypot(r - bgR, g - bgG, b - bgB);
            const isCloseToCorner = dist < 46 && (max - min) < 28;

            // Xử lý cả nền trắng tinh hoặc ô caro xám-trắng
            const isWhite = (r >= 228 && g >= 228 && b >= 228);
            const isChecker = (max >= 188 && (max - min) <= 15);

            return isCloseToCorner || isWhite || isChecker;
        }

        // Đưa viền ngoài cùng vào hàng đợi loang
        for (let x = 0; x < w; x++) {
            queue.push(x, 0, x, h - 1);
        }
        for (let y = 0; y < h; y++) {
            queue.push(0, y, w - 1, y);
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
                isBgMask[pos] = 1;
                data[idx + 3] = 0;
                queue.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
            }
        }

        // Khử viền trắng mỏng (Feathering 1px sát biên con vật) cho tự nhiên như thật
        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                const pos = y * w + x;
                if (isBgMask[pos] === 0) {
                    const touchBg =
                        isBgMask[pos - 1] ||
                        isBgMask[pos + 1] ||
                        isBgMask[pos - w] ||
                        isBgMask[pos + w];
                    if (touchBg) {
                        const idx = pos * 4;
                        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                        if (brightness > 195) {
                            data[idx + 3] = Math.round(data[idx + 3] * 0.45);
                        } else {
                            data[idx + 3] = Math.round(data[idx + 3] * 0.85);
                        }
                    }
                }
            }
        }

        offCtx.putImageData(imgData, 0, 0);
        return offCanvas;
    } catch (e) {
        return img;
    }
}

function loadAllAssets() {
    const promises = assetConfig.map(item => {
        return new Promise(resolve => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                loadedAssets[item.name] = {
                    ...item,
                    image: item.removeBg ? removeBackgroundPro(img) : img
                };
                resolve();
            };
            img.onerror = () => {
                console.warn('Không tải được:', item.src);
                resolve();
            };
            img.src = item.src;
        });
    });
    return Promise.all(promises);
}

// ================= SINH VẬT BIỂN (CHẠM VẠCH QUAY ĐẦU & BƠI SONG SONG) =================
class SeaCreature {
    constructor(asset, customScale = null, groupRole = null) {
        this.asset = asset;
        this.img = asset.image;
        this.groupRole = groupRole; // 'leader' (rùa 3100) hoặc 'companion' (đàn cá vàng 3096)

        const imgW = this.img.width || 200;
        const imgH = this.img.height || 200;
        const baseSize = height * (customScale || asset.scale);
        const ratio = imgW / imgH;

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
        this.turnScale = 1; // Hiệu ứng lật quay đầu mượt mà
        this.initPosition();
    }

    initPosition() {
        const marginX = this.w * 0.65;
        if (this.type === 'bottom') {
            this.x = marginX + Math.random() * (width - marginX * 2);
            this.y = height - this.h * 0.62 - Math.random() * (height * 0.04);
            this.dir = Math.random() > 0.5 ? 1 : -1;
            this.speed = 0.45 + Math.random() * 0.25;
        } else if (this.type === 'leader') {
            // Rùa 3100 dẫn đội hình bơi ngang ở tầng giữa
            this.x = width * 0.35;
            this.y = height * 0.46;
            this.dir = 1;
            this.speed = 1.15;
            this.targetY = this.y;
        } else if (this.type === 'companion') {
            // Đàn cá vàng 3096 khởi tạo quanh rùa, sẽ cập nhật đồng bộ theo rùa ở update()
            this.offsetX = (Math.random() - 0.5) * 190;
            this.offsetY = (Math.random() - 0.5) * 115;
            this.x = width * 0.35 + this.offsetX;
            this.y = height * 0.46 + this.offsetY;
            this.dir = 1;
            this.speed = 1.15;
        } else {
            this.x = marginX + Math.random() * (width - marginX * 2);
            this.y = height * 0.22 + Math.random() * (height * 0.5);
            this.dir = Math.random() > 0.5 ? 1 : -1;
            this.speed = 0.95 + Math.random() * 0.75;
            this.targetY = this.y;
        }
    }

    update(leader = null) {
        this.phase += 0.05;

        // 1. Đàn cá vàng (IMG_3096) bơi song song cùng lúc với Rùa (IMG_3100)
        if (this.type === 'companion' && leader) {
            this.dir = leader.dir;
            // Vị trí mục tiêu bám song song bên cạnh/phía sau nhẹ so với rùa theo hướng bơi
            const desiredX = leader.x - this.dir * 65 + this.offsetX;
            const desiredY = leader.y + this.offsetY + Math.sin(this.phase * 0.9) * 8;

            this.x += (desiredX - this.x) * 0.045;
            this.y += (desiredY - this.y) * 0.045;
            this.tilt = Math.sin(this.phase * 0.8) * 0.045;

            // Giữ không vượt quá vạch biên của hồ
            const minX = this.w * 0.55;
            const maxX = width - this.w * 0.55;
            if (this.x < minX) this.x = minX;
            if (this.x > maxX) this.x = maxX;
        }
        // 2. Sinh vật tầng đáy (chạm vạch trái/phải thì quay đầu lại)
        else if (this.type === 'bottom') {
            const step = Math.max(0, Math.sin(this.phase * 1.4));
            this.x += this.dir * this.speed * (0.35 + step * 0.8);

            const minX = this.w * 0.6;
            const maxX = width - this.w * 0.6;
            if (this.x >= maxX) {
                this.x = maxX;
                this.dir = -1;
            } else if (this.x <= minX) {
                this.x = minX;
                this.dir = 1;
            }
            this.tilt = Math.sin(this.phase * 0.5) * 0.03;
        }
        // 3. Rùa (leader) & các loài cá bơi tự do: chạm vạch biên thì quay đầu lại mượt mà
        else {
            const thrust = 0.84 + Math.sin(this.phase) * 0.2;
            this.x += this.dir * this.speed * thrust;

            if (Math.random() < 0.004) {
                this.targetY = height * 0.22 + Math.random() * (height * 0.5);
            }
            this.y += (this.targetY - this.y) * 0.008 + Math.sin(this.phase * 0.6) * 0.35;
            this.tilt = Math.sin(this.phase * 0.6) * 0.04;

            // Vạch biên trái và phải của khung hồ
            const leftBoundary = this.w * 0.6;
            const rightBoundary = width - this.w * 0.6;

            if (this.x >= rightBoundary && this.dir === 1) {
                this.x = rightBoundary;
                this.dir = -1;
                this.turnScale = 0.25; // Bắt đầu xoay người quay đầu
            } else if (this.x <= leftBoundary && this.dir === -1) {
                this.x = leftBoundary;
                this.dir = 1;
                this.turnScale = 0.25;
            }
        }

        // Phục hồi độ mở ngang mượt mà sau khi quay đầu
        this.turnScale += (1 - this.turnScale) * 0.14;
    }

    draw() {
        if (!this.img) return;
        ctx.save();
        ctx.translate(this.x, this.y);

        // Chuẩn hóa hướng đầu:
        // Nếu ảnh gốc hướng phải ('right') và đang bơi trái (dir === -1) -> lật ngang (-1)
        // Nếu ảnh gốc hướng trái ('left') và đang bơi phải (dir === 1) -> lật ngang (-1)
        let flipX = 1;
        if (this.facing === 'right' && this.dir < 0) flipX = -1;
        if (this.facing === 'left' && this.dir > 0) flipX = -1;

        ctx.scale(flipX * this.turnScale, 1);
        ctx.rotate(this.tilt || 0);

        // Nhịp uốn nhẹ khi bơi
        const flex = 1 + Math.sin(this.phase) * 0.018;
        ctx.scale(flex, 1);

        ctx.drawImage(this.img, -this.w / 2, -this.h / 2, this.w, this.h);
        ctx.restore();
    }
}

// ================= BONG BÓNG NƯỚC & CHỮ "YEN NHI" =================
class Bubble {
    constructor(targetX = null, targetY = null, isTextBubble = false) {
        this.isTextBubble = isTextBubble;
        this.targetX = targetX;
        this.targetY = targetY;

        this.x = Math.random() * width;
        this.y = height + Math.random() * 180;
        this.r = isTextBubble ? (Math.random() * 1.6 + 2.2) : (Math.random() * 4 + 1.5);
        this.speed = Math.random() * 1.4 + 0.7;
        this.wobble = Math.random() * Math.PI * 2;
    }

    update(time) {
        this.wobble += 0.05;
        if (this.isTextBubble) {
            const floatY = this.targetY + Math.sin(time * 0.002 + this.targetX * 0.02) * 5;
            const floatX = this.targetX + Math.cos(time * 0.002 + this.targetY * 0.02) * 2.5;
            this.x += (floatX - this.x) * 0.04;
            this.y += (floatY - this.y) * 0.04;
        } else {
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

        const grad = ctx.createRadialGradient(
            this.x - this.r * 0.3, this.y - this.r * 0.3, this.r * 0.1,
            this.x, this.y, this.r
        );
        if (this.isTextBubble) {
            grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
            grad.addColorStop(0.5, 'rgba(173, 232, 244, 0.65)');
            grad.addColorStop(1, 'rgba(0, 180, 216, 0.25)');
        } else {
            grad.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
            grad.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
        }

        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 0.7;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(this.x - this.r * 0.35, this.y - this.r * 0.35, this.r * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fill();
        ctx.restore();
    }
}

function createTextBubbles(text) {
    const textCanvas = document.createElement('canvas');
    textCanvas.width = width;
    textCanvas.height = height;
    const tCtx = textCanvas.getContext('2d');

    const fontSize = 105;
    tCtx.font = `900 ${fontSize}px "Arial Black", Impact, sans-serif`;
    tCtx.fillStyle = '#ffffff';
    tCtx.textAlign = 'center';
    tCtx.textBaseline = 'middle';
    tCtx.fillText(text, width / 2, height * 0.2);

    const imgData = tCtx.getImageData(0, 0, width, height).data;
    const bubbles = [];
    const gap = 7;

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

// ================= ÁNH SÁNG MẶT NƯỚC & VẠCH HỒ CÁ =================
function drawAquariumEffects(time) {
    // Tia sáng xuyên mặt nước
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 4; i++) {
        const x = width * (0.18 + i * 0.21) + Math.sin(time * 0.0007 + i * 1.4) * 45;
        const grad = ctx.createLinearGradient(x, 0, x + 90, height * 0.75);
        grad.addColorStop(0, 'rgba(140, 225, 255, 0.13)');
        grad.addColorStop(1, 'rgba(140, 225, 255, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(x - 35, 0);
        ctx.lineTo(x + 45, 0);
        ctx.lineTo(x + 190, height * 0.75);
        ctx.lineTo(x - 85, height * 0.75);
        ctx.closePath();
        ctx.fill();
    }

    // Gợn sóng mặt nước phía trên
    ctx.strokeStyle = 'rgba(200, 245, 255, 0.28)';
    ctx.lineWidth = 2;
    for (let row = 0; row < 3; row++) {
        const baseY = 18 + row * 12;
        ctx.beginPath();
        for (let x = 0; x <= width; x += 24) {
            const wy = baseY + Math.sin(x * 0.02 + time * 0.0022 + row) * 4.5;
            if (x === 0) ctx.moveTo(x, wy);
            else ctx.lineTo(x, wy);
        }
        ctx.stroke();
    }
    ctx.restore();

    // Đường vạch kính bể cá tinh tế hai bên để thấy rõ điểm quay đầu của sinh vật
    ctx.save();
    ctx.strokeStyle = 'rgba(173, 232, 244, 0.35)';
    ctx.lineWidth = 3;
    ctx.strokeRect(4, 4, width - 8, height - 8);
    ctx.restore();
}

// ================= KHỞI CHẠY HỒ CÁ =================
let leaderCreature = null;
let creatures = [];
let bgBubbles = [];
let textBubbles = [];

loadAllAssets().then(() => {
    // 1. Tạo Rùa biển (IMG_3100) dẫn đầu
    if (loadedAssets.turtle && loadedAssets.turtle.image) {
        leaderCreature = new SeaCreature(loadedAssets.turtle, loadedAssets.turtle.scale, 'leader');
        creatures.push(leaderCreature);
    }

    // 2. Tạo đàn cá vàng (IMG_3096) bơi song song cùng lúc với rùa
    if (loadedAssets.goldfish && loadedAssets.goldfish.image) {
        for (let i = 0; i < 6; i++) {
            const scale = loadedAssets.goldfish.scale * (0.85 + Math.random() * 0.25);
            creatures.push(new SeaCreature(loadedAssets.goldfish, scale, 'companion'));
        }
    }

    // 3. Tạo các loài sinh vật khác bơi trong hồ
    const otherPlan = [
        { name: 'fish1',   count: 3 },
        { name: 'fish2',   count: 2 },
        { name: 'fish3',   count: 3 },
        { name: 'fish4',   count: 3 },
        { name: 'bottom1', count: 2 }
    ];

    otherPlan.forEach(item => {
        const asset = loadedAssets[item.name];
        if (asset && asset.image) {
            for (let i = 0; i < item.count; i++) {
                const randomScale = asset.scale * (0.88 + Math.random() * 0.24);
                creatures.push(new SeaCreature(asset, randomScale));
            }
        }
    });

    for (let i = 0; i < 55; i++) {
        bgBubbles.push(new Bubble());
    }

    textBubbles = createTextBubbles("YEN NHI");

    function animate(time) {
        ctx.clearRect(0, 0, width, height);

        // Vẽ ảnh nền IMG_3113.jpeg
        if (loadedAssets.bg && loadedAssets.bg.image) {
            const bg = loadedAssets.bg.image;
            const bgW = bg.naturalWidth || bg.width;
            const bgH = bg.naturalHeight || bg.height;
            const scale = Math.max(width / bgW, height / bgH);
            const nw = bgW * scale;
            const nh = bgH * scale;
            ctx.drawImage(bg, (width - nw) / 2, (height - nh) / 2, nw, nh);
        }

        // Cập nhật và vẽ sinh vật (truyền leaderCreature để đàn cá vàng bơi song song)
        creatures.forEach(c => {
            c.update(leaderCreature);
            c.draw();
        });

        // Bong bóng nước & chữ bong bóng "YEN NHI"
        bgBubbles.forEach(b => {
            b.update(time);
            b.draw();
        });

        textBubbles.forEach(b => {
            b.update(time);
            b.draw();
        });

        drawAquariumEffects(time);

        requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
});
