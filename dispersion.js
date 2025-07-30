function wavelengthToRGB(wavelength) {
  let R = 0, G = 0, B = 0;
  let factor = 0;

  if (wavelength >= 380 && wavelength < 440) {
    R = -(wavelength - 440) / (440 - 380);
    G = 0.0;
    B = 1.0;
  } else if (wavelength >= 440 && wavelength < 490) {
    R = 0.0;
    G = (wavelength - 440) / (490 - 440);
    B = 1.0;
  } else if (wavelength >= 490 && wavelength < 510) {
    R = 0.0;
    G = 1.0;
    B = -(wavelength - 510) / (510 - 490);
  } else if (wavelength >= 510 && wavelength < 580) {
    R = (wavelength - 510) / (580 - 510);
    G = 1.0;
    B = 0.0;
  } else if (wavelength >= 580 && wavelength < 645) {
    R = 1.0;
    G = -(wavelength - 645) / (645 - 580);
    B = 0.0;
  } else if (wavelength >= 645 && wavelength <= 780) {
    R = 1.0;
    G = 0.0;
    B = 0.0;
  }

  // Intensity factor correction (perceptual fade at spectrum ends)
  if (wavelength >= 380 && wavelength < 420) {
    factor = 0.3 + 0.7 * (wavelength - 380) / (420 - 380);
  } else if (wavelength >= 420 && wavelength <= 700) {
    factor = 1.0;
  } else if (wavelength > 700 && wavelength <= 780) {
    factor = 0.3 + 0.7 * (780 - wavelength) / (780 - 700);
  } else {
    factor = 0.0;
  }

  // Gamma correction
  const gamma = 0.8;
  const intensityMax = 255;
  const correct = (c) => Math.round(intensityMax * Math.pow(c * factor, gamma));

  return {
    r: correct(R),
    g: correct(G),
    b: correct(B),
    hex: `#${correct(R).toString(16).padStart(2, '0')}${correct(G).toString(16).padStart(2, '0')}${correct(B).toString(16).padStart(2, '0')}`
  };
}

function refractiveIndexCauchy(wavelengthNm, material = "BK7") {
  // 波长从 nm 转为 μm
  let lambda = wavelengthNm / 1000;

  // 柯西系数预设
  const cauchyConstants = {
    "BK7":  { A: 1.5046, B: 0.00420, C: 0.000005 },
    "FusedSilica": { A: 1.4580, B: 0.00354, C: 0.000000 },
    "FusedSilica2": { A: 1.6080, B: 0.00454, C: 0.000008 },
  };

  const constants = cauchyConstants[material];
  if (!constants) {
    throw new Error(`Material "${material}" not found in Cauchy constants.`);
  }

  const { A, B, C } = constants;
  return A + (B / (lambda ** 2)) + (C / (lambda ** 4));
}

function sampleSpectrum(samplingInterval = 5)
{
    let lowerBoundary = 380;
    let upperBoundary = 780;
    let ret = [];
    for (let i = lowerBoundary; i < upperBoundary; i += samplingInterval)
    {
        ret.push({ "wavelength": i, "color": wavelengthToRGB(i), "N": refractiveIndexCauchy(i) });
        // console.log(`add light, wavelength=${i}, color= ${wavelengthToRGB(i)}, N=${refractiveIndexCauchy(i)}`);
    }
    return ret;
}
const G_NEAR_ZERO = 0.0000001;
const G_REFACTIVE_INDEX_AIR = 1.000293;
const G_REFACTIVE_INDEX_VACCUM = 1.0; 
class Vector2f {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    add(v) {
        return new Vector2f(this.x + v.x, this.y + v.y);
    }

    sub(v) {
        return new Vector2f(this.x - v.x, this.y - v.y);
    }

    mul(scalar) {
        return new Vector2f(this.x * scalar, this.y * scalar);
    }

    div(scalar) {
        return new Vector2f(this.x / scalar, this.y / scalar);
    }

    dot(v) {
        return this.x * v.x + this.y * v.y;
    }

    length() {
        return Math.hypot(this.x, this.y); // √(x² + y²)
    }

    normalize() {
        const len = this.length();
        if (len < G_NEAR_ZERO) return new Vector2f(0, 0);
        return this.div(len);
    }

    // 向量旋转（单位：弧度）
    rotate(theta) {
        const cos = Math.cos(theta);
        const sin = Math.sin(theta);
        return new Vector2f(
            this.x * cos - this.y * sin,
            this.x * sin + this.y * cos
        );
    }

    clone() {
        return new Vector2f(this.x, this.y);
    }
    toString() {
        return `(${this.x.toFixed(2)}, ${this.y.toFixed(2)})`;
    }
}

function computeNormal(v1, v2) {
    // 方向向量 d = v2 - v1
    let dx = v2.x - v1.x;
    let dy = v2.y - v1.y;

    // 法向量为 (-dy, dx)（逆时针旋转 90°）
    let nx = -dy;
    let ny = dx;

    // 单位化（normalize）
    let length = Math.hypot(nx, ny); // 等价于 sqrt(nx^2 + ny^2)
    if (length < 0.00001) new Vector2f(0, 0); // 零向量防护
    return new Vector2f(nx / length, ny / length);
}
class Ray{
    constructor(origin, dir, wavelength, N = G_REFACTIVE_INDEX_AIR)
    {
        this.origin = origin;
        this.dir = dir.normalize();
        this.wavelength = wavelength;
        this.N = N; //current refractive index in a medium
        this.t = Infinity;
    }
    travel(t)
    {
        return new Vector2f(
            this.origin.x + this.dir.x * t,
            this.origin.y + this.dir.y * t
        )
    }
    setRefractiveIndex(N)
    {
        this.N = N;
    }
    clone() {
        return new Ray(this.origin, this.dir, this.wavelength);
    }
}
class Shape{
    constructor()
    {

    }
    intersect(ray)
    {
        return null;
    }
    isInside(p)
    {
        return false;
    }
    draw(ctx)
    {

    }
}

class Line extends Shape {
    constructor(v1, v2) {
        super();
        this.v1 = v1;
        this.v2 = v2;
        this.normal = computeNormal(v1, v2);
    }

    intersect(ray) {
        const p = ray.origin;
        const r = ray.dir;
        const a = this.v1;
        const b = this.v2;
        const s = { x: b.x - a.x, y: b.y - a.y };

        const cross = (v1, v2) => v1.x * v2.y - v1.y * v2.x;

        const rxs = cross(r, s);
        if (rxs === 0) return null; // 平行或共线无交点

        const qp = { x: a.x - p.x, y: a.y - p.y };
        const t = cross(qp, s) / rxs;
        const u = cross(qp, r) / rxs;

        // t >= 0 (沿光线方向) 且 u ∈ [0, 1] (在线段内部)
        let dirSign = 1.0;
        if (this.normal.dot(ray.dir) > 0) dirSign = -1;
        if (t >= 0 && u >= 0 && u <= 1) {
            return {
                point: {
                    x: p.x + t * r.x,
                    y: p.y + t * r.y
                },
                t: t,
                u: u,
                normal: this.normal.mul(dirSign), //保证法线和入射角角度大于90度
                N: G_REFACTIVE_INDEX_AIR
            };
        }
        return null;
    }
}

class Triangle extends Shape {
    constructor(v1, v2, v3) {
        super();
        this.v1 = v1;
        this.v2 = v2;
        this.v3 = v3;
        this.edges = [
            new Line(v1, v2),
            new Line(v2, v3),
            new Line(v3, v1)
        ];
    }

    intersect(ray) {
        let closest = null;
        let minT = Infinity;

        for (let edge of this.edges) {
            let hit = edge.intersect(ray);
            if (hit && hit.t < minT) {
                closest = hit;
                minT = hit.t;
            }
        }
        if (closest)
        {
            let p = ray.travel(closest.t + G_NEAR_ZERO);
            if (this.isInside(p))
            {
                closest.N = refractiveIndexCauchy(ray.wavelength);
            } else
            {
                closest.N = G_REFACTIVE_INDEX_AIR;
            }
        }

        return closest;
    }

    isInside(p) {
        const v1 = this.v1, v2 = this.v2, v3 = this.v3;

        // 向量差
        const v0 = { x: v3.x - v1.x, y: v3.y - v1.y };
        const v1v = { x: v2.x - v1.x, y: v2.y - v1.y };
        const v2v = { x: p.x - v1.x, y: p.y - v1.y };

        // 点积
        const dot = (a, b) => a.x * b.x + a.y * b.y;

        const d00 = dot(v0, v0);
        const d01 = dot(v0, v1v);
        const d11 = dot(v1v, v1v);
        const d20 = dot(v2v, v0);
        const d21 = dot(v2v, v1v);

        const denom = d00 * d11 - d01 * d01;
        if (denom === 0) return false; // 三角形退化

        const v = (d11 * d20 - d01 * d21) / denom;
        const w = (d00 * d21 - d01 * d20) / denom;
        const u = 1 - v - w;

        // 重心坐标 u,v,w ∈ [0,1] 且和为1 ⇒ 点在内部
        return (u >= 0) && (v >= 0) && (w >= 0);
    }
    draw(ctx)
    {
        drawPrism(ctx, this);
    }
}

class Scene {
    constructor()
    {
        this.primitives = [];
    }
    add(primitive)
    {
        this.primitives.push(primitive);
    }
    intersect(ray)
    {
        let closest = null;
        let minT = Infinity;

        for (let obj of this.primitives) {
            let hit = obj.intersect(ray);
            if (hit && hit.t < minT) {
                closest = hit;
                minT = hit.t;
            }
        }
        return closest;
    }
    draw(ctx)
    {
        for (let obj of this.primitives) {
            obj.draw(ctx);
        }
    }
}

function refractOrReflect(incident, normal, n1, n2) {
    incident = incident.normalize();
    normal = normal.normalize();
    let cosi = -Math.max(-1, Math.min(1, incident.dot(normal)));
    // console.log(`refract cosi = ${cosi}`);
    let eta = n1 / n2;
    let k = 1 - eta * eta * (1 - cosi * cosi);

    if (k < 0) {
        // 全反射：使用反射方向
        let reflected = incident.sub(normal.mul(2 * incident.dot(normal)));
        return {
            totalInternalReflection: true,
            dir: reflected.normalize()
        };
    } else {
        // 发生折射
        let refracted = incident.mul(eta).add(normal.mul(eta * cosi - Math.sqrt(k)));
        return {
            totalInternalReflection: false,
            dir: refracted.normalize()
        };
    }
}

function rayTrace(ray, scene)
{
    let trace = [];
    let curRay = ray.clone();
    do {
        var bHit = false;
        let test = scene.intersect(curRay);
        if (test != null && test.t < curRay.t && test.t > G_NEAR_ZERO)
        {
            curRay.t = test.t;
            bHit = true;
        }
        trace.push(curRay);
        if (bHit)
        {
            let ret = refractOrReflect(curRay.dir, test.normal, curRay.N, test.N);
            let inAngle = Math.acos(Math.abs(curRay.dir.dot(test.normal))) * 180.0 / Math.PI;
            let outAngle = Math.acos(Math.abs(ret.dir.dot(test.normal))) * 180.0 / Math.PI;
            // console.log(`inAngle = ${inAngle}, outAngle = ${outAngle}, with N1 = ${curRay.N}, N2 = ${test.N}`);
            let newDir = ret.dir;
            let newOrigin = curRay.origin.add(curRay.dir.mul(curRay.t+0.01));
            curRay = new Ray(newOrigin, newDir, curRay.wavelength, test.N);
        }

    } while (bHit);
    return trace;
}

function drawPrism(ctx, prism) {
    const centerX = (prism.v1.x + prism.v2.x + prism.v3.x) * 0.3333;
    const centerY = (prism.v1.y + prism.v2.y + prism.v3.y) * 0.3333;
    const size = prism.v1.sub(prism.v2).length();
    
    // 等腰三角形顶点
    const vertices = [
        prism.v1,
        prism.v2,
        prism.v3
    ];
    
    // 绘制棱镜主体
    ctx.beginPath();
    ctx.moveTo(vertices[0].x, vertices[0].y);
    ctx.lineTo(vertices[1].x, vertices[1].y);
    ctx.lineTo(vertices[2].x, vertices[2].y);
    ctx.closePath();
    
    // 玻璃效果渐变
    const gradient = ctx.createLinearGradient(centerX - size, centerY, centerX + size, centerY);
    gradient.addColorStop(0, 'rgba(100, 149, 237, 0.1)');
    gradient.addColorStop(0.5, 'rgba(135, 206, 250, 0.2)');
    gradient.addColorStop(1, 'rgba(176, 196, 222, 0.1)');
    
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // 棱镜边框
    ctx.strokeStyle = 'rgba(200, 200, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // 添加高光效果
    // ctx.beginPath();
    // ctx.moveTo(vertices[0].x, vertices[0].y);
    // ctx.lineTo(vertices[1].x, vertices[1].y);
    // ctx.lineTo(vertices[2].x, vertices[2].y);
    // ctx.closePath();
    // ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    // ctx.fill();
    
    return vertices;
}
function drawRayImpl(ctx, startX, startY, endX, endY, color, intensity, width = 1.0) {
    const alpha = intensity;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
    ctx.lineWidth = width;
    ctx.stroke();
    // 添加光线发光效果
    if (intensity > 1.3) {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.3})`;
        ctx.lineWidth = width * 3;
        ctx.stroke();
    }
}
function drawRay(ctx, ray, idx)
{
    let t = 1500;
    if (ray.t < Infinity)
    {
        t = ray.t;
    }
    let drawColor = { r: 255, g: 255, b: 255 };
    if (idx >= 1) {
        drawColor = wavelengthToRGB(ray.wavelength);
    }
    drawRayImpl(ctx, ray.origin.x, ray.origin.y,
                ray.origin.x + ray.dir.x * t, ray.origin.y + ray.dir.y * t, drawColor, 1.0);
}
// 绘制背景网格
function drawGrid(ctx) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    
    for (let x = 0; x < canvas.width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    for (let y = 0; y < canvas.height; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

function drawGlowLine(ctx, startPoint, endPoint, options = {}) {
  const {
    glowColor = 'rgba(255, 255, 255, 0.8)',
    lineColor = 'rgba(255, 255, 255, 0.9)',
    glowSize = 20,        // 辉光范围
    lineWidth = 2,        // 核心线条宽度
    glowLayers = 8,       // 辉光层数
    softness = 0.2        // 柔和度 (0-1)
  } = options;

  ctx.save();
  
  // 绘制多层辉光
  for (let i = glowLayers; i > 0; i--) {
    ctx.save();
    
    // 计算当前层的参数
    const layerWidth = lineWidth + (glowSize * 2 * i / glowLayers);
    const layerAlpha = (softness / glowLayers) * (glowLayers - i + 1);
    
    // 设置辉光效果
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = glowSize * (i / glowLayers);
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.globalAlpha = layerAlpha;
    
    // 绘制线条
    ctx.beginPath();
    ctx.moveTo(startPoint.x, startPoint.y);
    ctx.lineTo(endPoint.x, endPoint.y);
    ctx.lineWidth = layerWidth;
    ctx.strokeStyle = parseColor(glowColor, layerAlpha);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    
    ctx.restore();
  }
  
  // 绘制核心线条
  ctx.beginPath();
  ctx.moveTo(startPoint.x, startPoint.y);
  ctx.lineTo(endPoint.x, endPoint.y);
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = lineColor;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
  
  ctx.restore();
}
function drawBlurredEdgeTrapezoid(ctx, p1, p2, p3, p4, options = {}) {
  const {
    fillColor = 'rgba(255, 255, 255, 0.15)',
    edgeBlur = 15,
    layers = 5,
    glowSize = 50
  } = options;

  ctx.save();
  
  // 绘制多层模糊边缘
  for (let i = layers; i > 0; i--) {
    ctx.save();
    
    // 每层的透明度递减
    const alpha = (0.9 / layers) * (layers - i + 1);
    const currentBlur = (edgeBlur / layers) * i;
    
    ctx.shadowColor = `rgba(255, 255, 255, ${alpha})`;
    ctx.shadowBlur = currentBlur + glowSize;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // 绘制稍微缩小的梯形来创建柔和边缘
    const shrink = i * 0.5;
    const center = getCenterPoint([p1, p2, p3, p4]);
    const sp1 = shrinkPoint(p1, center, shrink);
    const sp2 = shrinkPoint(p2, center, shrink);
    const sp3 = shrinkPoint(p3, center, shrink);
    const sp4 = shrinkPoint(p4, center, shrink);
    
    ctx.beginPath();
    ctx.moveTo(sp1.x, sp1.y);
    ctx.lineTo(sp2.x, sp2.y);
    ctx.lineTo(sp3.x, sp3.y);
    ctx.lineTo(sp4.x, sp4.y);
    ctx.closePath();
    
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.3})`;
    ctx.fill();
    ctx.restore();
  }
  
  // 绘制主体（无边框）
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.lineTo(p3.x, p3.y);
  ctx.lineTo(p4.x, p4.y);
  ctx.closePath();
  
  const gradient = ctx.createLinearGradient(p1.x, p1.y, p3.x, p3.y);
  gradient.addColorStop(0, fillColor);
  gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gradient;
  ctx.fill();
  
  ctx.restore();
}

// 辅助函数
function getBounds(points) {
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys)
  };
}

function getCenterPoint(points) {
  const x = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const y = points.reduce((sum, p) => sum + p.y, 0) / points.length;
  return {x, y};
}

function shrinkPoint(point, center, amount) {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + dx * (1 - amount / 100),
    y: center.y + dy * (1 - amount / 100)
  };
}

function expandTrapezoid(p1, p2, p3, p4, amount) {
  const center = getCenterPoint([p1, p2, p3, p4]);
  const expand = (point) => {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const ratio = (length + amount) / length;
    return {
      x: center.x + dx * ratio,
      y: center.y + dy * ratio
    };
  };
  
  return {
    p1: expand(p1),
    p2: expand(p2),
    p3: expand(p3),
    p4: expand(p4)
  };
}
function parseColor(color, alpha = 1) {
  if (color.startsWith('rgba')) {
    return color.replace(/[\d\.]+\)$/g, `${alpha})`);
  } else if (color.startsWith('rgb')) {
    return color.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
  } else if (color.startsWith('#')) {
    const hex = color.substring(1);
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return `rgba(255, 255, 255, ${alpha})`;
}


function drawSoftWhiteSpot(ctx, x, y, radius = 20, intensity = 0.3) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter"; // 发光叠加效果更自然

  // 创建径向渐变
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0.0, `rgba(255, 255, 255, ${intensity})`);
  gradient.addColorStop(0.3, `rgba(255, 255, 255, ${intensity * 0.6})`);
  gradient.addColorStop(0.7, `rgba(255, 255, 255, ${intensity * 0.2})`);
  gradient.addColorStop(1.0, `rgba(255, 255, 255, 0)`); // 外部完全透明

  // 用渐变填充圆形区域
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
function drawBlurredMask(ctx, canvas)
{
    ctx.filter = 'blur(20px)';
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.filter = 'none';
}
// 主渲染函数
var g_scene = null;
var g_ray_origin = null;
function setupScene()
{
    if (g_scene == null)
    {
        g_scene = new Scene();
        const degrees = 30;
        const radians = degrees * Math.PI / 180;
        const sin30 = Math.sin(radians);
        const cos30 = Math.cos(radians);
        const len = 300;
        const v1x = window.innerWidth / 2 - 100;
        const v1y = window.innerHeight / 2 - len * cos30 * 2 / 3.0;
        let v1 = new Vector2f(v1x, v1y);
        let v2 = new Vector2f(v1.x + sin30 * len, v1.y + cos30 * len);
        let v3 = new Vector2f(v1.x - sin30 * len, v1.y + cos30 * len);
        g_scene.add(new Triangle(v1, v2, v3))
        g_ray_origin = new Vector2f(80, window.innerHeight / 2);
    }
}
let G_RENDER_SETTINGS =
{
    lastTime : 0,
    frameInterval : 1000 / 30, // 目标帧间隔，单位 ms
    frameIdx : 0,
    incidentAngleLimit : 60,
    incidentAngleUpperBound : -26,
    incidentAngleLowerBound : 25,
    incidentAngle : -10, //-incidentAngleLimit;
    incidentAngleDelta : 0.25,
}

function update()
{
    G_RENDER_SETTINGS.incidentAngle += G_RENDER_SETTINGS.incidentAngleDelta;
    if (Math.abs(G_RENDER_SETTINGS.incidentAngle) >= G_RENDER_SETTINGS.incidentAngleLimit) G_RENDER_SETTINGS.incidentAngleDelta *= -1.0;
}
function updateByRatio(delta)
{
    let angle = 0;
    G_RENDER_SETTINGS.incidentAngle = (1 - delta) * G_RENDER_SETTINGS.incidentAngleUpperBound + delta * G_RENDER_SETTINGS.incidentAngleLowerBound;
    // console.log(`current incident angle = ${G_RENDER_SETTINGS.incidentAngle}`);
    render();
}
function render()
{
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    setupScene();
    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    
    // 绘制背景网格
    drawGrid(ctx);
    g_scene.draw(ctx);
    const spectrumSampleRate = 1;
    let rayinfoList = sampleSpectrum(spectrumSampleRate);
    let incidentRadians = G_RENDER_SETTINGS.incidentAngle * Math.PI / 180;
    let bDrawnSpot = [false, false];

    {//pre tracing
        let redRay = new Ray(g_ray_origin, new Vector2f(Math.cos(incidentRadians), Math.sin(incidentRadians)), rayinfoList[0].wavelength);
        let redTrace = rayTrace(redRay, g_scene);
        let pupleRay = new Ray(g_ray_origin, new Vector2f(Math.cos(incidentRadians), Math.sin(incidentRadians)), rayinfoList[rayinfoList.length - 1].wavelength);
        let pupleTrace = rayTrace(pupleRay, g_scene);
        
        for (let i = 0; i < redTrace.length; ++i)
        {
            if (i >= pupleTrace.length) break;
            let lastRedRay = redTrace[i];
            let lastPupleRay = pupleTrace[i];
            let p4 = lastRedRay.origin;
            let p1 = lastRedRay.origin.add(lastRedRay.dir.mul(Math.min(1500, lastRedRay.t)));
            let p3 = lastPupleRay.origin;
            let p2 = lastPupleRay.origin.add(lastPupleRay.dir.mul(Math.min(1500, lastPupleRay.t)));

            if (i < redTrace.length - 1)
            {
                drawGlowLine(ctx, p1.add(p2).mul(0.5), p3.add(p4).mul(0.5));
            } else {
                drawBlurredEdgeTrapezoid(ctx, p1, p2, p3, p4);
            }
            // console.log(`p1 = ${p1}, p2 = ${p2}, p3 = ${p3}, p4 = ${p4}`)
        }
    }
    for (let rayinfo of rayinfoList) {
        let ray = new Ray(g_ray_origin, new Vector2f(Math.cos(incidentRadians), Math.sin(incidentRadians)), rayinfo.wavelength);
        trace = rayTrace(ray, g_scene);
        for (let i = 0; i < trace.length; ++i)
        {
            if (!bDrawnSpot[i] && i < trace.length - 1)
            {
                let ray = trace[i];
                if (ray.t < Infinity)
                {
                    drawSoftWhiteSpot(ctx, ray.origin.x + ray.dir.x * ray.t, ray.origin.y + ray.dir.y * ray.t, 30, 0.3);
                }
                bDrawnSpot[i] = true;
            }
            drawRay(ctx, trace[i], i);
        }
    }
    // drawBlurredMask(ctx, canvas)
}
function animate(time) {
    render();
    // update();
    // return;
    // if (time - lastTime >= frameInterval) {
    // lastTime = time;
    // frameIdx += 1;
    //     render();
    //     update();
    // }
    // requestAnimationFrame(animate);
}

// 设置画布大小
function resizeCanvas() {
    g_scene = null;
    console.log(`Set g_scene to null`);
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const enableHighDPR = true;
    if (enableHighDPR) {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;
        ctx.scale(dpr, dpr);
    } else {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    animate(ctx);
}