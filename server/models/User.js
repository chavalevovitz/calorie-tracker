// ייבוא mongoose לעבודה עם MongoDB
const mongoose = require('mongoose');
// ייבוא bcrypt להצפנת סיסמאות
const bcrypt = require('bcryptjs');

/**
 * סכמה (Schema) של משתמש - מגדירה איך משתמש נראה במסד הנתונים
 * כל משתמש יכיל: אימייל, סיסמה, יעד קלורי יומי, ותאריך יצירה
 */
const userSchema = new mongoose.Schema({
  // כתובת אימייל - חייבת להיות ייחודית
  email: {
    type: String,
    required: [true, 'אימייל הוא שדה חובה'],
    unique: true,
    lowercase: true,  // תמיד שומר באותיות קטנות
    trim: true        // מסיר רווחים מיותרים
  },
  
  // סיסמה מוצפנת
  password: {
    type: String,
    required: [true, 'סיסמה היא שדה חובה'],
    minlength: [6, 'הסיסמה חייבת להכיל לפחות 6 תווים']
  },
  
  // יעד קלוריות יומי (ברירת מחדל: 2000)
  dailyCalorieGoal: {
    type: Number,
    default: 2000,
    min: [500, 'יעד קלורי לא יכול להיות פחות מ-500'],
    max: [10000, 'יעד קלורי לא יכול להיות יותר מ-10000']
  },
  
  // תאריך יצירת החשבון
  createdAt: {
    type: Date,
    default: Date.now
  }
});

/**
 * פונקציה שרצה לפני שמירת משתמש חדש
 * מטרה: להצפין את הסיסמה לפני ששומרים אותה במסד הנתונים
 * ככה אף אחד (כולל אנחנו) לא יכול לראות את הסיסמה המקורית
 */
userSchema.pre('save', async function(next) {
  // אם הסיסמה לא שונתה, ממשיכים הלאה
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    // יוצרים "מלח" להצפנה (ככל שהמספר גבוה יותר, ההצפנה חזקה יותר)
    const salt = await bcrypt.genSalt(10);
    // מצפינים את הסיסמה עם המלח
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * פונקציה שבודקת אם סיסמה שהמשתמש הזין תואמת לסיסמה המוצפנת
 * @param {string} enteredPassword - הסיסמה שהמשתמש הזין
 * @returns {boolean} - true אם הסיסמאות תואמות
 */
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// יוצרים את המודל מהסכמה ומייצאים אותו
const User = mongoose.model('User', userSchema);

module.exports = User;