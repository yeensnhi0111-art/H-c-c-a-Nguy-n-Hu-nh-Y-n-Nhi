const canvas = document.getElementById('aquariumCanvas');
const ctx = canvas.getContext('2d');
const splashScreen = document.getElementById('splashScreen');
const bgAudio = document.getElementById('bgAudio');
const audioToggle = document.getElementById('audioToggle');

let width, height;
function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// ================= ÂM THANH (.MP4) & MÀN HÌNH CHÀO =================
let isPlaying = false;

function playAudioNow() {
    if (!bgAudio) return Promise.resolve(false);
    return bgAudio.play().then(() => {
        isPlaying = true;
        if (audioToggle) audioToggle.textContent = '🔊 Tắt âm thanh';
        return true;
    }).catch(() => {
        isPlaying = false;
        if (audioToggle) audioToggle.textContent = '🔇 Bật âm thanh';
        return false;
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

// Bấm vào màn hình chào: phát nhạc ngay lập tức rồi mở hồ cá
if (splashScreen) {
    splashScreen.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        playAudioNow();
        splashScreen.classList.add('hidden');
    });
}

// Nút bật/tắt âm thanh ở góc dưới
if (audioToggle) {
    audioToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleAudio();
    });
}

// Thử tự động phát ngay khi tải trang (nếu trình duyệt cho phép)
window.addEventListener('DOMContentLoaded', () => {
    playAudioNow();
});

// Bắt ngay thao tác chạm/bấm đầu tiên trên trang nếu chưa phát
['pointerdown', 'touchstart', 'click', 'keydown'].forEach(evtName => {
    document.addEventListener(evtName, () => {
        if (!isPlaying && bgAudio && bgAudio.paused) {
            playAudioNow();
        }
    }, { passive: true });
});

// ================= DANH SÁCH 10 FILE ẢNH .JPEG TRÊN GITHUB =================
// Nếu ảnh nào bị nhầm vị trí, bạn chỉ cần đổi tên file ở cột src cho khớp
const assetConfig = [
    { name: 'crab', src: 'IMG_3100.jpeg', removeBg: true, facing: 'none', type: 'bottom', scale: 0.16 },
    { name: 'bg', src: 'IMG_3101.jpeg', removeBg: false },
    { name: 'stingray', src: 'IMG_3103.jpeg', removeBg: true, facing: 'right', type: 'swim', scale: 0.25 },
    { name: 'pufferfish', src: 'IMG_3104.jpeg', removeBg: true, facing: 'right', type: 'swim', scale: 0.15 },
    { name: 'clownfish', src: 'IMG_3107.jpeg', removeBg: true, facing: 'right', type: 'swim', scale: 0.12 },
    { name: 'moorish', src: 'IMG_3108.jpeg', removeBg: true, facing: 'left', type: 'swim', scale: 0.16 },
    { name: 'bluetang', src: 'IMG_3109.jpeg', removeBg: true, facing: 'left', type: 'swim', scale: 0.15 },
    { name: 'seahorse', src: 'IMG_3110.jpeg', removeBg: true, facing: 'right', type: 'float', scale: 0.14 },
    { name: 'starfish', src: 'IMG_3113.jpeg', removeBg: true, facing: 'none', type: 'bottom', scale: 0.12 },
    { name: 'turtle', src: 'IMG_3114.jpeg', removeBg: true, facing: 'right', type: 'swim', scale: 0.26 }
];

const loadedAssets = {};

// Thuật toán tách nền trắng / ô caro an toàn cho ảnh .jpeg
function removeBackgroundSafe(img) {
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
        const queue = [];

        function isBgPixel(idx) {
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            return max > 180 && (max - min) < 35;
        }

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
                data[idx + 3] = 0;
                queue.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
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
                    image: item.removeBg ? removeBackgroundSafe(img) : img
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

// ================= SINH VẬT BIỂN =================
class SeaCreature {
    constructor(asset, customScale = null) {
        this.asset = asset;
        this.img = asset.image;

        const imgW = this.img.width || 200;
        const imgH = this.img.height || 200;
        const baseSize = Math.max(75, Math.min(width, height) * (customScale || asset.scale));
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
        this.resetPosition(true);
    }

    resetPosition(initial = false) {
        if (this.type === 'bottom') {
            this.x = Math.random() * Math.max(100, width - this.w) + this.w / 2;
            this.y = height - this.h * 0.65 - Math.random() * (height * 0.08);
            this.vx = (this.asset.name === 'crab') ? (Math.random() > 0.5 ? 0.5 : -0.5) : 0;
        } else if (this.type === 'float') {
            this.x = Math.random() * width;
            this.y = height * 0.35 + Math.random() * (height * 0.4);
            this.vx = (Math.random() > 0.5 ? 1 : -1) * (0.35 + Math.random() * 0.4);
        } else {
            const goRight = Math.random() > 0.5;
            this.vx = (goRight ? 1 : -1) * (0.9 + Math.random() * 1.4);
            this.x = initial ? Math.random() * width : (goRight ? -this.w : width + this.w);
            this.y = height * 0.16 + Math.random() * (height * 0.62);
        }
    }

    update() {
        this.phase += 0.045;

        if (this.type === 'bottom') {
            if (this.asset.name === 'crab') {
                this.x += this.vx;
                if (this.x < this.w * 0.6 || this.x > width - this.w * 0.6) this.vx *= -1;
                this.tilt = Math.sin(this.phase * 2) * 0.05;
            } else {
                this.tilt = Math.sin(this.phase * 0.5) * 0.04;
            }
        } else if (this.type === 'float') {
            this.x += this.vx;
            this.y += Math.sin(this.phase) * 0.65;
            this.tilt = Math.sin(this.phase * 0.8) * 0.12;
            if (this.x < -this.w) this.x = width + this.w;
            if (this.x > width + this.w) this.x = -this.w;
        } else {
            this.x += this.vx;
            this.y += Math.sin(this.phase) * 0.75;
            this.tilt = Math.cos(this.phase) * 0.06;

            if (this.vx > 0 && this.x > width + this.w) {
                if (Math.random() > 0.35) {
                    this.vx = -this.vx;
                } else {
                    this.x = -this.w;
                    this.y = height * 0.16 + Math.random() * (height * 0.62);
                }
            } else if (this.vx < 0 && this.x < -this.w) {
                if (Math.random() > 0.35) {
                    this.vx = -this.vx;
                } else {
                    this.x = width + this.w;
                    this.y = height * 0.16 + Math.random() * (height * 0.62);
                }
            }
        }
    }

    draw() {
        if (!this.img) return;
        ctx.save();
        ctx.translate(this.x, this.y);

        let flipX = 1;
        if (this.facing === 'right' && this.vx < 0) flipX = -1;
        if (this.facing === 'left' && this.vx > 0) flipX = -1;

        ctx.scale(flipX, 1);
        ctx.rotate(this.tilt || 0);

        const swimStretch = 1 + Math.sin(this.phase * 2) * 0.02;
        ctx.scale(swimStretch, 1);

        ctx.drawImage(this.img, -this.w / 2, -this.h / 2, this.w, this.h);
        ctx.restore();
    }
}

// ================= BONG BÓNG & CHỮ "YEN NHI" =================
class Bubble {
    constructor(targetX = null, targetY = null, isTextBubble = false) {
        this.isTextBubble = isTextBubble;
        this.targetX = targetX;
        this.targetY = targetY;

        this.x = Math.random() * width;
        this.y = height + Math.random() * 200;
        this.r = isTextBubble ? (Math.random() * 1.8 + 2.4) : (Math.random() * 4 + 1.5);
        this.speed = Math.random() * 1.5 + 0.8;
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
            grad.addColorStop(0.5, 'rgba(173, 232, 244, 0.6)');
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

    const fontSize = Math.min(width * 0.16, 120);
    tCtx.font = `900 ${fontSize}px "Arial Black", Impact, sans-serif`;
    tCtx.fillStyle = '#ffffff';
    tCtx.textAlign = 'center';
    tCtx.textBaseline = 'middle';
    tCtx.fillText(text, width / 2, height * 0.24);

    const imgData = tCtx.getImageData(0, 0, width, height).data;
    const bubbles = [];
    const gap = Math.max(5, Math.floor(fontSize / 15));

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

// ================= KHỞI CHẠY =================
let creatures = [];
let bgBubbles = [];
let textBubbles = [];

loadAllAssets().then(() => {
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
                const randomScale = asset.scale * (0.85 + Math.random() * 0.3);
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

        if (loadedAssets.bg && loadedAssets.bg.image) {
            const bg = loadedAssets.bg.image;
            const bgW = bg.naturalWidth || bg.width;
            const bgH = bg.naturalHeight || bg.height;
            const scale = Math.max(width / bgW, height / bgH);
            const nw = bgW * scale;
            const nh = bgH * scale;
            ctx.drawImage(bg, (width - nw) / 2, (height - nh) / 2, nw, nh);
        }

        drawLightRays(time);

        bgBubbles.forEach(b => {
            b.update(time);
            b.draw();
        });

        textBubbles.forEach(b => {
            b.update(time);
            b.draw();
        });

        creatures.forEach(c => {
            c.update();
            c.draw();
        });

        requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
});

window.addEventListener('resize', () => {
    textBubbles = createTextBubbles("YEN NHI");
});
