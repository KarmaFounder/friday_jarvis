# 🛠️ Friday Development Guide

## 🔥 Hot Reload Development

### For Development (with hot reload):
```bash
python start_dev.py
```

This will start:
- **Flask Backend**: http://localhost:5000 (API endpoints)
- **React Dev Server**: http://localhost:3000 (Hot reload interface)

**Use http://localhost:3000 for development!**

### For Production (build once):
```bash
python build_react.py
python start_web.py
```

## 🎯 Development Workflow

### 1. **Making UI Changes** ⚡
- Edit files in `/monday_backend/react_app/src/`
- Changes auto-reload at http://localhost:3000
- No need to rebuild!

### 2. **Making Backend Changes** 🔧
- Edit files in `/monday_backend/web_server.py` or `/tools.py`
- Restart `python start_dev.py`

### 3. **Key Files for UI Development:**

#### Sound Waves:
```
/monday_backend/react_app/src/components/SoundWave.js
/monday_backend/react_app/src/components/SoundWave.css
```

#### Main App:
```
/monday_backend/react_app/src/App.js
/monday_backend/react_app/src/App.css
```

#### Voice Hooks:
```
/monday_backend/react_app/src/hooks/useSpeechRecognition.js
/monday_backend/react_app/src/hooks/useSpeechSynthesis.js
```

## 🎨 Quick UI Changes

### Make Sound Waves Thicker:
Edit `/monday_backend/react_app/src/components/SoundWave.css`:
```css
.wave-bar {
  width: 3px; /* Change from 1px to 3px */
}
```

### Change Colors:
```css
.sound-wave.listening .wave-bar {
  background: #ff0000; /* Change to red */
}
```

### Add More Bars:
Edit `/monday_backend/react_app/src/components/SoundWave.js`:
```js
const bars = Array.from({ length: 20 }, (_, i) => i); // Change from 15 to 20
```

## 🚀 Development Tips

1. **Hot Reload**: Changes save automatically and page refreshes
2. **Console**: Open browser DevTools (F12) to see logs
3. **Network**: Monitor API calls in DevTools Network tab
4. **Performance**: React DevTools extension recommended

## 📂 File Structure

```
friday_jarvis/
├── start_dev.py           # 🔥 Development server
├── build_react.py         # 📦 Production build
├── start_web.py           # 🌐 Production server
└── monday_backend/
    ├── react_app/         # ⚛️ React source code
    │   ├── src/
    │   │   ├── App.js     # Main component
    │   │   ├── components/
    │   │   │   └── SoundWave.js  # Sound waves
    │   │   └── hooks/     # Voice functionality
    │   └── package.json
    ├── web_server.py      # 🔧 Flask backend
    └── templates/         # 📄 HTML templates
```

## 🎉 Development Commands

### Start Development:
```bash
python start_dev.py
```

### Install New React Package:
```bash
cd monday_backend/react_app
npm install package-name
```

### Format Code:
```bash
cd monday_backend/react_app
npm run format  # If you add prettier
```

### Production Build:
```bash
python build_react.py
```

---

**Happy coding! Make changes and see them instantly! 🎨⚡**
