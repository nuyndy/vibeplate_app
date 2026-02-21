🍳 Trợ Lý Bếp & Quản Lý Thực Phẩm Thông Minh
Ứng dụng "All-in-one" giúp bạn quản lý tủ lạnh, gợi ý món ăn theo sở thích cá nhân và kết nối cộng đồng yêu bếp. Xây dựng trên nền tảng React Native (Expo) và Firebase.

<center><img src="https://i.pinimg.com/1200x/d3/7a/7c/d37a7caf924e6ea998f485bf8d2f18ab.jpg" alt="App Screenshot" width="400"/></center>

## Bảo mật API key trước khi build

Dự án đã được chuyển sang đọc key từ biến môi trường (`process.env.EXPO_PUBLIC_*`).

### 1) Tạo file `.env`

```bash
cp .env.example .env
```

### 2) Điền key thật vào `.env`

Các biến bắt buộc:

- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_OPENROUTER_API_KEY_CHAT`
- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_MODEL_NAME`
- `EXPO_PUBLIC_WEATHER_API_KEY`
- `EXPO_PUBLIC_CLOUD_NAME`
- `EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET`

> `.env` đã nằm trong `.gitignore`, không commit key thật lên repo.

### 3) Build

```bash
npm run lint
npx expo export --platform web
```

## Xuất file cài đặt mobile (.apk/.ipa)

### Android
```bash
cd android
./gradlew assembleDebug
# app-debug.apk tại android/app/build/outputs/apk/debug/app-debug.apk
```

### iOS
Build `.ipa` yêu cầu **macOS + Xcode**:
```bash
npx expo prebuild --platform ios
# mở ios/*.xcworkspace bằng Xcode để Archive/Export IPA
```

### Test thực tế trên máy thật (smoke test)
- Mở app, đăng nhập/đăng ký.
- Kiểm tra Chat AI trả lời.
- Kiểm tra CookAI Voice Control (bật mic, lệnh tiếp theo/quay lại, hoàn tất nấu).
- Kiểm tra upload ảnh ở các màn có Cloudinary.
- Theo dõi log crash qua `adb logcat` (Android) hoặc Devices and Simulators (iOS).
