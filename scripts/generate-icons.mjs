import { Jimp } from 'jimp';
import { mkdirSync } from 'fs';

mkdirSync('public', { recursive: true });

async function generateIcon(size, filename) {
  const image = new Jimp({ width: size, height: size, color: 0x1a3a5cff });

  const cx = size / 2;
  const cy = size / 2;
  const outerR = Math.floor(size * 0.3);
  const innerR = Math.floor(size * 0.16);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist2 = dx * dx + dy * dy;
      if (dist2 <= outerR * outerR && dist2 > innerR * innerR) {
        image.setPixelColor(0xffffffff, x, y);
      }
    }
  }

  await image.write(filename);
  console.log(`✓ ${filename} (${size}x${size})`);
}

await generateIcon(192, 'public/icon-192.png');
await generateIcon(512, 'public/icon-512.png');
await generateIcon(180, 'public/apple-touch-icon.png');
console.log('アイコン生成完了！');
