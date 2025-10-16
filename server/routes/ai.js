// ייבוא הספריות הנדרשות
const express = require('express');
const multer = require('multer');  // לטיפול בהעלאת קבצים
const axios = require('axios');    // לביצוע בקשות HTTP חיצוניות
const Meal = require('../models/Meal');
const authenticateUser = require('../middleware/auth');

// יוצרים Router
const router = express.Router();

/**
 * הגדרת multer לשמירת תמונות בזיכרון זמני
 * התמונות לא נשמרו על הדיסק, רק בזיכרון RAM
 * (אפשר לשנות לשמירה על דיסק אם רוצים)
 */
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024  // מקסימום 5MB
  },
  fileFilter: (request, file, callback) => {
    // מאפשרים רק תמונות
    if (file.mimetype.startsWith('image/')) {
      callback(null, true);
    } else {
      callback(new Error('רק קבצי תמונה מותרים'), false);
    }
  }
});

/**
 * פונקציה שמזהה מזון בתמונה ומחשבת קלוריות
 * משתמשת ב-Hugging Face API (או API אחר שתבחרי)
 * 
 * חיבור: Server → External AI API
 * 
 * @param {Buffer} imageBuffer - התמונה בפורמט buffer
 * @returns {Object} - { foodName, calories, confidence }
 */
async function analyzeFoodImage(imageBuffer) {
  try {
    // כאן נשתמש ב-Hugging Face API
    // אפשר להחליף ל-API אחר (Google Vision, Clarifai וכו')
    
    const HUGGING_FACE_API_URL = 'https://api-inference.huggingface.co/models/nateraw/food';
    
    // שולחים את התמונה ל-API
    const response = await axios.post(
      HUGGING_FACE_API_URL,
      imageBuffer,
      {
        headers: {
          'Authorization': `Bearer ${process.env.HUGGING_FACE_API_KEY}`,
          'Content-Type': 'application/octet-stream'
        }
      }
    );
    
    // ה-API מחזיר רשימה של תוצאות אפשריות
    // לוקחים את התוצאה הכי בטוחה (הראשונה)
    const topResult = response.data[0];
    const foodName = topResult.label;
    const confidenceScore = Math.round(topResult.score * 100);
    
    // מחשבים קלוריות משוערות לפי סוג המזון
    // זה חישוב פשוט - במציאות צריך מסד נתונים מלא
    const estimatedCalories = estimateCaloriesForFood(foodName);
    
    return {
      foodName: foodName,
      calories: estimatedCalories,
      confidenceScore: confidenceScore
    };
    
  } catch (error) {
    console.error('שגיאה בזיהוי תמונה:', error.message);
    
    // אם ה-API לא זמין, מחזירים ברירת מחדל
    return {
      foodName: 'מזון לא מזוהה',
      calories: 200,  // ערך ברירת מחדל
      confidenceScore: 0
    };
  }
}

/**
 * פונקציה עזר לחישוב קלוריות משוער לפי שם מזון
 * זה דוגמה פשוטה - במציאות צריך מסד נתונים תזונתי
 * 
 * @param {string} foodName - שם המזון
 * @returns {number} - כמות קלוריות משוערת
 */
function estimateCaloriesForFood(foodName) {
  // מילון פשוט של מזונות נפוצים
  const calorieDatabase = {
    'pizza': 285,
    'burger': 540,
    'sandwich': 350,
    'salad': 150,
    'pasta': 400,
    'rice': 206,
    'chicken': 165,
    'fish': 206,
    'bread': 265,
    'apple': 95,
    'banana': 105,
    'orange': 62,
    'egg': 155,
    'milk': 149,
    'cheese': 402,
    'yogurt': 100,
    'cake': 350,
    'ice cream': 207,
    'chocolate': 546,
    'coffee': 2,
    'tea': 2,
    'juice': 112,
    'soda': 140,
    'water': 0,
    'soup': 86,
    'fries': 312,
    'hotdog': 290,
    'taco': 226,
    'sushi': 200,
    'steak': 271
  };
  
  // מנסים למצוא התאמה במילון
  const foodLower = foodName.toLowerCase();
  for (const [key, calories] of Object.entries(calorieDatabase)) {
    if (foodLower.includes(key)) {
      return calories;
    }
  }
  
  // אם לא מצאנו התאמה, מחזירים ערך ממוצע
  return 250;
}

/**
 * נתיב להעלאת תמונה וזיהוי מזון
 * POST /api/ai/analyze-image
 * 
 * חיבור: Client → Server → AI API → Database
 * 
 * תהליך:
 * 1. מקבלים תמונה מהלקוח
 * 2. שולחים ל-AI לזיהוי
 * 3. מקבלים שם מזון וקלוריות
 * 4. שומרים כארוחה במסד הנתונים
 */
router.post('/analyze-image', authenticateUser, upload.single('foodImage'), async (request, response) => {
  try {
    // בודקים שהתמונה הועלתה
    if (!request.file) {
      return response.status(400).json({
        success: false,
        message: 'לא הועלתה תמונה'
      });
    }
    
    // מזהים את המזון בתמונה
    const analysisResult = await analyzeFoodImage(request.file.buffer);
    
    // יוצרים ארוחה חדשה עם התוצאות
    const newMeal = new Meal({
      userId: request.user._id,
      mealName: analysisResult.foodName,
      calories: analysisResult.calories,
      detectionMethod: 'ai_image',
      confidenceScore: analysisResult.confidenceScore,
      imageUrl: null,  // כרגע לא שומרים את התמונה, אבל אפשר להוסיף
      dateEaten: new Date()
    });
    
    // שומרים במסד הנתונים
    await newMeal.save();
    
    response.status(201).json({
      success: true,
      message: 'התמונה זוהתה והארוחה נוספה בהצלחה',
      meal: newMeal,
      analysis: {
        foodName: analysisResult.foodName,
        calories: analysisResult.calories,
        confidence: analysisResult.confidenceScore
      }
    });
    
  } catch (error) {
    console.error('שגיאה בניתוח תמונה:', error);
    response.status(500).json({
      success: false,
      message: 'אירעה שגיאה בניתוח התמונה',
      error: error.message
    });
  }
});

/**
 * נתיב לזיהוי מזון בלבד (בלי לשמור)
 * POST /api/ai/identify-only
 * 
 * מאפשר למשתמש לראות מה ה-AI מזהה לפני השמירה
 * ואז להוסיף ידנית אם רוצה לשנות משהו
 */
router.post('/identify-only', authenticateUser, upload.single('foodImage'), async (request, response) => {
  try {
    if (!request.file) {
      return response.status(400).json({
        success: false,
        message: 'לא הועלתה תמונה'
      });
    }
    
    // מזהים את המזון
    const analysisResult = await analyzeFoodImage(request.file.buffer);
    
    // מחזירים רק את התוצאות, בלי לשמור
    response.json({
      success: true,
      analysis: {
        foodName: analysisResult.foodName,
        calories: analysisResult.calories,
        confidence: analysisResult.confidenceScore
      }
    });
    
  } catch (error) {
    console.error('שגיאה בזיהוי תמונה:', error);
    response.status(500).json({
      success: false,
      message: 'אירעה שגיאה בזיהוי התמונה'
    });
  }
});

// מייצאים את ה-Router
module.exports = router;