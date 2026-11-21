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

// ================= ÂM THANH (.M4A) & MÀN HÌNH CHÀO =================
let isPlaying = false;

if (bgAudio) {
    bgAudio.src = 'phimtat.vn-audio-3657.m4a';
    bgAudio.load();
}

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

if (splashScreen) {
    splashScreen.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        playAudioNow();
        splashScreen.classList.add('hidden');
    });
}

if (audioToggle) {
    audioToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleAudio();
    });
}

window.addEventListener('DOMContentLoaded', () => {
    playAudioNow();
});

['pointerdown', 'touchstart', 'click', 'keydown'].forEach(evtName => {
    document.addEventListener(evtName, () => {
        if (!isPlaying && bgAudio && bgAudio.paused) {
            playAudioNow();
        }
    }, { passive: true });
});

// ================= CẤU HÌNH ẢNH (NỀN = IMG_3113.jpeg) =================
const assetConfig = [
    { name: 'bg', src: 'IMG_3113.jpeg', removeBg: false },
    { name: 'crab', src: 'IMG_3100.jpeg', removeBg: true, facing: 'none', type: 'bottom', scale: 0.15 },
    { name: 'starfish', src: 'IMG_3101.jpeg', removeBg: true, facing: 'none', type: 'bottom', scale: 0.11 },
    { name: 'stingray', src: 'IMG_3103.jpeg', removeBg: true, facing: 'right', type: 'glide', scale: 0.24 },
    { name: 'pufferfish', src: 'IMG_3104.jpeg', removeBg: true, facing: 'right', type: 'swim', scale: 0.14 },
    { name: 'clownfish', src: 'IMG_3107.jpeg', removeBg: true, facing: 'right', type: 'swim', scale: 0.11 },
    { name: 'moorish', src: 'IMG_3108.jpeg', removeBg: true, facing: 'left', type: 'swim', scale: 0.15 },
    { name: 'bluetang', src: 'IMG_3109.jpeg', removeBg: true, facing: 'left', type: 'swim', scale: 0.14 },
    { name: 'seahorse', src: 'IMG_3110.jpeg', removeBg: true, facing: 'right', type: 'float', scale: 0.13 },
    { name: 'turtle', src: 'IMG_3114.jpeg', removeBg: true, facing: 'right', type: 'glide', scale: 0.25 }
];

const loadedAssets = {};

// Tách nền trắng / caro an toàn từ viền ngoài, bảo toàn chi tiết bên trong
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

// ================= SINH VẬT BƠI TỰ NHIÊN NHƯ HỒ CÁ THẬT =================
class SeaCreature {
    constructor(asset, customScale = null) {
        this.asset = asset;
        this.img = asset.image;

        const imgW = this.img.width || 200;
        const imgH = this.img.height || 200;
        const baseSize = Math.max(70, Math.min(width, height) * (customScale || asset.scale));
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
            this.y = height - this.h * 0.62 - Math.random() * (height * 0.06);
            this.baseSpeed = (this.asset.name === 'crab') ? (0.35 + Math.random() * 0.25) : 0;
            this.dir = Math.random() > 0.5 ? 1 : -1;
        } else if (this.type === 'float') {
            this.dir = Math.random() > 0.5 ? 1 : -1;
            this.baseSpeed = 0.3 + Math.random() * 0.25;
            this.x = initial ? Math.random() * width : (this.dir > 0 ? -this.w : width + this.w);
            this.y = height * 0.36 + Math.random() * (height * 0.36);
        } else {
            this.dir = Math.random() > 0.5 ? 1 : -1;
            this.baseSpeed = (this.type === 'glide') ? (0.65 + Math.random() * 0.45) : (0.85 + Math.random() * 0.75);
            this.x = initial ? Math.random() * width : (this.dir > 0 ? -this.w : width + this.w);
            this.y = height * 0.18 + Math.random() * (height * 0.56);
            this.targetY = this.y;
        }
    }

    update() {
        this.phase += (this.type === 'glide') ? 0.032 : 0.055;

        if (this.type === 'bottom') {
            if (this.asset.name === 'crab') {
                const step = Math.max(0, Math.sin(this.phase * 1.6));
                this.x += this.dir * this.baseSpeed * (0.3 + step * 0.9);
                if (this.x < this.w * 0.65) {
                    this.x = this.w * 0.65;
                    this.dir = 1;
                } else if (this.x > width - this.w * 0.65) {
                    this.x = width - this.w * 0.65;
                    this.dir = -1;
                }
                this.tilt = Math.sin(this.phase * 1.6) * 0.04;
            } else {
                this.tilt = Math.sin(this.phase * 0.4) * 0.03;
            }
        } else if (this.type === 'float') {
            this.x += this.dir * this.baseSpeed;
            this.y += Math.sin(this.phase * 0.8) * 0.5;
            this.tilt = this.dir * (0.06 + Math.sin(this.phase * 0.7) * 0.06);

            if (this.dir > 0 && this.x > width + this.w) {
                this.x = -this.w;
            } else if (this.dir < 0 && this.x < -this.w) {
                this.x = width + this.w;
            }
        } else {
            const thrust = 0.78 + Math.sin(this.phase) * 0.28;
            this.x += this.dir * this.baseSpeed * thrust;

            if (Math.random() < 0.004) {
                this.targetY = height * 0.18 + Math.random() * (height * 0.56);
            }
            this.y += (this.targetY - this.y) * 0.008 + Math.sin(this.phase * 0.6) * 0.35;
            this.tilt = Math.sin(this.phase * 0.6) * 0.045;

            if (this.dir > 0 && this.x > width + this.w) {
                this.resetPosition(false);
            } else if (this.dir < 0 && this.x < -this.w) {
                this.resetPosition(false);
            }
        }
    }

    draw() {
        if (!this.img) return;
        ctx.save();
        ctx.translate(this.x, this.y);

        let flipX = 1;
        if (this.facing === 'right' && this.dir < 0) flipX = -1;
        if (this.facing === 'left' && this.dir > 0) flipX = -1;

        ctx.scale(flipX, 1);
        ctx.rotate(this.tilt || 0);

        const flex = 1 + Math.sin(this.phase) * 0.025;
        ctx.scale(flex, 1 / Math.sqrt(flex));

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
        this.r = isTextBubble ? (Math.random() * 1.5 + 2.0) : (Math.random() * 4 + 1.5);
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

    const fontSize = Math.min(width * 0.125, 110);
    tCtx.font = `900 ${fontSize}px "Arial Black", Impact, sans-serif`;
    tCtx.fillStyle = '#ffffff';
    tCtx.textAlign = 'center';
    tCtx.textBaseline = 'middle';
    tCtx.fillText(text, width / 2, height * 0.22);

    const imgData = tCtx.getImageData(0, 0, width, height).data;
    const bubbles = [];
    const gap = Math.max(5, Math.floor(fontSize / 14));

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

// ================= HIỆU ỨNG MẶT NƯỚC & FISH-EYE =================
function drawWaterSurfaceAndFishEye(time) {
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

    ctx.save();
    const maxR = Math.hypot(width, height) * 0.56;
    const vig = ctx.createRadialGradient(
        width / 2, height / 2, Math.min(width, height) * 0.34,
        width / 2, height / 2, maxR
    );
    vig.addColorStop(0, 'rgba(0, 15, 30, 0)');
    vig.addColorStop(0.75, 'rgba(0, 15, 30, 0.18)');
    vig.addColorStop(1, 'rgba(0, 8, 18, 0.65)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, width, height);
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

        creatures.forEach(c => {
            c.update(time);
            c.draw();
        });

        bgBubbles.forEach(b => {
            b.update(time);
            b.draw();
        });

        textBubbles.forEach(b => {
            b.update(time);
            b.draw();
        });

        drawWaterSurfaceAndFishEye(time);

        requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
});

window.addEventListener('resize', () => {
    textBubbles = createTextBubbles("YEN NHI");
});
