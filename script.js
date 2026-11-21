const canvas = document.getElementById('aquariumCanvas');
const ctx = canvas.getContext('2d');
const bgAudio = document.getElementById('bgAudio');
const musicBtn = document.getElementById('musicBtn');

let width = window.innerWidth;
let height = window.innerHeight;

function resizeFullScreen() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    rebuildTextBubbles();
}

window.addEventListener('resize', resizeFullScreen);

// ================= ÂM THANH (.M4A): BẤM NÚT HOẶC CHẠM HỒ CÁ ĐỀU PHÁT =================
if (bgAudio) {
    bgAudio.src = 'phimtat.vn-audio-3657.m4a';
    bgAudio.load();
}

function updateMusicButtonLabel() {
    if (!musicBtn || !bgAudio) return;
    musicBtn.textContent = bgAudio.paused ? 'Click here 🫶' : 'Tắt nhạc 🔊';
}

function triggerPlayAudio() {
    if (!bgAudio) return;
    if (!bgAudio.src || !bgAudio.src.includes('phimtat.vn-audio-3657.m4a')) {
        bgAudio.src = 'phimtat.vn-audio-3657.m4a';
        bgAudio.load();
    }
    const p = bgAudio.play();
    if (p && typeof p.then === 'function') {
        p.then(() => {
            updateMusicButtonLabel();
        }).catch(() => {
            updateMusicButtonLabel();
        });
    } else {
        updateMusicButtonLabel();
    }
}

function toggleMusicByButton() {
    if (!bgAudio) return;
    if (bgAudio.paused) {
        triggerPlayAudio();
    } else {
        bgAudio.pause();
        updateMusicButtonLabel();
    }
}

if (musicBtn) {
    musicBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMusicByButton();
    });
    musicBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleMusicByButton();
    }, { passive: false });
}

if (bgAudio) {
    bgAudio.addEventListener('play', updateMusicButtonLabel);
    bgAudio.addEventListener('pause', updateMusicButtonLabel);
}

// ================= CẤU HÌNH SINH VẬT (IMG_3140.jpeg = CÁ MẬP TO) =================
const creatureDefs = [
    { key: 'img3140', src: 'IMG_3140.jpeg', facing: 'right', size: 270, speed: 1.55, laneY: 0.34 },
    { key: 'img3100', src: 'IMG_3100.jpeg', facing: 'right', size: 135, speed: 1.35, laneY: 0.48 },
    { key: 'img3096', src: 'IMG_3096.jpeg', facing: 'right', size: 84,  speed: 1.50, laneY: 0.25 },
    { key: 'img3101', src: 'IMG_3101.jpeg', facing: 'right', size: 92,  speed: 1.45, laneY: 0.40 },
    { key: 'img3103', src: 'IMG_3103.jpeg', facing: 'right', size: 90,  speed: 1.65, laneY: 0.56 },
    { key: 'img3104', src: 'IMG_3104.jpeg', facing: 'left',  size: 94,  speed: 1.35, laneY: 0.64 },
    { key: 'img3105', src: 'IMG_3105.jpeg', facing: 'left',  size: 90,  speed: 1.50, laneY: 0.72 },
    { key: 'img3114', src: 'IMG_3114.jpeg', facing: 'right', size: 88,  speed: 1.20, laneY: 0.80 },
    { key: 'img3127', src: 'IMG_3127.jpeg', facing: 'right', size: 92,  speed: 1.45, laneY: 0.29 },
    { key: 'img3128', src: 'IMG_3128.jpeg', facing: 'right', size: 94,  speed: 1.50, laneY: 0.68 },
    { key: 'img3130', src: 'IMG_3130.jpeg', facing: 'right', size: 92,  speed: 1.55, laneY: 0.52 },
    { key: 'img3131', src: 'IMG_3131.jpeg', facing: 'left',  size: 94,  speed: 1.40, laneY: 0.85 },
    { key: 'img3137', src: 'IMG_3137.jpeg', facing: 'right', size: 92,  speed: 1.45, laneY: 0.37 },
    { key: 'img3138', src: 'IMG_3138.jpeg', facing: 'left',  size: 92,  speed: 1.50, laneY: 0.60 },
    { key: 'img3139', src: 'IMG_3139.jpeg', facing: 'right', size: 94,  speed: 1.40, laneY: 0.76 }
];

const BG_CANDIDATES = ['IMG_3113.jpeg', 'IMG_3113_2.jpeg'];
const images = {};
let bgImage = null;

function cutWhiteOrCheckerBg(img) {
    try {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (!w || !h) return img;

        const off = document.createElement('canvas');
        off.width = w;
        off.height = h;
        const octx = off.getContext('2d');
        octx.drawImage(img, 0, 0);

        const imgData = octx.getImageData(0, 0, w, h);
        const d = imgData.data;
        const visited = new Uint8Array(w * h);
        const queue = [];

        function isBg(idx) {
            const r = d[idx];
            const g = d[idx + 1];
            const b = d[idx + 2];
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const isWhiteBg = (r >= 210 && g >= 210 && b >= 210);
            const isCheckerBg = (max >= 175 && (max - min) <= 22);
            return isWhiteBg || isCheckerBg;
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

            const p = y * w + x;
            if (visited[p]) continue;
            visited[p] = 1;

            const idx = p * 4;
            if (isBg(idx)) {
                d[idx + 3] = 0;
                queue.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
            }
        }

        octx.putImageData(imgData, 0, 0);
        return off;
    } catch (err) {
        return img;
    }
}

function loadImageItem(src, shouldCutBg) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            resolve(shouldCutBg ? cutWhiteOrCheckerBg(img) : img);
        };
        img.onerror = () => resolve(null);
        img.src = src;
    });
}

async function loadBestBackground() {
    for (const src of BG_CANDIDATES) {
        const img = await loadImageItem(src, false);
        if (img && (img.naturalWidth || img.width) > 0) {
            return img;
        }
    }
    return null;
}

function drawFallbackOceanBg(time = 0) {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#0a74b8');
    grad.addColorStop(0.55, '#043f73');
    grad.addColorStop(1, '#021933');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    for (let i = 0; i < 4; i++) {
        const x = width * (0.2 + i * 0.2) + Math.sin(time * 0.0006 + i) * 35;
        const ray = ctx.createLinearGradient(x, 0, x + 120, height * 0.8);
        ray.addColorStop(0, 'rgba(130, 225, 255, 0.16)');
        ray.addColorStop(1, 'rgba(130, 225, 255, 0)');
        ctx.fillStyle = ray;
        ctx.beginPath();
        ctx.moveTo(x - 40, 0);
        ctx.lineTo(x + 50, 0);
        ctx.lineTo(x + 210, height * 0.8);
        ctx.lineTo(x - 90, height * 0.8);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();
}

// ================= SINH VẬT BƠI CÓ TRẬT TỰ & CHẠM VẠCH QUAY ĐẦU =================
class Swimmer {
    constructor({ key, facing, size, x, y, vx, vy, baseLaneY }) {
        this.key = key;
        this.facing = facing;
        this.size = size;
        this.baseLaneY = baseLaneY;

        const raw = images[key];
        const iw = raw ? (raw.width || 120) : 120;
        const ih = raw ? (raw.height || 120) : 120;
        const ratio = iw / ih;

        if (ratio >= 1) {
            this.w = size;
            this.h = Math.max(28, size / ratio);
        } else {
            this.h = size;
            this.w = Math.max(28, size * ratio);
        }

        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.bobPhase = Math.random() * Math.PI * 2;
    }

    update(allSwimmers) {
        this.bobPhase += 0.05;
        this.x += this.vx;

        const desiredY = height * this.baseLaneY + Math.sin(this.bobPhase * 0.7) * 6;
        this.y += (desiredY - this.y) * 0.06 + this.vy * 0.2;

        const minDistX = (this.w + 36) * 0.6;
        const minDistY = (this.h + 24) * 0.6;
        for (let i = 0; i < allSwimmers.length; i++) {
            const other = allSwimmers[i];
            if (other === this) continue;
            const dx = this.x - other.x;
            const dy = this.y - other.y;
            if (Math.abs(dx) < minDistX && Math.abs(dy) < minDistY) {
                if (Math.abs(dy) >= Math.abs(dx)) {
                    this.y += (dy >= 0 ? 1 : -1) * 0.55;
                } else {
                    this.x += (dx >= 0 ? 1 : -1) * 0.4;
                }
            }
        }

        const halfW = this.w * 0.5;
        const halfH = this.h * 0.5;
        const topLimit = Math.max(halfH + 12, 64);
        const bottomLimit = Math.max(topLimit + 40, height - halfH - 16);

        if (this.x - halfW <= 4 && this.vx < 0) {
            this.x = halfW + 4;
            this.vx = Math.abs(this.vx);
        } else if (this.x + halfW >= width - 4 && this.vx > 0) {
            this.x = width - halfW - 4;
            this.vx = -Math.abs(this.vx);
        }

        if (this.y < topLimit) {
            this.y = topLimit;
            this.vy = Math.abs(this.vy) * 0.5;
        } else if (this.y > bottomLimit) {
            this.y = bottomLimit;
            this.vy = -Math.abs(this.vy) * 0.5;
        }
    }

    draw() {
        const img = images[this.key];
        if (!img) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        let flipX = 1;
        if (this.facing === 'right' && this.vx < 0) flipX = -1;
        if (this.facing === 'left' && this.vx > 0) flipX = -1;

        ctx.scale(flipX, 1);
        ctx.rotate(Math.sin(this.bobPhase * 0.7) * 0.03);
        ctx.drawImage(img, -this.w / 2, -this.h / 2, this.w, this.h);
        ctx.restore();
    }
}

// ================= BONG BÓNG NƯỚC & CHỮ "YEN NHI" =================
class Bubble {
    constructor(x, y, r, speed, targetX = null, targetY = null, isText = false) {
        this.x = x;
        this.y = y;
        this.r = r;
        this.speed = speed;
        this.targetX = targetX;
        this.targetY = targetY;
        this.isText = isText;
        this.drift = Math.random() * Math.PI * 2;
    }

    update(time) {
        this.drift += 0.04;
        if (this.isText) {
            const floatX = this.targetX + Math.cos(time * 0.002 + this.targetY * 0.02) * 3;
            const floatY = this.targetY + Math.sin(time * 0.002 + this.targetX * 0.02) * 5;
            this.x += (floatX - this.x) * 0.05;
            this.y += (floatY - this.y) * 0.05;
        } else {
            this.y -= this.speed;
            this.x += Math.sin(this.drift) * 0.65;
            if (this.y < -this.r * 2) {
                this.y = height + this.r * 2;
                this.x = Math.random() * width;
            }
        }
    }

    draw() {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);

        const grad = ctx.createRadialGradient(
            this.x - this.r * 0.3,
            this.y - this.r * 0.3,
            this.r * 0.1,
            this.x,
            this.y,
            this.r
        );
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
        grad.addColorStop(0.55, 'rgba(165, 235, 255, 0.45)');
        grad.addColorStop(1, 'rgba(0, 160, 220, 0.18)');

        ctx.fillStyle = grad;
        ctx.fill();
        ctx.lineWidth = 0.9;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(this.x - this.r * 0.35, this.y - this.r * 0.35, this.r * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fill();
        ctx.restore();
    }
}

let swimmers = [];
let bubbles = [];
let textBubbles = [];

function rebuildTextBubbles() {
    const off = document.createElement('canvas');
    off.width = Math.max(1, width);
    off.height = Math.max(1, height);
    const octx = off.getContext('2d');

    const fontSize = Math.max(38, Math.min(width * 0.085, 96));
    octx.font = `900 ${fontSize}px "Arial Black", Impact, sans-serif`;
    octx.fillStyle = '#ffffff';
    octx.textAlign = 'center';
    octx.textBaseline = 'middle';
    octx.fillText('YEN NHI', width / 2, height * 0.18);

    const data = octx.getImageData(0, 0, off.width, off.height).data;
    const next = [];
    const step = Math.max(5, Math.floor(fontSize / 13));

    for (let y = 0; y < off.height; y += step) {
        for (let x = 0; x < off.width; x += step) {
            if (data[(y * off.width + x) * 4 + 3] > 128) {
                next.push(
                    new Bubble(
                        Math.random() * width,
                        height + Math.random() * 140,
                        Math.random() * 1.6 + 2.2,
                        1.2,
                        x,
                        y,
                        true
                    )
                );
            }
        }
    }
    textBubbles = next;
}

// Chạm vào hồ cá: vừa phát nhạc, vừa bật bong bóng
canvas.addEventListener('pointerdown', (e) => {
    triggerPlayAudio();

    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    for (let i = 0; i < 10; i++) {
        bubbles.push(
            new Bubble(
                px + (Math.random() - 0.5) * 40,
                py + (Math.random() - 0.5) * 20,
                Math.random() * 5 + 2.5,
                Math.random() * 1.8 + 1.1
            )
        );
    }
});

// ================= KHỞI TẠO & VÒNG LẶP TOÀN MÀN HÌNH =================
async function init() {
    resizeFullScreen();

    const promises = creatureDefs.map(async (def) => {
        images[def.key] = await loadImageItem(def.src, true);
    });
    promises.push(
        loadBestBackground().then((img) => {
            bgImage = img;
        })
    );
    await Promise.all(promises);

    swimmers = [];

    creatureDefs.forEach((def, idx) => {
        if (!images[def.key]) return;
        const dir = idx % 2 === 0 ? 1 : -1;
        const startX = width * (0.18 + (idx % 4) * 0.2);

        swimmers.push(
            new Swimmer({
                ...def,
                x: Math.min(width - 140, Math.max(140, startX)),
                y: height * def.laneY,
                vx: dir * def.speed,
                vy: (idx % 2 === 0 ? 0.2 : -0.2),
                baseLaneY: def.laneY
            })
        );
    });

    bubbles = [];
    for (let i = 0; i < 45; i++) {
        bubbles.push(
            new Bubble(
                Math.random() * width,
                Math.random() * height,
                Math.random() * 4.5 + 1.5,
                Math.random() * 1.4 + 0.7
            )
        );
    }

    function loop(time) {
        ctx.clearRect(0, 0, width, height);

        if (bgImage && (bgImage.naturalWidth || bgImage.width) > 0) {
            const bw = bgImage.naturalWidth || bgImage.width;
            const bh = bgImage.naturalHeight || bgImage.height;
            const scale = Math.max(width / bw, height / bh);
            const dw = bw * scale;
            const dh = bh * scale;
            ctx.drawImage(bgImage, (width - dw) / 2, (height - dh) / 2, dw, dh);
        } else {
            drawFallbackOceanBg(time);
        }

        swimmers.forEach((s) => {
            s.update(swimmers);
            s.draw();
        });

        bubbles.forEach((b) => {
            b.update(time);
            b.draw();
        });

        textBubbles.forEach((tb) => {
            tb.update(time);
            tb.draw();
        });

        requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
}

init();
