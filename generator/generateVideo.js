const fs = require('fs-extra');
const path = require('path');
const { createCanvas } = require('canvas');
const child_process = require('child_process');
const gtts = require('node-gtts')('en');
const { v4: uuidv4 } = require('uuid');

async function textToSlides(script, outDir) {
  await fs.ensureDir(outDir);
  const paragraphs = script.split(/\n{1,}/).map(p => p.trim()).filter(Boolean);
  const slides = paragraphs.length ? paragraphs : script.match(/[^\.\!\?]+[\.!\?]*/g) || [script];

  const imagePaths = [];
  for (let i = 0; i < slides.length; i++) {
    const text = slides[i];
    const canvas = createCanvas(1280, 720);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0b1020';
    ctx.fillRect(0, 0, 1280, 720);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Sans';
    const margin = 80;
    const maxWidth = 1280 - margin * 2;

    const lines = wrapText(ctx, text, maxWidth);
    ctx.font = 'bold 40px Sans';
    const lineHeight = 46;
    const startY = (720 - lines.length * lineHeight) / 2 + 20;
    ctx.fillStyle = '#ffffff';
    for (let j = 0; j < lines.length; j++) {
      const line = lines[j];
      const textWidth = ctx.measureText(line).width;
      ctx.fillText(line, (1280 - textWidth) / 2, startY + j * lineHeight);
    }

    const imgPath = path.join(outDir, `slide${String(i).padStart(3, '0')}.png`);
    const out = fs.createWriteStream(imgPath);
    const stream = canvas.createPNGStream();
    await new Promise((res, rej) => {
      stream.pipe(out);
      out.on('finish', res);
      out.on('error', rej);
    });
    imagePaths.push(imgPath);
  }
  return imagePaths;
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      lines.push(line.trim());
      line = words[n] + ' ';
    } else {
      line = testLine;
    }
  }
  if (line) lines.push(line.trim());
  return lines;
}

function textToSpeech(script, outPath) {
  return new Promise((resolve, reject) => {
    gtts.save(outPath, script, (err) => {
      if (err) return reject(err);
      resolve(outPath);
    });
  });
}

function imagesAndAudioToVideo(imageDir, audioPath, outPath, secondsPerSlide = 4) {
  const cmd = [
    '-y',
    '-framerate', `${1 / secondsPerSlide}`,
    '-i', path.join(imageDir, 'slide%03d.png'),
    '-i', audioPath,
    '-c:v', 'libx264',
    '-r', '25',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-shortest',
    outPath
  ];
  return new Promise((resolve, reject) => {
    const ff = child_process.spawn('ffmpeg', cmd, { stdio: 'ignore' });
    ff.on('close', (code) => {
      if (code === 0) resolve(outPath);
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });
    ff.on('error', (err) => reject(err));
  });
}

async function generateVideo({ title = 'video', script = '' }) {
  if (!script || !script.trim()) {
    throw new Error('script is required');
  }
  const id = uuidv4();
  const baseDir = path.resolve('public', 'videos', id);
  await fs.remove(baseDir);
  await fs.ensureDir(baseDir);

  const slidesDir = path.join(baseDir, 'slides');
  await fs.ensureDir(slidesDir);

  const imagePaths = await textToSlides(script, slidesDir);

  const audioPath = path.join(baseDir, 'audio.mp3');
  await textToSpeech(script, audioPath);

  const outPath = path.join(baseDir, `${title.replace(/\s+/g, '_')}.mp4`);
  const words = script.split(/\s+/).length;
  const approxSeconds = Math.max(2, Math.round(words / 3 / imagePaths.length));
  await imagesAndAudioToVideo(slidesDir, audioPath, outPath, approxSeconds);

  return {
    id,
    output: outPath,
    url: `/videos/${id}/${path.basename(outPath)}`
  };
}

module.exports = {
  generateVideo
};
