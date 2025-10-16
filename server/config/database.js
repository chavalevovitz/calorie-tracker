// ייבוא הספרייה mongoose - זו הספרייה שמחברת את Node.js ל-MongoDB
const mongoose = require('mongoose');

/**
 * פונקציה שמחברת את השרת למסד הנתונים MongoDB
 * זה החיבור הראשון: Server ← → Database
 */
async function connectToDatabase() {
  try {
    // מתחברים ל-MongoDB עם הכתובת מקובץ .env
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('✅ התחברנו בהצלחה למסד הנתונים MongoDB');
  } catch (error) {
    console.error('❌ שגיאה בחיבור למסד הנתונים:', error.message);
    // אם יש בעיה בחיבור, עוצרים את התוכנית
    process.exit(1);
  }
}

// מאזינים לאירועים של החיבור למסד הנתונים
mongoose.connection.on('disconnected', () => {
  console.log('⚠️  החיבור למסד הנתונים התנתק');
});

mongoose.connection.on('error', (error) => {
  console.error('❌ שגיאה במסד הנתונים:', error);
});

// מייצאים את הפונקציה כדי שנוכל להשתמש בה בקובץ server.js
module.exports = connectToDatabase;