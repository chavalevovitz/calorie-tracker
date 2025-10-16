// ייבוא כל הספריות והמודולים הנדרשים
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectToDatabase = require('./config/database');

// טעינת משתני הסביבה מקובץ .env
dotenv.config();


// יוצרים את אפליקציית Express
const app = express();

/**
 * הגדרת Middleware - פונקציות שרצות על כל בקשה
 */

// CORS - מאפשר לצד הלקוח (Frontend) לתקשר עם השרת
// בלי זה, הדפדפן יחסום את הבקשות
app.use(cors({
  origin: '*',  // מאפשר מכל מקור (בייצור צריך להגביל!)
  credentials: true
}));

// Body Parser - מאפשר לקרוא JSON בבקשות
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * חיבור כל הנתיבים (Routes)
 * כל נתיב מתחיל בקידומת שמגדירה את התחום שלו
 */

// נתיבי אימות (הרשמה, התחברות)
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);
// דוגמאות: POST /api/auth/register, POST /api/auth/login

// נתיבי ארוחות (הוספה, שליפה, מחיקה)
const mealRoutes = require('./routes/meals');
app.use('/api/meals', mealRoutes);
// דוגמאות: GET /api/meals/today, POST /api/meals/manual

// נתיבי AI (זיהוי תמונות)
const aiRoutes = require('./routes/ai');
app.use('/api/ai', aiRoutes);
// דוגמאות: POST /api/ai/analyze-image

/**
 * נתיב בדיקת תקינות - לבדוק שהשרת עובד
 * GET /api/health
 */
app.get('/api/health', (request, response) => {
  response.json({
    success: true,
    message: 'השרת פועל בהצלחה! ✅',
    timestamp: new Date().toISOString()
  });
});

/**
 * נתיב שמטפל בכל הנתיבים שלא קיימים (404)
 */
app.use('*', (request, response) => {
  response.status(404).json({
    success: false,
    message: 'הנתיב שביקשת לא נמצא'
  });
});

/**
 * Middleware לטיפול בשגיאות כלליות
 * זה "תופס" כל שגיאה שקורית בשרת
 */
app.use((error, request, response, next) => {
  console.error('שגיאה כללית:', error);
  
  response.status(error.status || 500).json({
    success: false,
    message: error.message || 'אירעה שגיאה בשרת',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

/**
 * פונקציה להפעלת השרת
 * 
 * תהליך ההפעלה:
 * 1. מתחברים למסד הנתונים (MongoDB)
 * 2. מפעילים את השרת על הפורט שהוגדר
 */
async function startServer() {
  try {
    // שלב 1: חיבור למסד הנתונים
    // זה החיבור: Server ← → Database
    await connectToDatabase();
    
    // שלב 2: הפעלת השרת
    const PORT = process.env.PORT || 5000;
    
    app.listen(PORT, () => {
      console.log('╔════════════════════════════════════════╗');
      console.log(`║  🚀 השרת רץ בהצלחה על פורט ${PORT}     ║`);
      console.log('║  📡 כתובת: http://localhost:' + PORT + '      ║');
      console.log('║  ✅ מסד הנתונים מחובר                  ║');
      console.log('╚════════════════════════════════════════╝');
      console.log('\nנתיבים זמינים:');
      console.log('  POST   /api/auth/register');
      console.log('  POST   /api/auth/login');
      console.log('  GET    /api/auth/me');
      console.log('  PUT    /api/auth/update-goal');
      console.log('  POST   /api/meals/manual');
      console.log('  GET    /api/meals/today');
      console.log('  GET    /api/meals/history');
      console.log('  DELETE /api/meals/:mealId');
      console.log('  PUT    /api/meals/:mealId');
      console.log('  POST   /api/ai/analyze-image');
      console.log('  POST   /api/ai/identify-only');
      console.log('  GET    /api/health');
    });
    
  } catch (error) {
    console.error('❌ שגיאה בהפעלת השרת:', error);
    process.exit(1);
  }
}

// מפעילים את השרת
startServer();