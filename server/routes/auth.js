// ייבוא הספריות הנדרשות
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authenticateUser = require('../middleware/auth');

// יוצרים Router - אובייקט שמנהל נתיבים (routes)
const router = express.Router();

/**
 * נתיב להרשמה (Register)
 * POST /api/auth/register
 * 
 * חיבור: Client → Server → Database
 * 
 * תהליך ההרשמה:
 * 1. מקבלים אימייל וסיסמה מהלקוח
 * 2. בודקים שהאימייל לא קיים כבר
 * 3. יוצרים משתמש חדש (הסיסמה מוצפנת אוטומטית במודל)
 * 4. יוצרים טוכן JWT
 * 5. מחזירים את הטוכן ללקוח
 */
router.post('/register', async (request, response) => {
  try {
    // שולפים את הנתונים מהבקשה
    const { email, password, dailyCalorieGoal } = request.body;
    
    // בדיקת תקינות - וידוא שהשדות הכרחיים קיימים
    if (!email || !password) {
      return response.status(400).json({
        success: false,
        message: 'אימייל וסיסמה הם שדות חובה'
      });
    }
    
    // בודקים אם המשתמש כבר קיים במסד הנתונים
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return response.status(400).json({
        success: false,
        message: 'משתמש עם אימייל זה כבר קיים במערכת'
      });
    }
    
    // יוצרים משתמש חדש
    // שימי לב: הסיסמה מוצפנת אוטומטית במודל (ב-pre save hook)
    const newUser = new User({
      email,
      password,
      dailyCalorieGoal: dailyCalorieGoal || 2000  // ברירת מחדל: 2000
    });
    
    // שומרים את המשתמש במסד הנתונים
    await newUser.save();
    
    // יוצרים טוכן JWT שיזהה את המשתמש בבקשות הבאות
    const token = jwt.sign(
      { userId: newUser._id },  // המידע שנצפין בטוכן
      process.env.JWT_SECRET,   // המפתח הסודי
      { expiresIn: '7d' }       // הטוכן יפוג תוקף אחרי 7 ימים
    );
    
    // מחזירים תשובה מוצלחת ללקוח
    response.status(201).json({
      success: true,
      message: 'נרשמת בהצלחה!',
      token,  // הטוכן שהלקוח ישמור
      user: {
        id: newUser._id,
        email: newUser.email,
        dailyCalorieGoal: newUser.dailyCalorieGoal
      }
    });
    
  } catch (error) {
    console.error('שגיאה בהרשמה:', error);
    response.status(500).json({
      success: false,
      message: 'אירעה שגיאה בהרשמה'
    });
  }
});

/**
 * נתיב להתחברות (Login)
 * POST /api/auth/login
 * 
 * חיבור: Client → Server → Database
 * 
 * תהליך ההתחברות:
 * 1. מקבלים אימייל וסיסמה
 * 2. מחפשים את המשתמש במסד הנתונים
 * 3. בודקים אם הסיסמה נכונה (עם הפונקציה comparePassword)
 * 4. יוצרים טוכן JWT
 * 5. מחזירים את הטוכן
 */
router.post('/login', async (request, response) => {
  try {
    const { email, password } = request.body;
    
    // בדיקת תקינות
    if (!email || !password) {
      return response.status(400).json({
        success: false,
        message: 'אימייל וסיסמה הם שדות חובה'
      });
    }
    
    // מחפשים את המשתמש במסד הנתונים
    const user = await User.findOne({ email });
    if (!user) {
      return response.status(401).json({
        success: false,
        message: 'אימייל או סיסמה שגויים'
      });
    }
    
    // בודקים אם הסיסמה נכונה
    // משתמשים בפונקציה comparePassword שהגדרנו במודל User
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      return response.status(401).json({
        success: false,
        message: 'אימייל או סיסמה שגויים'
      });
    }
    
    // יוצרים טוכן חדש
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // מחזירים תשובה מוצלחת
    response.json({
      success: true,
      message: 'התחברת בהצלחה!',
      token,
      user: {
        id: user._id,
        email: user.email,
        dailyCalorieGoal: user.dailyCalorieGoal
      }
    });
    
  } catch (error) {
    console.error('שגיאה בהתחברות:', error);
    response.status(500).json({
      success: false,
      message: 'אירעה שגיאה בהתחברות'
    });
  }
});

/**
 * נתיב לעדכון יעד קלורי יומי
 * PUT /api/auth/update-goal
 * 
 * חיבור: Client → Server (עם אימות) → Database
 * 
 * נתיב זה מוגן - דורש התחברות (authenticateUser)
 */
router.put('/update-goal', authenticateUser, async (request, response) => {
  try {
    const { dailyCalorieGoal } = request.body;
    
    // בדיקת תקינות
    if (!dailyCalorieGoal || dailyCalorieGoal < 500 || dailyCalorieGoal > 10000) {
      return response.status(400).json({
        success: false,
        message: 'יעד קלורי חייב להיות בין 500 ל-10000'
      });
    }
    
    // מעדכנים את המשתמש
    // request.user זמין כי ה-middleware authenticateUser הוסיף אותו
    request.user.dailyCalorieGoal = dailyCalorieGoal;
    await request.user.save();
    
    response.json({
      success: true,
      message: 'יעד הקלוריות עודכן בהצלחה',
      dailyCalorieGoal: request.user.dailyCalorieGoal
    });
    
  } catch (error) {
    console.error('שגיאה בעדכון יעד:', error);
    response.status(500).json({
      success: false,
      message: 'אירעה שגיאה בעדכון היעד'
    });
  }
});

/**
 * נתיב לקבלת פרטי המשתמש המחובר
 * GET /api/auth/me
 * 
 * נתיב מוגן - דורש התחברות
 */
router.get('/me', authenticateUser, async (request, response) => {
  try {
    response.json({
      success: true,
      user: {
        id: request.user._id,
        email: request.user.email,
        dailyCalorieGoal: request.user.dailyCalorieGoal
      }
    });
  } catch (error) {
    console.error('שגיאה בשליפת פרטי משתמש:', error);
    response.status(500).json({
      success: false,
      message: 'אירעה שגיאה בשליפת הפרטים'
    });
  }
});

// מייצאים את ה-Router
module.exports = router;