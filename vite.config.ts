import { defineConfig } from 'vite';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const part = (n: string) => readFileSync(resolve(__dirname, 'partials', n), 'utf8');

export default defineConfig({
  // GitHub Pages 프로젝트 주소(/repo/)와 커스텀 도메인 둘 다 되도록 상대 경로
  base: './',
  plugins: [{
    name: 'partials',
    // 개발 서버 전용: scripts/og.html 에서 그린 OG 이미지를 public/og.png 로 저장
    configureServer(server) {
      server.middlewares.use('/__save-og', (req, res) => {
        const chunks: Buffer[] = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => { writeFileSync(resolve(__dirname, 'public/og.png'), Buffer.concat(chunks)); res.end('ok'); });
      });
    },
    transformIndexHtml(html) {
      return html.replace('<!--HEAD-->', part('head.html')).replaceAll('%SITE%', process.env.SITE_URL ?? './').replace('<!--TOP-->', part('top.html')).replace('<!--FOOT-->', part('foot.html'));
    },
  }],
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        report: resolve(__dirname, 'report.html'),
        sample: resolve(__dirname, 'sample.html'),
        full1: resolve(__dirname, 'full-e31f9f43f85e.html'),
        unlock: resolve(__dirname, 'unlock.html'),
        terms: resolve(__dirname, 'terms.html'),
        refund: resolve(__dirname, 'refund.html'),
        privacy: resolve(__dirname, 'privacy.html'),
      },
      // 파일 이름을 배포마다 바꾸지 않는다. GitHub Pages 가 HTML 을 10분 캐시하므로
      // 해시 이름을 쓰면 예전 HTML 이 지워진 스크립트를 찾다가 화면이 빈다.
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
});
