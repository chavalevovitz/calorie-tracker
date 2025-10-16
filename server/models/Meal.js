// ייבוא mongoose לעבודה עם MongoDB
const mongoose = require('mongoose');

/**
 * סכמה (Schema) של ארוחה - מגדירה איך ארוחה נראית במסד הנתונים
 * כל ארוחה מקושרת למשתמש ספציפי דרך userId
 */
const mealSchema = new mongoose.Schema({
  // מזהה המשתמש שהארוחה שייכת לו (חיבור ל-User)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',  // מתייחס למודל User
    required: true
  },
  
  // שם הארוחה (למשל: "פיצה", "סלט ירקות")
  mealName: {
    type: String,
    required: [true, 'שם הארוחה הוא שדה חובה'],
    trim: true
  },
  
  // כמות הקלוריות בארוחה
  calories: {
    type: Number,
    required: [true, 'כמות הקלוריות היא שדה חובה'],
    min: [0, 'כמות הקלוריות חייבת להיות חיובית']
  },
  
  // האם הארוחה זוהתה על ידי AI או הוזנה ידנית
  detectionMethod: {
    type: String,
    enum: ['ai_image', 'manual'],  // רק שתי אפשרויות מותרות
    required: true
  },
  
  // אם הארוחה זוהתה מתמונה, כאן נשמור את הנתיב לתמונה
  imageUrl: {
    type: String,
    default: null  // אם הוזן ידנית, זה יישאר null
  },
  
  // רמת הוודאות של ה-AI (0-100)
  // אם הוזן ידנית, זה יהיה null
  confidenceScore: {
    type: Number,
    min: 0,
    max: 100,
    default: null
  },
  
  // תאריך ושעה של הארוחה
  dateEaten: {
    type: Date,
    default: Date.now
  },
  
  // הערות נוספות (אופציונלי)
  notes: {
    type: String,
    default: ''
  }
});

/**
 * אינדקס לחיפוש מהיר של ארוחות לפי משתמש ותאריך
 * ככה נוכל לשלוף מהר את כל הארוחות של משתמש ביום מסוים
 */
mealSchema.index({ userId: 1, dateEaten: -1 });

// יוצרים את המודל מהסכמה ומייצאים אותו
const Meal = mongoose.model('Meal', mealSchema);

module.exports = Meal;