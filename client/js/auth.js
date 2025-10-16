/**
 * קובץ auth.js - לוגיקה של הרשמה והתחברות
 * 
 * משתמש בפונקציות מ-api.js
 * חיבור: UI → api.js → Server
 */

// ממתינים שהדף ייטען במלואו
document.addEventListener('DOMContentLoaded', function() {
  
  // ============================================
  // טיפול בטופס הרשמה
  // ============================================
  
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegisterSubmit);
  }
  
  // ============================================
  // טיפול בטופס התחברות
  // ============================================
  
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLoginSubmit);
  }
});

/**
 * פונקציה שמטפלת בשליחת טופס הרשמה
 * נקראת כאשר המשתמש לוחץ על כפתור "הרשמה"
 */
async function handleRegisterSubmit(event) {
  // מונעים מהדף לרענן (התנהגות ברירת מחדל של טופס)
  event.preventDefault();
  
  // שולפים את הערכים מהשדות
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const dailyCalorieGoal = parseInt(document.getElementById('dailyCalorieGoal').value);
  
  // אלמנטים ל-UI
  const messageElement = document.getElementById('registerMessage');
  const submitButton = document.getElementById('registerButton');
  
  try {
    // בדיקות תקינות
    
    // בדיקה שהסיסמאות תואמות
    if (password !== confirmPassword) {
      showMessage(messageElement, 'הסיסמאות אינן תואמות', 'error');
      return;
    }
    
    // בדיקה שהסיסמה ארוכה מספיק
    if (password.length < 6) {
      showMessage(messageElement, 'הסיסמה חייבת להכיל לפחות 6 תווים', 'error');
      return;
    }
    
    // בדיקה שהאימייל תקין
    if (!isValidEmail(email)) {
      showMessage(messageElement, 'כתובת האימייל אינה תקינה', 'error');
      return;
    }
    
    // משביתים את הכפתור למניעת לחיצות כפולות
    submitButton.disabled = true;
    submitButton.textContent = 'מבצע הרשמה...';
    
    // שולחים בקשה לשרת
    // חיבור: Client → Server (דרך api.js)
    const response = await registerUser(email, password, dailyCalorieGoal);
    
    // הצלחה!
    showMessage(messageElement, 'נרשמת בהצלחה! מעביר אותך למערכת...', 'success');
    
    // מחכים שנייה ועוברים למסך הראשי
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1000);
    
  } catch (error) {
    // טיפול בשגיאה
    console.error('שגיאה בהרשמה:', error);
    showMessage(messageElement, error.message || 'אירעה שגיאה בהרשמה', 'error');
    
    // מפעילים בחזרה את הכפתור
    submitButton.disabled = false;
    submitButton.textContent = 'הרשמה';
  }
}

/**
 * פונקציה שמטפלת בשליחת טופס התחברות
 * נקראת כאשר המשתמש לוחץ על כפתור "התחבר"
 */
async function handleLoginSubmit(event) {
  // מונעים מהדף לרענן
  event.preventDefault();
  
  // שולפים את הערכים מהשדות
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  
  // אלמנטים ל-UI
  const messageElement = document.getElementById('loginMessage');
  const submitButton = document.getElementById('loginButton');
  
  try {
    // בדיקות תקינות
    
    if (!email || !password) {
      showMessage(messageElement, 'נא למלא את כל השדות', 'error');
      return;
    }
    
    if (!isValidEmail(email)) {
      showMessage(messageElement, 'כתובת האימייל אינה תקינה', 'error');
      return;
    }
    
    // משביתים את הכפתור
    submitButton.disabled = true;
    submitButton.textContent = 'מתחבר...';
    
    // שולחים בקשה לשרת
    // חיבור: Client → Server (דרך api.js)
    const response = await loginUser(email, password);
    
    // הצלחה!
    showMessage(messageElement, 'התחברת בהצלחה! מעביר אותך למערכת...', 'success');
    
    // מחכים שנייה ועוברים למסך הראשי
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1000);
    
  } catch (error) {
    // טיפול בשגיאה
    console.error('שגיאה בהתחברות:', error);
    showMessage(messageElement, error.message || 'אירעה שגיאה בהתחברות', 'error');
    
    // מפעילים בחזרה את הכפתור
    submitButton.disabled = false;
    submitButton.textContent = 'התחבר';
  }
}

/**
 * פונקציה עזר להצגת הודעות למשתמש
 * 
 * @param {HTMLElement} element - האלמנט שבו להציג את ההודעה
 * @param {string} message - טקסט ההודעה
 * @param {string} type - סוג ההודעה ('success' או 'error')
 */
function showMessage(element, message, type) {
  element.textContent = message;
  element.className = `message ${type}`;
  element.style.display = 'block';
  
  // מסתירים את ההודעה אחרי 5 שניות
  setTimeout(() => {
    element.style.display = 'none';
  }, 5000);
}

/**
 * פונקציה עזר לבדיקת תקינות אימייל
 * 
 * @param {string} email - כתובת האימייל לבדיקה
 * @returns {boolean} - האם האימייל תקין
 */
function isValidEmail(email) {
  // ביטוי רגולרי (regex) לבדיקת פורמט אימייל
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}