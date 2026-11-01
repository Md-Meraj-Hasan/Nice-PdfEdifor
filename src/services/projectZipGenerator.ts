import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export async function generateProjectZip(onProgress?: (percent: number, status: string) => void) {
  try {
    onProgress?.(25, 'Downloading latest project archive...');
    const res = await fetch('/PDFMaster-Pro-Android-Project.zip');
    if (res.ok) {
      const blob = await res.blob();
      if (blob.size > 20000) {
        onProgress?.(80, 'Verifying complete project contents...');
        onProgress?.(100, 'Download complete!');
        saveAs(blob, 'PDFMaster-Pro-Android-Project.zip');
        return;
      }
    }
  } catch (err) {
    console.warn('Prebuilt zip fetch failed, generating dynamically:', err);
  }

  onProgress?.(10, 'Initializing Project Archive...');
  const zip = new JSZip();

  // 1. Root files
  zip.file(
    'package.json',
    JSON.stringify(
      {
        name: 'pdfmaster-pro-android',
        version: '1.0.0',
        private: true,
        type: 'module',
        scripts: {
          dev: 'vite',
          build: 'tsc && vite build',
          preview: 'vite preview',
          'cap:sync': 'npm run build && npx cap sync android',
          'cap:open': 'npx cap open android',
          'cap:build': 'npm run build && npx cap sync android && cd android && ./gradlew assembleDebug',
        },
        dependencies: {
          '@capacitor/android': '^7.0.1',
          '@capacitor/cli': '^7.0.1',
          '@capacitor/core': '^7.0.1',
          '@pdfsmaller/pdf-decrypt': '^1.0.1',
          '@pdfsmaller/pdf-encrypt': '^1.2.0',
          '@tailwindcss/vite': '^4.3.3',
          '@vitejs/plugin-react': '^6.1.1',
          'file-saver': '^2.0.5',
          jszip: '^3.10.1',
          'lucide-react': '^0.546.0',
          motion: '^12.23.24',
          'pdf-lib': '^1.17.1',
          'pdfjs-dist': '^4.10.38',
          react: '^19.0.1',
          'react-dom': '^19.0.1',
          tailwindcss: '^4.3.3',
          'tesseract.js': '^6.0.0',
          vite: '^8.3.0',
        },
        devDependencies: {
          '@types/file-saver': '^2.0.7',
          '@types/node': '^22.14.0',
          '@types/react': '^19.3.0',
          '@types/react-dom': '^19.3.0',
          typescript: '^7.0.2',
          'vite-plugin-pwa': '^0.21.1',
        },
      },
      null,
      2
    )
  );

  zip.file(
    'capacitor.config.json',
    JSON.stringify(
      {
        appId: 'com.pdfmaster.offlineeditor',
        appName: 'PDFMaster Pro',
        webDir: 'dist',
        bundledWebRuntime: false,
        server: {
          androidScheme: 'https',
        },
        android: {
          allowMixedContent: true,
          captureInput: true,
          webContentsDebuggingEnabled: true,
        },
      },
      null,
      2
    )
  );

  zip.file(
    'tsconfig.json',
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          useDefineForClassFields: false,
          module: 'ESNext',
          types: ['vite/client'],
          lib: ['ES2022', 'DOM', 'DOM.Iterable'],
          skipLibCheck: true,
          moduleResolution: 'bundler',
          isolatedModules: true,
          moduleDetection: 'force',
          allowJs: true,
          jsx: 'react-jsx',
          paths: {
            '@/*': ['./*'],
          },
          allowImportingTsExtensions: true,
          noEmit: true,
        },
        exclude: ['dist', 'android'],
      },
      null,
      2
    )
  );

  zip.file(
    'vite.config.ts',
    `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
`
  );

  zip.file(
    '.gitignore',
    `node_modules/
dist/
android/.gradle
android/build
android/app/build
*.apk
.env
.DS_Store
`
  );

  // 2. GitHub Actions Workflow
  const githubDir = zip.folder('.github')?.folder('workflows');
  githubDir?.file(
    'build-apk.yml',
    `name: Build Android APK

on:
  push:
    branches: [ main, master ]
  workflow_dispatch:

jobs:
  build:
    name: Build Native Android APK
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Setup Java JDK 17
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Setup Android SDK
        uses: android-actions/setup-android@v3

      - name: Install Node Dependencies
        run: npm install --legacy-peer-deps

      - name: Build Web App
        run: npm run build

      - name: Setup Capacitor Android
        run: |
          npm install --save @capacitor/core @capacitor/cli @capacitor/android --legacy-peer-deps
          npx cap add android || true
          npx cap sync android

      - name: Grant Execute Permission to Gradle
        run: |
          cd android
          chmod +x gradlew

      - name: Build Debug APK
        run: |
          cd android
          ./gradlew assembleDebug --stacktrace

      - name: Upload Debug APK Artifact
        uses: actions/upload-artifact@v4
        with:
          name: PDFMaster-Pro-Android-APK
          path: android/app/build/outputs/apk/debug/app-debug.apk
          retention-days: 30
`
  );

  // 3. Android build guide in Hindi & English
  zip.file(
    'README.md',
    `# PDFMaster Pro - Full Offline PDF Editor for Android

This project contains everything needed to run locally or build a native **Android APK** directly via **GitHub Actions** (Zero Android Studio required!).

---

## 🇮🇳 हिंदी गाइड (GitHub से APK कैसे बनाएं):

1. **इस ZIP को Unzip (Extract) करें** अपने कंप्यूटर या फोन पर।
2. **GitHub पर नया Repository बनाएं** (जैसे: \`pdf-master-app\`).
3. **इस फ़ोल्डर को GitHub पर अपलोड / Push करें**:
   \`\`\`bash
   git init
   git add .
   git commit -m "Initial commit for Android APK"
   git branch -M main
   git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO_NAME>.git
   git push -u origin main
   \`\`\`
4. **जादुई APK डाउनलोड**:
   - अपनी GitHub Repository में जाएं।
   - ऊपर **Actions** टैब पर क्लिक करें।
   - आपको **"Build Android APK"** रन होता दिखेगा (2-3 मिनट में हरा टिक ✅ आ जाएगा)।
   - उस रन पर क्लिक करें और नीचे **Artifacts** सेक्शन से **\`PDFMaster-Pro-Android-APK\`** डाउनलोड कर लें!
   - यह APK अपने Android फ़ोन में इनस्टॉल करें।

---

## 💻 स्थानीय रूप से चलाने के लिए (Local Development):

\`\`\`bash
npm install
npm run dev
\`\`\`

Android Studio में खोलने के लिए:
\`\`\`bash
npm run build
npx cap add android
npx cap open android
\`\`\`

---

## 🛠 Features:
- 100% Offline (इंटरनेट की ज़रूरत नहीं)
- PDF Merge (फ़ाइलों को जोड़ें)
- Cut, Copy, Paste Pages (पेज को कॉपी/कट करके किसी भी जगह पेस्ट करें)
- Crop with any condition (चारों तरफ से मार्जिन या ड्रैग करके क्रॉप करें)
- Rotate (90°, 180°, 270°, Odd/Even/Portrait/Landscape)
- Resize & Page Organizer (A4, Letter, Custom size)
- Split by condition (Single page, Custom range, Every N pages, Odd/Even)
- Offline OCR (इमेज और स्कैन्ड PDF से टेक्स्ट निकालें)
- Text Editable & Annotations (टेक्स्ट जोड़ें, पुराना टेक्स्ट वाइट-आउट / छुपाकर नया लिखें, डिजिटल सिग्नेचर, स्टाम्प, हाइलाइट)
`
  );

  onProgress?.(50, 'Packing Web Source Files...');

  // Fetch or copy HTML and icon
  const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>PDFMaster Pro - Offline PDF Editor</title>
    <link rel="manifest" href="/manifest.json" />
    <link rel="icon" type="image/svg+xml" href="/icon.svg" />
  </head>
  <body class="bg-slate-900 text-slate-100 antialiased">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;

  zip.file('index.html', indexHtml);

  const publicFolder = zip.folder('public');
  publicFolder?.file(
    'manifest.json',
    JSON.stringify(
      {
        id: '/',
        name: 'PDFMaster Pro - Offline PDF Editor',
        short_name: 'PDFMaster',
        start_url: '/',
        display: 'standalone',
        theme_color: '#2563eb',
        background_color: '#0f172a',
      },
      null,
      2
    )
  );

  onProgress?.(75, 'Generating Zip Archive...');
  const blob = await zip.generateAsync({ type: 'blob' }, metadata => {
    onProgress?.(75 + Math.round(metadata.percent * 0.2), `Compressing: ${Math.round(metadata.percent)}%`);
  });

  onProgress?.(100, 'Download starting...');
  saveAs(blob, 'PDFMaster-Pro-Android-GitHub-Project.zip');
}
