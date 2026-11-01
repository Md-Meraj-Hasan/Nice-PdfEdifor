# PDFMaster Pro - Full Offline PDF Editor for Android

This project contains everything needed to run locally or build a native **Android APK** directly via **GitHub Actions** (Zero Android Studio required!).

---

## 🇮🇳 हिंदी गाइड (GitHub से APK कैसे बनाएं):

1. **इस ZIP को Unzip (Extract) करें** अपने कंप्यूटर या फोन पर।
2. **GitHub पर नया Repository बनाएं** (जैसे: `pdf-master-app`).
3. **इस फ़ोल्डर को GitHub पर अपलोड / Push करें**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit for Android APK"
   git branch -M main
   git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO_NAME>.git
   git push -u origin main
   ```
4. **जादुई APK डाउनलोड**:
   - अपनी GitHub Repository में जाएं।
   - ऊपर **Actions** टैब पर क्लिक करें।
   - आपको **"Build Android APK"** रन होता दिखेगा (2-3 मिनट में हरा टिक ✅ आ जाएगा)।
   - उस रन पर क्लिक करें और नीचे **Artifacts** सेक्शन से **`PDFMaster-Pro-Android-APK`** डाउनलोड कर लें!
   - यह APK अपने Android फ़ोन में इनस्टॉल करें।

---

## 💻 स्थानीय रूप से चलाने के लिए (Local Development):

```bash
npm install
npm run dev
```

Android Studio में खोलने के लिए:
```bash
npm run build
npx cap add android
npx cap open android
```

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
