// ייבוא jsonwebtoken - ספרייה ליצירה ואימות של טוכנים
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware לאימות משתמש
 * פונקציה זו רצה לפני כל בקשה שדורשת התחברות
 * 
 * תהליך האימות:
 * 1. בודקת אם יש טוכן בכותרות הבקשה
 * 2. מאמתת שהטוכן תקין (לא זויף)
 * 3. מוצאת את המשתמש במסד הנתונים
 * 4. אם הכל תקין - מאפשרת להמשיך לפעולה המבוקשת
 * 
 * זה חיבור בין: Client → Server (בדיקת זהות)
 */
async function authenticateUser(request, response, next) {
  try {
    // שלב 1: שולפים את הטוכן מהכותרת Authorization
    // הכותרת נראית כך: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    const authorizationHeader = request.header('Authorization');
    
    // בודקים אם הכותרת קיימת ומתחילה ב-"Bearer "
    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
      return response.status(401).json({ 
        success: false, 
        message: 'אין אישור גישה. נא להתחבר תחילה.' 
      });
    }
    
    // מפרידים את המילה "Bearer" מהטוכן עצמו
    const token = authorizationHeader.replace('Bearer ', '');
    
    // שלב 2: מאמתים את הטוכן עם המפתח הסודי
    // אם הטוכן זויף או פג תוקף - יזרק שגיאה
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    
    // שלב 3: מחפשים את המשתמש במסד הנתונים
    // decodedToken.userId = המזהה שהצפנו בטוכן כשהמשתמש התחבר
    const user = await User.findById(decodedToken.userId).select('-password');
    
    if (!user) {
      return response.status(401).json({ 
        success: false, 
        message: 'משתמש לא נמצא' 
      });
    }
    
    // שלב 4: שומרים את המשתמש ב-request כדי שנוכל להשתמש בו בהמשך
    request.user = user;
    
    // ממשיכים לפונקציה הבאה (למשל: שליפת ארוחות)
    next();
    
  } catch (error) {
    // אם יש שגיאה (טוכן לא תקין, פג תוקף וכו')
    console.error('שגיאה באימות:', error.message);
    return response.status(401).json({ 
      success: false, 
      message: 'אימות נכשל. נא להתחבר מחדש.' 
    });
  }
}

// מייצאים את הפונקציה
module.exports = authenticateUser;