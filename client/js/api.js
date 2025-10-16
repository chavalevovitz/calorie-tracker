/**
 * קובץ API - כל החיבורים בין Client ל-Server
 * 
 * זה הקובץ שאחראי על כל התקשורת:
 * Client ← → Server ← → Database
 * Client ← → Server ← → AI API
 */

// כתובת השרת - שני את זה אם השרת רץ על פורט אחר
const API_BASE_URL = 'http://localhost:5000/api';

/**
 * פונקציה עזר לקבלת הטוכן מה-localStorage
 * הטוכן זה מה שמזהה את המשתמש המחובר
 */
function getAuthToken() {
  return localStorage.getItem('authToken');
}

/**
 * פונקציה עזר לשמירת הטוכן ב-localStorage
 */
function saveAuthToken(token) {
  localStorage.setItem('authToken', token);
}

/**
 * פונקציה עזר למחיקת הטוכן (התנתקות)
 */
function removeAuthToken() {
  localStorage.removeItem('authToken');
}

/**
 * פונקציה עזר לשמירת פרטי משתמש
 */
function saveUserData(user) {
  localStorage.setItem('userData', JSON.stringify(user));
}

/**
 * פונקציה עזר לקבלת פרטי משתמש
 */
function getUserData() {
  const userData = localStorage.getItem('userData');
  return userData ? JSON.parse(userData) : null;
}

/**
 * פונקציה עזר למחיקת כל הנתונים (יציאה)
 */
function clearAllData() {
  localStorage.clear();
}

/**
 * פונקציה עזר לביצוע בקשות HTTP עם טיפול בשגיאות
 * 
 * @param {string} url - הכתובת המלאה לבקשה
 * @param {object} options - אפשרויות הבקשה (method, headers, body)
 * @returns {Promise} - התשובה מהשרת
 */
async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    // אם השרת החזיר שגיאה
    if (!response.ok) {
      throw new Error(data.message || 'שגיאה בתקשורת עם השרת');
    }
    
    return data;
  } catch (error) {
    console.error('שגיאה בבקשה:', error);
    throw error;
  }
}

// ============================================
// פונקציות אימות (Authentication)
// חיבור: Client → Server → Database
// ============================================

/**
 * הרשמה למערכת
 * POST /api/auth/register
 * 
 * @param {string} email - אימייל
 * @param {string} password - סיסמה
 * @param {number} dailyCalorieGoal - יעד קלורי יומי
 */
async function registerUser(email, password, dailyCalorieGoal = 2000) {
  const url = `${API_BASE_URL}/auth/register`;
  
  const data = await makeRequest(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password, dailyCalorieGoal })
  });
  
  // שומרים את הטוכן ופרטי המשתמש
  if (data.token) {
    saveAuthToken(data.token);
    saveUserData(data.user);
  }
  
  return data;
}

/**
 * התחברות למערכת
 * POST /api/auth/login
 * 
 * @param {string} email - אימייל
 * @param {string} password - סיסמה
 */
async function loginUser(email, password) {
  const url = `${API_BASE_URL}/auth/login`;
  
  const data = await makeRequest(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });
  
  // שומרים את הטוכן ופרטי המשתמש
  if (data.token) {
    saveAuthToken(data.token);
    saveUserData(data.user);
  }
  
  return data;
}

/**
 * קבלת פרטי המשתמש המחובר
 * GET /api/auth/me
 * 
 * דורש אימות - שולח את הטוכן בכותרת
 */
async function getCurrentUser() {
  const url = `${API_BASE_URL}/auth/me`;
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('לא מחובר למערכת');
  }
  
  const data = await makeRequest(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  // מעדכנים את הנתונים השמורים
  if (data.user) {
    saveUserData(data.user);
  }
  
  return data;
}

/**
 * עדכון יעד קלורי יומי
 * PUT /api/auth/update-goal
 * 
 * @param {number} dailyCalorieGoal - יעד חדש
 */
async function updateDailyGoal(dailyCalorieGoal) {
  const url = `${API_BASE_URL}/auth/update-goal`;
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('לא מחובר למערכת');
  }
  
  const data = await makeRequest(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ dailyCalorieGoal })
  });
  
  // מעדכנים את הנתונים השמורים
  const userData = getUserData();
  if (userData) {
    userData.dailyCalorieGoal = dailyCalorieGoal;
    saveUserData(userData);
  }
  
  return data;
}

/**
 * יציאה מהמערכת
 * מוחק את כל הנתונים השמורים
 */
function logoutUser() {
  clearAllData();
  window.location.href = 'index.html';
}

// ============================================
// פונקציות ניהול ארוחות (Meals)
// חיבור: Client → Server → Database
// ============================================

/**
 * הוספת ארוחה באופן ידני
 * POST /api/meals/manual
 * 
 * @param {string} mealName - שם הארוחה
 * @param {number} calories - קלוריות
 * @param {string} notes - הערות (אופציונלי)
 * @param {Date} dateEaten - תאריך (אופציונלי)
 */
async function addManualMeal(mealName, calories, notes = '', dateEaten = null) {
  const url = `${API_BASE_URL}/meals/manual`;
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('לא מחובר למערכת');
  }
  
  return await makeRequest(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ mealName, calories, notes, dateEaten })
  });
}

/**
 * קבלת כל ארוחות היום
 * GET /api/meals/today
 */
async function getTodayMeals() {
  const url = `${API_BASE_URL}/meals/today`;
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('לא מחובר למערכת');
  }
  
  return await makeRequest(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
}

/**
 * קבלת היסטוריית ארוחות
 * GET /api/meals/history?startDate=...&endDate=...
 * 
 * @param {string} startDate - תאריך התחלה (YYYY-MM-DD)
 * @param {string} endDate - תאריך סיום (YYYY-MM-DD)
 */
async function getMealsHistory(startDate = null, endDate = null) {
  let url = `${API_BASE_URL}/meals/history`;
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('לא מחובר למערכת');
  }
  
  // אם צוינו תאריכים, מוסיפים אותם ל-URL
  if (startDate && endDate) {
    url += `?startDate=${startDate}&endDate=${endDate}`;
  }
  
  return await makeRequest(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
}

/**
 * מחיקת ארוחה
 * DELETE /api/meals/:mealId
 * 
 * @param {string} mealId - מזהה הארוחה
 */
async function deleteMeal(mealId) {
  const url = `${API_BASE_URL}/meals/${mealId}`;
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('לא מחובר למערכת');
  }
  
  return await makeRequest(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
}

/**
 * עדכון ארוחה
 * PUT /api/meals/:mealId
 * 
 * @param {string} mealId - מזהה הארוחה
 * @param {object} updates - השינויים (mealName, calories, notes)
 */
async function updateMeal(mealId, updates) {
  const url = `${API_BASE_URL}/meals/${mealId}`;
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('לא מחובר למערכת');
  }
  
  return await makeRequest(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  });
}

// ============================================
// פונקציות AI (זיהוי תמונות)
// חיבור: Client → Server → AI API → Database
// ============================================

/**
 * ניתוח תמונה וזיהוי מזון + שמירה כארוחה
 * POST /api/ai/analyze-image
 * 
 * @param {File} imageFile - קובץ תמונה
 */
async function analyzeAndSaveFoodImage(imageFile) {
  const url = `${API_BASE_URL}/ai/analyze-image`;
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('לא מחובר למערכת');
  }
  
  // יוצרים FormData כי אנחנו שולחים קובץ
  const formData = new FormData();
  formData.append('foodImage', imageFile);
  
  return await makeRequest(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
      // לא מוסיפים Content-Type - הדפדפן עושה את זה אוטומטית ל-FormData
    },
    body: formData
  });
}

/**
 * זיהוי מזון בתמונה בלבד (בלי לשמור)
 * POST /api/ai/identify-only
 * 
 * @param {File} imageFile - קובץ תמונה
 */
async function identifyFoodInImage(imageFile) {
  const url = `${API_BASE_URL}/ai/identify-only`;
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('לא מחובר למערכת');
  }
  
  const formData = new FormData();
  formData.append('foodImage', imageFile);
  
  return await makeRequest(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
}

// ============================================
// בדיקת חיבור
// ============================================

/**
 * בדיקה שהשרת עובד
 * GET /api/health
 */
async function checkServerHealth() {
  const url = `${API_BASE_URL}/health`;
  
  return await makeRequest(url, {
    method: 'GET'
  });
}