/* Offline concept-film compositor. See the Gate 1 review for the playback and reproduction notes. */
const { createCanvas, loadImage, ImageData } = require('@napi-rs/canvas');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const path = require('node:path');
const cues = require('./motion-cues.json');

const { width, height, fps, seconds } = cues;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const bell = n => Math.exp(-0.5 * n * n);

function samplesAlong(points) {
  // Resample the traced wire in image space. Timing follows distance rather than control-point spacing.
  const samples = [];
  let travelled = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[Math.max(0, i - 1)], b = points[i];
    const c = points[i + 1], d = points[Math.min(i + 2, points.length - 1)];
    const steps = Math.max(1, Math.ceil(Math.hypot(c[0] - b[0], c[1] - b[1]) / 1.3));
    for (let j = i ? 1 : 0; j <= steps; j++) {
      const t = j / steps;
      const xyz = b.map((v, k) => 0.5 * (2 * v + (-a[k] + c[k]) * t
        + (2 * a[k] - 5 * v + 4 * c[k] - d[k]) * t * t
        + (-a[k] + 3 * v - 3 * c[k] + d[k]) * t * t * t));
      const prior = samples.at(-1);
      if (prior) travelled += Math.hypot(xyz[0] - prior.x, xyz[1] - prior.y);
      samples.push({ x: xyz[0], y: xyz[1], radius: Math.max(1.5, xyz[2]), s: travelled });
    }
  }
  return { samples, length: travelled };
}

function mapWire(route, pixels) {
  const { samples, length } = samplesAlong(route.points);
  const owners = new Map();
  for (const sample of samples) {
    const reach = sample.radius * 2.35;
    for (let y = Math.max(0, Math.floor(sample.y - reach)); y <= Math.min(height - 1, sample.y + reach); y++) {
      for (let x = Math.max(0, Math.floor(sample.x - reach)); x <= Math.min(width - 1, sample.x + reach); x++) {
        const distance = Math.hypot(x - sample.x, y - sample.y) / sample.radius;
        if (distance > 2.35) continue;
        const id = y * width + x;
        const prior = owners.get(id);
        if (!prior || distance < prior.distance) owners.set(id, { distance, s: sample.s });
      }
    }
  }
  const mapped = [];
  for (const [id, { distance, s }] of owners) {
    const offset = id * 4;
    const rgb = [pixels[offset], pixels[offset + 1], pixels[offset + 2]];
    const luminance = Math.max(...rgb) / 255;
    // Let the channels already visible in the artwork carry most of the light.
    const main = route.channels.reduce((v, i) => v + rgb[i], 0) / route.channels.length;
    const rejected = route.opposed.reduce((v, i) => v + rgb[i], 0) / route.opposed.length;
    const pigment = clamp((main - rejected + 10) / 55, 0, 1);
    const texture = clamp(luminance * 1.8, 0, 1) * (0.18 + 0.82 * pigment);
    const inner = bell(distance / 0.72) * (0.16 + 0.84 * texture);
    const halo = bell(distance / 1.30) * 0.15;
    mapped.push({ offset, s, inner, halo });
  }
  return { ...route, length, mapped };
}

function addPulse(buffer, route, time) {
  const elapsed = (time - route.start) / (route.end - route.start);
  if (elapsed < 0) return;
  const head = route.from + (route.length - route.from) * elapsed;
  if (head > route.length + 3 * route.tail) return;
  const strength = route.intensity * clamp(elapsed * 14, 0, 1);
  for (const pixel of route.mapped) {
    const along = pixel.s - head;
    if (along < -3 * route.tail || along > route.nose * 3) continue;
    const tail = bell(along / (along > 0 ? route.nose : route.tail));
    const tip = bell(along / route.nose);
    for (let ch = 0; ch < 3; ch++) {
      const light = route.color[ch] * tail * (pixel.inner + pixel.halo) + 165 * tip * pixel.inner;
      const index = pixel.offset + ch;
      buffer[index] += light * strength * (1 - buffer[index] / 375);
    }
  }
}

function glow(ctx, x, y, radius, color, alpha) {
  const radial = ctx.createRadialGradient(x, y, 0, x, y, radius);
  radial.addColorStop(0, 'rgba(' + color + ',' + alpha + ')');
  radial.addColorStop(0.28, 'rgba(' + color + ',' + alpha * 0.58 + ')');
  radial.addColorStop(1, 'rgba(' + color + ',0)');
  ctx.fillStyle = radial;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

function sparks(ctx, time) {
  const event = cues.contact;
  const age = time - event.time;
  if (age < -0.20 || age > 1.10) return;
  const [x, y] = event.point;
  const peak = bell(age / 0.11);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, x, y, 31, '255,73,174', peak * 0.61);
  glow(ctx, x, y, 9, '255,232,253', peak * 0.94);
  ctx.lineCap = 'round';
  for (const [vx, vy, delay, life, color, thickness] of event.sparks) {
    const t = age - delay;
    if (t < 0 || t >= life) continue;
    const progress = t / life;
    const alpha = Math.min(1, t / 0.065) * Math.pow(1 - progress, 0.72);
    const pos = u => [x + vx * (1 - Math.exp(-1.15 * u)) / 1.15, y + vy * u + 37 * u * u];
    const [px, py] = pos(t), [tx, ty] = pos(Math.max(0, t - 0.055));
    ctx.strokeStyle = 'rgba(' + color + ',' + alpha + ')';
    ctx.lineWidth = thickness;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(px, py); ctx.stroke();
    glow(ctx, px, py, thickness * 3.4, color, 0.52 * alpha);
    ctx.fillStyle = 'rgba(255,250,242,' + (0.96 * alpha) + ')';
    ctx.beginPath(); ctx.arc(px, py, thickness * 0.58, 0, 2 * Math.PI); ctx.fill();
  }
  ctx.restore();
}

async function main() {
  const image = await loadImage(path.join(__dirname, 'night-current.png'));
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, width, height);
  const source = ctx.getImageData(0, 0, width, height).data;
  const rest = new Uint8ClampedArray(source);
  const wireMaps = cues.wires.map(route => mapWire(route, source));
  for (let i = 0; i < rest.length; i += 4) {
    for (let ch = 0; ch < 3; ch++) rest[i + ch] = source[i + ch] * cues.restExposure;
  }
  // Flecks painted into the still dim between discharges. Restrict the change to the free-space wedge.
  const flecks = [];
  if (cues.fleckRegion) {
    const { points, tint } = cues.fleckRegion;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'white'; ctx.beginPath(); ctx.moveTo(...points[0]);
    for (const point of points.slice(1)) ctx.lineTo(...point);
    ctx.closePath(); ctx.fill();
    const mask = ctx.getImageData(0, 0, width, height).data;
    for (let i = 0; i < rest.length; i += 4) {
      if (!mask[i+3] || Math.max(source[i],source[i+1],source[i+2]) < 36) continue;
      const removed = [0,1,2].map(ch => Math.round(rest[i+ch] * tint * mask[i+3] / 255));
      for (let ch=0; ch<3; ch++) rest[i+ch] -= removed[ch];
      flecks.push([i, removed]);
    }
  }
  const outfile = process.argv[2] || path.join(__dirname, 'current-in-motion.mp4');
  const ffmpeg = spawn('ffmpeg', ['-hide_banner','-loglevel','error','-y','-f','rawvideo','-pix_fmt','rgba',
    '-s',width+'x'+height,'-r',String(fps),'-i','pipe:0','-an','-vf','scale=out_color_matrix=bt709:out_range=tv',
    '-c:v','libx264','-preset','medium','-crf','16','-pix_fmt','yuv420p','-colorspace','bt709',
    '-color_primaries','bt709','-color_trc','bt709','-movflags','+faststart',outfile],
    { stdio:['pipe','ignore','inherit'] });
  const exit = once(ffmpeg,'close');
  for (let f=0; f<fps*seconds; f++) {
    const time = f / fps;
    const frame = new Uint8ClampedArray(rest);
    for (const route of wireMaps) addPulse(frame, route, time);
    const echo = bell((time - cues.contact.time - 0.085) / 0.14);
    if (echo > 0.01) for (const [i,removed] of flecks) {
      for (let ch = 0; ch < 3; ch++) frame[i+ch] += removed[ch] * echo;
    }
    ctx.putImageData(new ImageData(frame, width, height), 0, 0);
    sparks(ctx, time);
    const pixels = ctx.getImageData(0, 0, width, height).data;
    if (!ffmpeg.stdin.write(Buffer.from(pixels.buffer, pixels.byteOffset, pixels.byteLength))) await once(ffmpeg.stdin,'drain');
  }
  ffmpeg.stdin.end();
  const [code] = await exit;
  if (code !== 0) throw new Error('FFmpeg returned '+code);
}
main().catch(error => { console.error(error); process.exitCode=1; });
