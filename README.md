# 🍽️ מעקב קלוריות חכם - Calorie Tracker

אפליקציית ווב מתקדמת למעקב אחר צריכת קלוריות יומית, עם יכולת זיהוי אוטומטי של מזון מתמונות באמצעות בינה מלאכותית.

## 🎯 תיאור הפרויקט

אפליקציה Full-Stack המאפשרת למשתמשים:
- 📸 **זיהוי מזון מתמונות** באמצעות AI
- ✍️ **הזנה ידנית** של ארוחות
- 📊 **מעקב יומי** אחר צריכת קלוריות
- 📅 **לוח שנה אינטראקטיבי** עם היסטוריה מלאה
- 🎯 **הגדרת יעדים אישיים**
- 🔐 **מערכת משתמשים מאובטחת**

## 🛠️ טכנולוגיות

### Backend
- Node.js + Express.js
- MongoDB + Mongoose
- JWT Authentication
- bcrypt להצפנת סיסמאות
- Multer להעלאת קבצים

### Frontend
- HTML5 + CSS3
- JavaScript (Vanilla)
- Responsive Design (Mobile First)
- Fetch API

### External APIs
- Hugging Face - זיהוי מזון מתמונות

## ✨ תכונות מיוחדות

### 🕐 "יום לוגי" - התחלה ב-04:00
המערכת מגדירה "יום" בצורה חכמה:
- ארוחות בשעות 00:00-03:59 נספרות **ליום הקודם**
- "יום חדש" מתחיל רק ב-**04:00 בבוקר**
- מתאים לאנשים שאוכלים מאוחר בלילה!

### 📅 לוח שנה אינטראקטיבי
- ימים עם ארוחות מסומנים בצבע ירוק
- לחיצה על יום מציגה פירוט מלא
- ניווט חופשי בין חודשים

## 🚀 התקנה והרצה

### דרישות מוקדמות
- Node.js (גרסה 16+)
- MongoDB Community (מותקן לוקאלית)

### הוראות התקנה

1. **Clone הפרויקט:**
```bash
git clone https://github.com/chavalevovitz/calorie-tracker.git
cd calorie-tracker
```

2. **התקנת תלויות:**
```bash
npm install
```

3. **הגדרת משתני סביבה:**

צור קובץ `.env` בתיקייה הראשית:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/calorie-tracker
JWT_SECRET=your_random_secret_key_at_least_20_characters
HUGGING_FACE_API_KEY=********
```

**חשוב:**
- `JWT_SECRET` - מפתח אקראי ארוך (לפחות 20 תווים)
- מפתח ה-Hugging Face כבר מוגדר ופעיל

4. **התקנת MongoDB Community:**

**קישור הורדה ישיר ל-Windows:**
```
https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-8.0.4-signed.msi
```

או גרסה 7.x:
```
https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-7.0.14-signed.msi
```

**התקנה:**
- הפעל את הקובץ שהורדת
- בחר **Complete**
- ✅ סמן "Install MongoDB as a Service"
- המשך עם ברירות המחדל

5. **הרצת השרת:**
```bash
npm start
```

השרת ירוץ על: `http://localhost:5000`

6. **פתיחת האפליקציה:**

פתח את `client/index.html` בדפדפן, או השתמש ב-Live Server ב-VS Code.

## 📖 שימוש

### הרשמה והתחברות
1. פתח את האפליקציה
2. לחץ על "הרשמה חדשה"
3. הזן אימייל, סיסמה ויעד קלורי יומי
4. התחבר עם הפרטים

### הוספת ארוחה מתמונה
1. לחץ על "📸 צלם/העלה תמונה"
2. צלם או בחר תמונה של מזון
3. לחץ על "🔍 זהה"
4. ערוך את השם והקלוריות אם נדרש
5. לחץ על "💾 שמור והוסף ארוחה"

### הוספת ארוחה ידנית
1. לחץ על "✍️ הזנה ידנית"
2. הזן שם ארוחה וקלוריות
3. לחץ על "➕ הוסף ארוחה"

### צפייה בהיסטוריה
1. גלול למטה
2. לחץ על "📅 צפה בהיסטוריה"
3. לחץ על יום ירוק בלוח השנה לפירוט מלא

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - הרשמה
- `POST /api/auth/login` - התחברות
- `GET /api/auth/me` - פרטי משתמש מחובר
- `PUT /api/auth/update-goal` - עדכון יעד קלורי

### Meals
- `POST /api/meals/manual` - הוספת ארוחה ידנית
- `GET /api/meals/today` - ארוחות היום
- `GET /api/meals/history` - היסטוריה
- `PUT /api/meals/:id` - עדכון ארוחה
- `DELETE /api/meals/:id` - מחיקת ארוחה

### AI
- `POST /api/ai/analyze-image` - זיהוי מזון מתמונה
- `POST /api/ai/identify-only` - זיהוי בלבד (בלי שמירה)

## 🔒 אבטחה

- הצפנת סיסמאות עם bcrypt (10 rounds)
- JWT tokens עם תפוגה של 7 ימים
- Protected routes עם middleware
- Validation על כל הקלטים
- CORS מוגדר

## 📱 Mobile First Design

האפליקציה מותאמת במיוחד למובייל:
- עיצוב Responsive מלא
- כפתורים גדולים ונוחים למגע
- לוח שנה מותאם למסכים קטנים
- טקסט קריא בכל הגדלים

## 🎨 תכונות עיצוביות

- גרדיאנטים בצבעי סגול
- עיגולים לסיכום יומי
- אנימציות חלקות
- אייקונים אמוג'י ידידותיים
- פלטת צבעים עקבית

## 📝 מבנה הפרויקט

```
calorie-tracker/
├── client/           # Frontend
│   ├── *.html       # דפי HTML
│   ├── css/         # עיצוב
│   └── js/          # לוגיקה
├── server/          # Backend
│   ├── config/      # הגדרות
│   ├── models/      # מודלים
│   ├── routes/      # נתיבי API
│   ├── middleware/  # Middleware
│   └── server.js    # נקודת כניסה
├── .env             # משתני סביבה (לא ב-Git!)
├── .gitignore       # קבצים להתעלם
├── package.json     # תלויות
└── README.md        # זה!
```

## 👨‍💻 מפתח

**Chava Levovitz**
- 📧 Email: chavawork1@gmail.com
- 💼 LinkedIn: linkedin.com/in/chava-levovitz
- 🐙 GitHub: [@chavalevovitz](https://github.com/chavalevovitz)

## 📄 רישיון

B.Ed. in Computer Science,  
Software Engineer from the Institute for Technological Training


---

⭐ אם אהבת את הפרויקט - תן כוכב ב-GitHub!

📅 **תאריך יצירה:** אוקטובר 2025
