import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

const zip = new JSZip();

function addDir(dirPath, zipFolder) {
  const items = fs.readdirSync(dirPath);
  for (const item of items) {
    if (['node_modules', 'dist', '.git', '.cache', 'coverage', '.DS_Store', 'server.js'].includes(item)) continue;
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      addDir(fullPath, zipFolder.folder(item));
    } else {
      if (item.endsWith('.zip')) continue;
      const content = fs.readFileSync(fullPath);
      zipFolder.file(item, content);
    }
  }
}

async function run() {
  addDir('.', zip);
  const buf = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });
  if (!fs.existsSync('public')) fs.mkdirSync('public');
  fs.writeFileSync('public/PDFMaster-Pro-Android-Project.zip', buf);
  console.log('✅ Created public/PDFMaster-Pro-Android-Project.zip (' + Math.round(buf.length / 1024) + ' KB)');
}

run().catch(console.error);
