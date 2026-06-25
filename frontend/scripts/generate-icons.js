/* eslint-env node */
import { readFileSync, writeFileSync } from 'fs';
import { Resvg } from '@resvg/resvg-js';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sizes = [192, 512];
const publicDir = join(__dirname, '..', 'public');
const info = (...args) => process.stdout.write(`${args.join(' ')}\n`);

// SVG 파일 읽기
const svgPath = join(publicDir, 'icon.svg');
const svg = readFileSync(svgPath, 'utf-8');

info('Generating PNG icons from SVG...');

sizes.forEach((size) => {
  // SVG 크기 조정 (viewBox 유지, width/height 속성 변경)
  const resizedSvg = svg.replace(/width="512" height="512"/, `width="${size}" height="${size}"`);

  // PNG로 변환
  const resvg = new Resvg(resizedSvg, {
    fitTo: {
      mode: 'width',
      value: size,
    },
  });

  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  // 파일 저장
  const outputPath = join(publicDir, `icon-${size}.png`);
  writeFileSync(outputPath, pngBuffer);

  info(`Generated: icon-${size}.png (${size}x${size})`);
});

info('All icons generated successfully.');
