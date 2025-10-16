// ייבוא הספריות הנדרשות
const express = require('express');
const Meal = require('../models/Meal');
const authenticateUser = require('../middleware/auth');

// יוצרים Router
const router = express.Router();

// כל הנתיבים כאן דורשים התחברות - לכן נוסיף את ה-middleware לכולם
router.use(authenticateUser);

/**
 * הוספת ארוחה חדשה - באופן ידני
 * POST /api/meals/manual
 * 
 * חיבור: Client → Server (עם אימות) → Database
 * 
 * המשתמש מזין את שם הארוחה וכמות הקלוריות ידנית
 */
router.post('/manual', async (request, response) => {
  try {
    const { mealName, calories, notes, dateEaten } = request.body;
    
    // בדיקת תקינות - וידוא שהשדות הכרחיים קיימים
    if (!mealName || !calories) {
      return response.status(400).json({
        success: false,
        message: 'שם הארוחה וכמות הקלוריות הם שדות חובה'
      });
    }
    
    // בדיקה שהקלוריות הן מספר חיובי
    if (calories < 0) {
      return response.status(400).json({
        success: false,
        message: 'כמות הקלוריות חייבת להיות חיובית'
      });
    }
    
    // יוצרים ארוחה חדשה
    const newMeal = new Meal({
      userId: request.user._id,  // מזהה המשתמש מה-middleware
      mealName: mealName.trim(),
      calories: Number(calories),
      detectionMethod: 'manual',  // הוזן ידנית
      notes: notes || '',
      dateEaten: dateEaten ? new Date(dateEaten) : new Date()  // אם לא צוין - היום
    });
    
    // שומרים במסד הנתונים
    await newMeal.save();
    
    response.status(201).json({
      success: true,
      message: 'הארוחה נוספה בהצלחה',
      meal: newMeal
    });
    
  } catch (error) {
    console.error('שגיאה בהוספת ארוחה ידנית:', error);
    response.status(500).json({
      success: false,
      message: 'אירעה שגיאה בהוספת הארוחה'
    });
  }
});

/**
 * שליפת כל הארוחות של היום
 * GET /api/meals/today
 * 
 * חיבור: Client → Server (עם אימות) → Database
 * 
 * מחזיר את כל הארוחות שהמשתמש המחובר אכל היום
 * וגם את סך הקלוריות של היום
 */
router.get('/today', async (request, response) => {
  try {
    // יוצרים תאריך התחלה וסיום של היום הנוכחי
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);  // 00:00:00
    
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);  // 23:59:59
    
    // מחפשים את כל הארוחות של המשתמש היום
    const todayMeals = await Meal.find({
      userId: request.user._id,
      dateEaten: {
        $gte: startOfToday,  // גדול או שווה להתחלת היום
        $lte: endOfToday     // קטן או שווה לסוף היום
      }
    }).sort({ dateEaten: -1 });  // ממיינים מהחדש לישן
    
    // מחשבים את סך הקלוריות של היום
    const totalCaloriesToday = todayMeals.reduce((sum, meal) => sum + meal.calories, 0);
    
    response.json({
      success: true,
      meals: todayMeals,
      totalCalories: totalCaloriesToday,
      dailyGoal: request.user.dailyCalorieGoal,
      remainingCalories: request.user.dailyCalorieGoal - totalCaloriesToday
    });
    
  } catch (error) {
    console.error('שגיאה בשליפת ארוחות היום:', error);
    response.status(500).json({
      success: false,
      message: 'אירעה שגיאה בשליפת הארוחות'
    });
  }
});

/**
 * שליפת היסטוריית ארוחות לפי טווח תאריכים
 * GET /api/meals/history?startDate=2024-01-01&endDate=2024-01-31
 * 
 * חיבור: Client → Server (עם אימות) → Database
 * 
 * מאפשר למשתמש לראות מה אכל בימים קודמים
 */
router.get('/history', async (request, response) => {
  try {
    // שולפים תאריכים מה-query parameters
    const { startDate, endDate } = request.query;
    
    // אם לא צוינו תאריכים, מחזירים את ה-30 יום האחרונים
    let dateFilter = { userId: request.user._id };
    
    if (startDate && endDate) {
      dateFilter.dateEaten = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else {
      // 30 יום אחורה
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      dateFilter.dateEaten = { $gte: thirtyDaysAgo };
    }
    
    // מחפשים את הארוחות
    const meals = await Meal.find(dateFilter).sort({ dateEaten: -1 });
    
    // מקבצים לפי ימים
    const mealsByDay = {};
    meals.forEach(meal => {
      const dayKey = meal.dateEaten.toISOString().split('T')[0];  // YYYY-MM-DD
      if (!mealsByDay[dayKey]) {
        mealsByDay[dayKey] = {
          date: dayKey,
          meals: [],
          totalCalories: 0
        };
      }
      mealsByDay[dayKey].meals.push(meal);
      mealsByDay[dayKey].totalCalories += meal.calories;
    });
    
    // ממירים לרשימה
    const history = Object.values(mealsByDay);
    
    response.json({
      success: true,
      history: history,
      totalDays: history.length
    });
    
  } catch (error) {
    console.error('שגיאה בשליפת היסטוריה:', error);
    response.status(500).json({
      success: false,
      message: 'אירעה שגיאה בשליפת ההיסטוריה'
    });
  }
});

/**
 * מחיקת ארוחה
 * DELETE /api/meals/:mealId
 * 
 * חיבור: Client → Server (עם אימות) → Database
 * 
 * מאפשר למשתמש למחוק ארוחה שהוא הוסיף
 */
router.delete('/:mealId', async (request, response) => {
  try {
    const { mealId } = request.params;
    
    // מחפשים את הארוחה
    const meal = await Meal.findById(mealId);
    
    if (!meal) {
      return response.status(404).json({
        success: false,
        message: 'הארוחה לא נמצאה'
      });
    }
    
    // בודקים שהארוחה שייכת למשתמש המחובר (אבטחה!)
    if (meal.userId.toString() !== request.user._id.toString()) {
      return response.status(403).json({
        success: false,
        message: 'אין לך הרשאה למחוק ארוחה זו'
      });
    }
    
    // מחיקת הארוחה
    await Meal.findByIdAndDelete(mealId);
    
    response.json({
      success: true,
      message: 'הארוחה נמחקה בהצלחה'
    });
    
  } catch (error) {
    console.error('שגיאה במחיקת ארוחה:', error);
    response.status(500).json({
      success: false,
      message: 'אירעה שגיאה במחיקת הארוחה'
    });
  }
});

/**
 * עדכון ארוחה
 * PUT /api/meals/:mealId
 * 
 * חיבור: Client → Server (עם אימות) → Database
 * 
 * מאפשר למשתמש לערוך ארוחה (לשנות שם או קלוריות)
 */
router.put('/:mealId', async (request, response) => {
  try {
    const { mealId } = request.params;
    const { mealName, calories, notes } = request.body;
    
    // מחפשים את הארוחה
    const meal = await Meal.findById(mealId);
    
    if (!meal) {
      return response.status(404).json({
        success: false,
        message: 'הארוחה לא נמצאה'
      });
    }
    
    // בודקים שהארוחה שייכת למשתמש המחובר
    if (meal.userId.toString() !== request.user._id.toString()) {
      return response.status(403).json({
        success: false,
        message: 'אין לך הרשאה לערוך ארוחה זו'
      });
    }
    
    // מעדכנים את הערכים (רק אם סופקו)
    if (mealName) meal.mealName = mealName.trim();
    if (calories !== undefined) meal.calories = Number(calories);
    if (notes !== undefined) meal.notes = notes;
    
    await meal.save();
    
    response.json({
      success: true,
      message: 'הארוחה עודכנה בהצלחה',
      meal: meal
    });
    
  } catch (error) {
    console.error('שגיאה בעדכון ארוחה:', error);
    response.status(500).json({
      success: false,
      message: 'אירעה שגיאה בעדכון הארוחה'
    });
  }
});

// מייצאים את ה-Router
module.exports = router;