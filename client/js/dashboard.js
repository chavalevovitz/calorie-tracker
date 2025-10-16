/**
 * קובץ dashboard.js - לוגיקה של המסך הראשי
 * 
 * אחראי על:
 * - טעינת נתוני משתמש
 * - הוספת ארוחות (ידנית ומתמונה)
 * - הצגת רשימת ארוחות
 * - מחיקה ועריכה
 * - היסטוריה
 */

// משתנים גלובליים
let currentUser = null;
let selectedImageFile = null;
let currentCalendarDate = new Date();
let historyData = {};

// ממתינים שהדף ייטען במלואו
document.addEventListener('DOMContentLoaded', function() {
  initializeDashboard();
});

/**
 * פונקציה ראשית שמאתחלת את הדאשבורד
 * רצה כאשר הדף נטען
 */
async function initializeDashboard() {
  try {
    // בודקים אם המשתמש מחובר
    const token = getAuthToken();
    if (!token) {
      // אם לא מחובר - מעבירים להתחברות
      window.location.href = 'login.html';
      return;
    }
    
    // טוענים את נתוני המשתמש
    await loadUserData();
    
    // טוענים את ארוחות היום
    await loadTodayMeals();
    
    // מאתחלים event listeners
    setupEventListeners();
    
  } catch (error) {
    console.error('שגיאה באתחול:', error);
    alert('אירעה שגיאה בטעינת הנתונים. אנא נסה שנית.');
  }
}

/**
 * טעינת נתוני המשתמש המחובר
 * חיבור: Client → Server → Database
 */
async function loadUserData() {
  try {
    const response = await getCurrentUser();
    currentUser = response.user;
    
    // מעדכנים את ה-UI עם פרטי המשתמש
    document.getElementById('userEmail').textContent = currentUser.email;
    document.getElementById('dailyGoal').textContent = currentUser.dailyCalorieGoal;
    document.getElementById('newDailyGoal').value = currentUser.dailyCalorieGoal;
    
  } catch (error) {
    console.error('שגיאה בטעינת נתוני משתמש:', error);
    // אם יש בעיה באימות - מעבירים להתחברות
    window.location.href = 'login.html';
  }
}

/**
 * טעינת ארוחות היום (עם חוק 04:00)
 * חיבור: Client → Server → Database
 */
async function loadTodayMeals() {
  const mealsListElement = document.getElementById('todayMealsList');
  
  try {
    mealsListElement.innerHTML = '<p class="loading">טוען ארוחות...</p>';
    
    // קובעים מה זה "היום" לפי החוק של 04:00
    const now = new Date();
    const currentHour = now.getHours();
    
    // מחשבים את התאריך הלוגי
    let logicalToday = new Date(now);
    if (currentHour >= 0 && currentHour < 4) {
      // בין 00:00-03:59 = "היום" זה למעשה אתמול
      logicalToday.setDate(logicalToday.getDate() - 1);
      console.log('⏰ השעה', currentHour, '- "היום" הלוגי הוא:', logicalToday.toLocaleDateString('he-IL'));
    } else {
      console.log('⏰ השעה', currentHour, '- "היום" הלוגי הוא:', logicalToday.toLocaleDateString('he-IL'));
    }
    
    // מכינים את התאריך בפורמט YYYY-MM-DD
    const year = logicalToday.getFullYear();
    const month = String(logicalToday.getMonth() + 1).padStart(2, '0');
    const day = String(logicalToday.getDate()).padStart(2, '0');
    const logicalTodayStr = `${year}-${month}-${day}`;
    
    // יוצרים endDate שהוא יום אחרי (כי השרת עושה < ולא <=)
    const logicalTomorrow = new Date(logicalToday);
    logicalTomorrow.setDate(logicalTomorrow.getDate() + 1);
    const logicalTomorrowStr = `${logicalTomorrow.getFullYear()}-${String(logicalTomorrow.getMonth() + 1).padStart(2, '0')}-${String(logicalTomorrow.getDate()).padStart(2, '0')}`;
    
    console.log('📅 מחפש ארוחות מ-', logicalTodayStr, 'עד', logicalTomorrowStr);
    
    // מביאים היסטוריה של היום הלוגי
    const response = await getMealsHistory(logicalTodayStr, logicalTomorrowStr);
    
    console.log('🔍 תשובה מהשרת:', response);
    
    let todayMeals = [];
    let totalCalories = 0;
    
    if (response.history && response.history.length > 0) {
      const dayData = response.history[0];
      todayMeals = dayData.meals || [];
      totalCalories = dayData.totalCalories || 0;
      console.log('✅ נמצאו', todayMeals.length, 'ארוחות עם סה"כ', totalCalories, 'קלוריות');
    } else {
      console.log('ℹ️ אין ארוחות עדיין ליום זה');
    }
    
    // מעדכנים את הסיכום
    updateCalorieSummary(totalCalories, currentUser.dailyCalorieGoal);
    
    // מציגים את הארוחות
    displayMealsList(todayMeals, mealsListElement);
    
  } catch (error) {
    console.error('שגיאה בטעינת ארוחות:', error);
    mealsListElement.innerHTML = '<p class="error">שגיאה בטעינת הארוחות</p>';
  }
}

/**
 * עדכון הסיכום היומי
 * 
 * @param {number} totalCalories - סך הקלוריות שנצרכו
 * @param {number} dailyGoal - יעד יומי
 */
function updateCalorieSummary(totalCalories, dailyGoal) {
  const remaining = dailyGoal - totalCalories;
  
  document.getElementById('totalCaloriesToday').textContent = totalCalories;
  document.getElementById('remainingCalories').textContent = remaining;
  
  // עדכון פס התקדמות
  const progressPercent = Math.min((totalCalories / dailyGoal) * 100, 100);
  const progressBar = document.getElementById('progressBar');
  progressBar.style.width = progressPercent + '%';
  
  // שינוי צבע אם עברנו את היעד
  if (totalCalories > dailyGoal) {
    progressBar.style.background = '#e74c3c'; // אדום
  } else {
    progressBar.style.background = '#4caf50'; // ירוק
  }
}

/**
 * הצגת רשימת ארוחות ב-UI
 * 
 * @param {Array} meals - מערך של ארוחות
 * @param {HTMLElement} container - האלמנט שבו להציג
 */
function displayMealsList(meals, container) {
  if (!meals || meals.length === 0) {
    container.innerHTML = '<p>עדיין לא נוספו ארוחות היום</p>';
    return;
  }
  
  // יוצרים HTML לכל ארוחה
  const mealsHTML = meals.map(meal => createMealCardHTML(meal)).join('');
  container.innerHTML = mealsHTML;
  
  // מוסיפים event listeners לכפתורים
  attachMealCardListeners();
}

/**
 * יצירת HTML לכרטיס ארוחה בודדת
 * 
 * @param {Object} meal - אובייקט ארוחה
 * @returns {string} - HTML של הכרטיס
 */
function createMealCardHTML(meal) {
  const date = new Date(meal.dateEaten);
  const timeString = date.toLocaleTimeString('he-IL', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  // קביעת האייקון והטקסט לפי שיטת הזיהוי
  let methodIcon, methodText;
  
  // בודקים אם יש אמוג'י של רובוט בהערות = זוהה ב-AI
  if (meal.notes && meal.notes.includes('🤖')) {
    methodIcon = '🤖';
    methodText = 'זוהה ע"י AI';
  } else if (meal.detectionMethod === 'ai_image') {
    methodIcon = '🤖';
    methodText = 'זוהה ע"י AI';
  } else {
    methodIcon = '✍️';
    methodText = 'הוזן ידנית';
  }
  
  return `
    <div class="meal-card" data-meal-id="${meal._id}">
      <div class="meal-info">
        <h3>${methodIcon} ${meal.mealName}</h3>
        <p>${methodText} • ${timeString}</p>
        ${meal.notes && !meal.notes.includes('🤖') ? `<p><small>${meal.notes}</small></p>` : ''}
        ${meal.confidenceScore ? `<p><small>דירוג ודאות: ${meal.confidenceScore}%</small></p>` : ''}
      </div>
      <div class="meal-calories">
        ${meal.calories}
      </div>
      <div class="meal-actions">
        <button class="btn btn-small edit-meal-btn" data-meal-id="${meal._id}" data-meal-name="${meal.mealName}" data-meal-calories="${meal.calories}" data-meal-notes="${meal.notes || ''}">
          ✏️ ערוך
        </button>
        <button class="btn btn-small btn-danger delete-meal-btn" data-meal-id="${meal._id}">
          🗑️ מחק
        </button>
      </div>
    </div>
  `;
}

/**
 * מוסיף event listeners לכפתורי מחיקה ועריכה של ארוחות
 */
function attachMealCardListeners() {
  // כפתורי מחיקה
  const deleteButtons = document.querySelectorAll('.delete-meal-btn');
  deleteButtons.forEach(button => {
    button.addEventListener('click', handleDeleteMeal);
  });
  
  // כפתורי עריכה
  const editButtons = document.querySelectorAll('.edit-meal-btn');
  editButtons.forEach(button => {
    button.addEventListener('click', handleEditMeal);
  });
}

/**
 * טיפול בעריכת ארוחה - פותח מודאל
 */
function handleEditMeal(event) {
  const button = event.target;
  const mealId = button.getAttribute('data-meal-id');
  const currentName = button.getAttribute('data-meal-name');
  const currentCalories = button.getAttribute('data-meal-calories');
  const currentNotes = button.getAttribute('data-meal-notes');
  
  // ממלאים את הטופס בערכים הנוכחיים
  document.getElementById('editMealId').value = mealId;
  document.getElementById('editMealName').value = currentName;
  document.getElementById('editMealCalories').value = currentCalories;
  document.getElementById('editMealNotes').value = currentNotes || '';
  
  // פותחים את המודאל
  document.getElementById('editMealModal').style.display = 'flex';
}

/**
 * סגירת מודאל עריכת ארוחה
 */
function closeEditMealModal() {
  document.getElementById('editMealModal').style.display = 'none';
}

/**
 * שמירת שינויים בארוחה
 */
async function handleEditMealFormSubmit(event) {
  event.preventDefault();
  
  const mealId = document.getElementById('editMealId').value;
  const mealName = document.getElementById('editMealName').value.trim();
  const calories = parseInt(document.getElementById('editMealCalories').value);
  const notes = document.getElementById('editMealNotes').value.trim();
  
  if (!mealName || !calories) {
    alert('נא למלא את כל השדות הנדרשים');
    return;
  }
  
  try {
    // שולחים בקשת עדכון לשרת
    await updateMeal(mealId, {
      mealName: mealName,
      calories: calories,
      notes: notes
    });
    
    // סוגרים את המודאל
    closeEditMealModal();
    
    // טוענים מחדש את רשימת הארוחות
    await loadTodayMeals();
    
    alert('✅ הארוחה עודכנה בהצלחה!');
    
  } catch (error) {
    console.error('שגיאה בעדכון ארוחה:', error);
    alert('אירעה שגיאה בעדכון הארוחה');
  }
}

/**
 * טיפול במחיקת ארוחה
 */
async function handleDeleteMeal(event) {
  const mealId = event.target.getAttribute('data-meal-id');
  
  // מבקשים אישור מהמשתמש
  if (!confirm('האם אתה בטוח שברצונך למחוק ארוחה זו?')) {
    return;
  }
  
  try {
    // שולחים בקשת מחיקה לשרת
    // חיבור: Client → Server → Database
    await deleteMeal(mealId);
    
    // טוענים מחדש את רשימת הארוחות
    await loadTodayMeals();
    
  } catch (error) {
    console.error('שגיאה במחיקת ארוחה:', error);
    alert('אירעה שגיאה במחיקת הארוחה');
  }
}

/**
 * הגדרת כל ה-Event Listeners של הדף
 */
function setupEventListeners() {
  // ============================================
  // כפתור יציאה
  // ============================================
  
  const logoutButton = document.getElementById('logoutButton');
  if (logoutButton) {
    logoutButton.addEventListener('click', function() {
      if (confirm('האם אתה בטוח שברצונך להתנתק?')) {
        logoutUser();
      }
    });
  }
  
  // ============================================
  // טאבים (בחירה בין תמונה להזנה ידנית)
  // ============================================
  
  const tabButtons = document.querySelectorAll('.tab-button');
  tabButtons.forEach(button => {
    button.addEventListener('click', function() {
      const tabName = this.getAttribute('data-tab');
      switchTab(tabName);
    });
  });
  
  // ============================================
  // העלאת תמונה מהמצלמה
  // ============================================
  
  const cameraInput = document.getElementById('cameraInput');
  if (cameraInput) {
    cameraInput.addEventListener('change', handleImageSelected);
  }
  
  // ============================================
  // העלאת תמונה מהמחשב
  // ============================================
  
  const imageInput = document.getElementById('imageInput');
  if (imageInput) {
    imageInput.addEventListener('change', handleImageSelected);
  }
  
  // ============================================
  // כפתור ניתוח תמונה
  // ============================================
  
  const analyzeButton = document.getElementById('analyzeButton');
  if (analyzeButton) {
    analyzeButton.addEventListener('click', handleAnalyzeImage);
  }
  
  // ============================================
  // טופס עריכת תוצאות AI
  // ============================================
  
  const editAnalysisForm = document.getElementById('editAnalysisForm');
  if (editAnalysisForm) {
    editAnalysisForm.addEventListener('submit', handleSaveAnalyzedMeal);
  }
  
  // ============================================
  // כפתור ביטול זיהוי
  // ============================================
  
  const cancelAnalysisButton = document.getElementById('cancelAnalysisButton');
  if (cancelAnalysisButton) {
    cancelAnalysisButton.addEventListener('click', cancelAnalysis);
  }
  
  // ============================================
  // טופס הוספת ארוחה ידנית
  // ============================================
  
  const manualMealForm = document.getElementById('manualMealForm');
  if (manualMealForm) {
    manualMealForm.addEventListener('submit', handleManualMealSubmit);
  }
  
  // ============================================
  // כפתור עדכון יעד
  // ============================================
  
  const updateGoalButton = document.getElementById('updateGoalButton');
  if (updateGoalButton) {
    updateGoalButton.addEventListener('click', openUpdateGoalModal);
  }
  
  // ============================================
  // טופס עדכון יעד
  // ============================================
  
  const updateGoalForm = document.getElementById('updateGoalForm');
  if (updateGoalForm) {
    updateGoalForm.addEventListener('submit', handleUpdateGoalSubmit);
  }
  
  // ============================================
  // סגירת מודאל עדכון יעד
  // ============================================
  
  const closeModalButton = document.querySelector('.close-modal');
  if (closeModalButton) {
    closeModalButton.addEventListener('click', closeUpdateGoalModal);
  }
  
  // ============================================
  // טופס עריכת ארוחה
  // ============================================
  
  const editMealForm = document.getElementById('editMealForm');
  if (editMealForm) {
    editMealForm.addEventListener('submit', handleEditMealFormSubmit);
  }
  
  // ============================================
  // סגירת מודאל עריכת ארוחה
  // ============================================
  
  const closeEditModalButtons = document.querySelectorAll('.close-edit-modal');
  closeEditModalButtons.forEach(btn => {
    btn.addEventListener('click', closeEditMealModal);
  });
  
  // ============================================
  // כפתור היסטוריה
  // ============================================
  
  const viewHistoryButton = document.getElementById('viewHistoryButton');
  if (viewHistoryButton) {
    viewHistoryButton.addEventListener('click', toggleHistoryView);
  }
  
  // ============================================
  // ניווט בלוח שנה
  // ============================================
  
  const prevMonthBtn = document.getElementById('prevMonthBtn');
  if (prevMonthBtn) {
    prevMonthBtn.addEventListener('click', () => {
      currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
      renderCalendar();
    });
  }
  
  const nextMonthBtn = document.getElementById('nextMonthBtn');
  if (nextMonthBtn) {
    nextMonthBtn.addEventListener('click', () => {
      currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
      renderCalendar();
    });
  }
  
  // ============================================
  // סגירת פירוט יום
  // ============================================
  
  const closeDayDetailsBtn = document.getElementById('closeDayDetailsBtn');
  if (closeDayDetailsBtn) {
    closeDayDetailsBtn.addEventListener('click', () => {
      document.getElementById('selectedDayDetails').style.display = 'none';
    });
  }
}

/**
 * מעבר בין טאבים
 * 
 * @param {string} tabName - שם הטאב ('camera' או 'manual')
 */
function switchTab(tabName) {
  // מסירים את המחלקה active מכל הטאבים
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  
  // מוסיפים את המחלקה active לטאב הנבחר
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  document.getElementById(`${tabName}Tab`).classList.add('active');
}

/**
 * טיפול בבחירת תמונה
 * מציג תצוגה מקדימה של התמונה
 */
function handleImageSelected(event) {
  const file = event.target.files[0];
  
  if (!file) {
    return;
  }
  
  // בדיקה שזה באמת קובץ תמונה
  if (!file.type.startsWith('image/')) {
    alert('אנא בחר קובץ תמונה');
    return;
  }
  
  // שומרים את הקובץ למשתנה גלובלי
  selectedImageFile = file;
  
  // מציגים תצוגה מקדימה
  const reader = new FileReader();
  reader.onload = function(e) {
    const previewImage = document.getElementById('previewImage');
    previewImage.src = e.target.result;
    
    document.getElementById('imagePreview').style.display = 'block';
    document.getElementById('analysisResult').style.display = 'none';
  };
  reader.readAsDataURL(file);
}

/**
 * ניתוח התמונה - רק זיהוי בלי שמירה
 * חיבור: Client → Server → AI API
 */
async function handleAnalyzeImage() {
  if (!selectedImageFile) {
    alert('לא נבחרה תמונה');
    return;
  }
  
  const analyzeButton = document.getElementById('analyzeButton');
  const resultElement = document.getElementById('analysisResult');
  
  try {
    // משביתים את הכפתור
    analyzeButton.disabled = true;
    analyzeButton.textContent = '🔍 מזהה...';
    
    // שולחים את התמונה לשרת - רק לזיהוי
    // החיבור: Client → Server → AI API (בלי Database)
    const response = await identifyFoodInImage(selectedImageFile);
    
    // מציגים את התוצאות בטופס עריכה
    document.getElementById('aiMealName').value = response.analysis.foodName;
    document.getElementById('aiCalories').value = response.analysis.calories;
    document.getElementById('confidenceText').textContent = `רמת ודאות: ${response.analysis.confidence}%`;
    
    // מסתירים את הכפתור "זהה" ומציגים את הטופס
    document.getElementById('imagePreview').style.display = 'none';
    resultElement.style.display = 'block';
    
  } catch (error) {
    console.error('שגיאה בניתוח תמונה:', error);
    alert('❌ ' + error.message);
  } finally {
    // מפעילים בחזרה את הכפתור
    analyzeButton.disabled = false;
    analyzeButton.textContent = '🔍 זהה';
  }
}

/**
 * שמירת הארוחה המזוהה אחרי עריכה
 */
async function handleSaveAnalyzedMeal(event) {
  event.preventDefault();
  
  const mealName = document.getElementById('aiMealName').value.trim();
  const calories = parseInt(document.getElementById('aiCalories').value);
  
  if (!mealName || !calories) {
    alert('נא למלא את כל השדות');
    return;
  }
  
  try {
    // מחשבים את התאריך הנכון (עם החוק של 04:00)
    const now = new Date();
    const currentHour = now.getHours();
    
    let dateToSave = new Date(now);
    if (currentHour >= 0 && currentHour < 4) {
      dateToSave.setDate(dateToSave.getDate() - 1);
      console.log('⏰ AI: השעה היא', currentHour, '- נספור ליום', dateToSave.toLocaleDateString('he-IL'));
    }
    
    // שולחים רק תאריך (בלי שעה מדויקת)
    const dateString = dateToSave.getFullYear() + '-' + 
                       String(dateToSave.getMonth() + 1).padStart(2, '0') + '-' + 
                       String(dateToSave.getDate()).padStart(2, '0') + 'T12:00:00.000Z';
    
    console.log('📅 AI: שולח תאריך:', dateString);
    
    // שומרים את הארוחה עם סימון שזה מ-AI
    // נשתמש בהערות כדי לסמן את זה
    await addManualMeal(mealName, calories, '🤖 זוהה באמצעות AI', dateString);
    
    console.log('✅ AI: הארוחה נשמרה, טוען מחדש...');
    
    // מנקים הכל
    cancelAnalysis();
    
    // ממתינים רגע קצר
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // טוענים מחדש את רשימת הארוחות
    await loadTodayMeals();
    
    alert('✅ הארוחה נשמרה בהצלחה!');
    
  } catch (error) {
    console.error('שגיאה בשמירת ארוחה:', error);
    alert('❌ ' + error.message);
  }
}

/**
 * ביטול זיהוי ואיפוס הטופס
 */
function cancelAnalysis() {
  selectedImageFile = null;
  document.getElementById('cameraInput').value = '';
  document.getElementById('imageInput').value = '';
  document.getElementById('imagePreview').style.display = 'none';
  document.getElementById('analysisResult').style.display = 'none';
}

/**
 * טיפול בהוספת ארוחה ידנית
 * חיבור: Client → Server → Database
 */
async function handleManualMealSubmit(event) {
  event.preventDefault();
  
  // שולפים את הערכים מהטופס
  const mealName = document.getElementById('mealName').value.trim();
  const calories = parseInt(document.getElementById('calories').value);
  const notes = document.getElementById('notes').value.trim();
  
  if (!mealName || !calories) {
    alert('נא למלא את כל השדות הנדרשים');
    return;
  }
  
  try {
    // מחשבים את התאריך הנכון:
    // אם השעה בין 00:00-03:59 - נספור את זה ליום הקודם
    const now = new Date();
    const currentHour = now.getHours();
    
    let dateToSave = new Date(now);
    if (currentHour >= 0 && currentHour < 4) {
      // שעות 00:00-03:59 = נחסיר יום אחד
      dateToSave.setDate(dateToSave.getDate() - 1);
      console.log('⏰ השעה היא', currentHour, '- נספור את זה ליום', dateToSave.toLocaleDateString('he-IL'));
    } else {
      // שעה 04:00 ואילך = היום
      console.log('⏰ השעה היא', currentHour, '- נספור את זה להיום', dateToSave.toLocaleDateString('he-IL'));
    }
    
    // שולחים רק תאריך בפורמט ISO (בלי שעה!) כדי למנוע בעיות אזור זמן
    const dateString = dateToSave.getFullYear() + '-' + 
                       String(dateToSave.getMonth() + 1).padStart(2, '0') + '-' + 
                       String(dateToSave.getDate()).padStart(2, '0') + 'T12:00:00.000Z';
    
    console.log('📅 שולח תאריך:', dateString);
    
    // שולחים לשרת עם התאריך המדויק
    await addManualMeal(mealName, calories, notes, dateString);
    
    console.log('✅ הארוחה נשמרה בהצלחה, כעת טוען מחדש...');
    
    // מנקים את הטופס
    document.getElementById('manualMealForm').reset();
    
    // ממתינים רגע קצר כדי לוודא שהשרת סיים לשמור
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // טוענים מחדש את רשימת הארוחות
    await loadTodayMeals();
    
    alert('✅ הארוחה נוספה בהצלחה!');
    
  } catch (error) {
    console.error('שגיאה בהוספת ארוחה:', error);
    alert('❌ ' + error.message);
  }
}

/**
 * פתיחת מודאל עדכון יעד
 */
function openUpdateGoalModal() {
  document.getElementById('updateGoalModal').style.display = 'flex';
}

/**
 * סגירת מודאל עדכון יעד
 */
function closeUpdateGoalModal() {
  document.getElementById('updateGoalModal').style.display = 'none';
}

/**
 * טיפול בעדכון יעד קלורי
 * חיבור: Client → Server → Database
 */
async function handleUpdateGoalSubmit(event) {
  event.preventDefault();
  
  const newGoal = parseInt(document.getElementById('newDailyGoal').value);
  
  if (!newGoal || newGoal < 500 || newGoal > 10000) {
    alert('נא להזין יעד בין 500 ל-10000');
    return;
  }
  
  try {
    // שולחים לשרת
    await updateDailyGoal(newGoal);
    
    // מעדכנים ב-UI
    currentUser.dailyCalorieGoal = newGoal;
    document.getElementById('dailyGoal').textContent = newGoal;
    
    // סוגרים את המודאל
    closeUpdateGoalModal();
    
    // מעדכנים רק את הסיכום בלי לטעון מחדש הכל
    const totalCaloriesElement = document.getElementById('totalCaloriesToday');
    const totalCalories = parseInt(totalCaloriesElement.textContent) || 0;
    updateCalorieSummary(totalCalories, newGoal);
    
    alert('✅ היעד עודכן בהצלחה!');
    
  } catch (error) {
    console.error('שגיאה בעדכון יעד:', error);
    alert('❌ ' + error.message);
  }
}

/**
 * הצגה/הסתרה של תצוגת היסטוריה
 */
function toggleHistoryView() {
  const historyContent = document.getElementById('historyContent');
  const button = document.getElementById('viewHistoryButton');
  
  if (historyContent.style.display === 'none' || !historyContent.style.display) {
    historyContent.style.display = 'block';
    button.textContent = '📅 הסתר היסטוריה';
    
    // טוענים את הנתונים
    loadHistoryData();
  } else {
    historyContent.style.display = 'none';
    button.textContent = '📅 צפה בהיסטוריה';
    document.getElementById('selectedDayDetails').style.display = 'none';
  }
}

/**
 * טעינת נתוני היסטוריה של 90 יום אחורה (כולל היום!)
 */
async function loadHistoryData() {
  try {
    // מחשבים 90 יום אחורה
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 1); // מוסיפים יום אחד כדי לכלול את היום
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    console.log('📅 מבקש היסטוריה מ-', startDateStr, 'עד', endDateStr);
    
    const response = await getMealsHistory(startDateStr, endDateStr);
    
    console.log('🔍 תשובה מהשרת:', response);
    console.log('📦 response.history:', response.history);
    
    // מארגנים את הנתונים לפי תאריך
    historyData = {};
    if (response.history && response.history.length > 0) {
      console.log('✅ יש', response.history.length, 'ימים בהיסטוריה');
      
      response.history.forEach(day => {
        console.log('📅 מעבד יום:', day);
        // וידוא שהתאריך בפורמט נכון YYYY-MM-DD
        const dateKey = day.date;
        historyData[dateKey] = {
          date: dateKey,
          meals: day.meals || [],
          totalCalories: day.totalCalories || 0
        };
      });
    } else {
      console.log('⚠️ אין היסטוריה או המערך ריק');
      console.log('💡 טיפ: נסי להוסיף ארוחות ולבדוק שוב!');
    }
    
    console.log('📊 נתוני היסטוריה נטענו:', historyData);
    console.log('🔢 כמות ימים:', Object.keys(historyData).length);
    
    // איפוס תאריך הלוח שנה לחודש הנוכחי
    currentCalendarDate = new Date();
    
    // מציגים את הלוח שנה
    renderCalendar();
    
  } catch (error) {
    console.error('שגיאה בטעינת היסטוריה:', error);
    alert('אירעה שגיאה בטעינת ההיסטוריה');
  }
}

/**
 * רינדור לוח השנה
 */
function renderCalendar() {
  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();
  
  // עדכון כותרת
  const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 
                      'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  document.getElementById('currentMonthYear').textContent = `${monthNames[month]} ${year}`;
  
  // בניית הלוח
  const calendarGrid = document.getElementById('calendarGrid');
  calendarGrid.innerHTML = '';
  
  // כותרות ימים
  const dayHeaders = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
  dayHeaders.forEach(day => {
    const header = document.createElement('div');
    header.className = 'calendar-day-header';
    header.textContent = day;
    calendarGrid.appendChild(header);
  });
  
  // יום ראשון של החודש
  const firstDay = new Date(year, month, 1);
  const firstDayOfWeek = firstDay.getDay(); // 0 = ראשון
  
  // יום אחרון של החודש
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  
  // ימים מהחודש הקודם
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const dayElement = createCalendarDay(prevMonthLastDay - i, month - 1, year, true);
    calendarGrid.appendChild(dayElement);
  }
  
  // ימי החודש הנוכחי
  for (let day = 1; day <= daysInMonth; day++) {
    const dayElement = createCalendarDay(day, month, year, false);
    calendarGrid.appendChild(dayElement);
  }
  
  // ימים מהחודש הבא
  const remainingCells = 42 - (firstDayOfWeek + daysInMonth);
  for (let day = 1; day <= remainingCells; day++) {
    const dayElement = createCalendarDay(day, month + 1, year, true);
    calendarGrid.appendChild(dayElement);
  }
}

/**
 * יצירת תא יום בלוח השנה
 */
function createCalendarDay(day, month, year, isOtherMonth) {
  const dayElement = document.createElement('div');
  dayElement.className = 'calendar-day';
  
  if (isOtherMonth) {
    dayElement.classList.add('other-month');
  }
  
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const today = new Date().toISOString().split('T')[0];
  
  console.log('🗓️ יוצר תא ליום:', dateStr, 'האם יש נתונים?', !!historyData[dateStr]);
  
  // בדיקה אם זה היום
  if (dateStr === today && !isOtherMonth) {
    dayElement.classList.add('today');
  }
  
  // בדיקה אם יש ארוחות ביום הזה
  const dayData = historyData[dateStr];
  if (dayData && dayData.meals && dayData.meals.length > 0 && !isOtherMonth) {
    dayElement.classList.add('has-meals');
    console.log('✅ יום', dateStr, 'יש בו', dayData.meals.length, 'ארוחות');
  }
  
  // תוכן היום
  const dayNumber = document.createElement('div');
  dayNumber.className = 'calendar-day-number';
  dayNumber.textContent = day;
  dayElement.appendChild(dayNumber);
  
  // לא מציגים קלוריות - רק צבע של הריבוע יראה שיש ארוחות
  
  // לחיצה על היום
  if (!isOtherMonth) {
    dayElement.addEventListener('click', () => {
      console.log('👆 לחיצה על יום:', dateStr);
      showDayDetails(dateStr);
    });
  }
  
  return dayElement;
}

/**
 * הצגת פירוט יום
 */
function showDayDetails(dateStr) {
  console.log('🔍 מנסה להציג פירוט ליום:', dateStr);
  console.log('📊 נתונים זמינים:', historyData[dateStr]);
  
  const dayData = historyData[dateStr];
  
  if (!dayData) {
    console.log('❌ אין נתונים ליום הזה');
    alert('אין ארוחות ביום זה');
    return;
  }
  
  if (!dayData.meals || dayData.meals.length === 0) {
    console.log('❌ אין ארוחות ביום הזה');
    alert('אין ארוחות ביום זה');
    return;
  }
  
  console.log('✅ מצאנו', dayData.meals.length, 'ארוחות');
  
  // עדכון כותרת
  const date = new Date(dateStr + 'T12:00:00');
  const dateString = date.toLocaleDateString('he-IL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  document.getElementById('selectedDayTitle').textContent = dateString;
  
  // הצגת ארוחות
  const mealsContainer = document.getElementById('selectedDayMeals');
  const mealsHTML = dayData.meals.map(meal => {
    // קביעת האייקון והטקסט לפי שיטת הזיהוי
    let methodIcon, methodText;
    
    // בודקים אם יש אמוג'י של רובוט בהערות = זוהה ב-AI
    if (meal.notes && meal.notes.includes('🤖')) {
      methodIcon = '🤖';
      methodText = 'זוהה ע"י AI';
    } else if (meal.detectionMethod === 'ai_image') {
      methodIcon = '🤖';
      methodText = 'זוהה ע"י AI';
    } else {
      methodIcon = '✍️';
      methodText = 'הוזן ידנית';
    }
    
    return `
      <div class="day-meal-item">
        <div class="day-meal-info">
          <h4>${meal.mealName}</h4>
          <p>${methodIcon} ${methodText}</p>
        </div>
        <div class="day-meal-calories">
          ${meal.calories} קלוריות
        </div>
      </div>
    `;
  }).join('');
  
  mealsContainer.innerHTML = mealsHTML + `
    <div class="day-total">
      סה"כ ליום: ${dayData.totalCalories} קלוריות
    </div>
  `;
  
  // הצגת הפירוט
  document.getElementById('selectedDayDetails').style.display = 'block';
  
  // גלילה לפירוט
  document.getElementById('selectedDayDetails').scrollIntoView({ behavior: 'smooth' });
}

/**
 * טעינת היסטוריית ארוחות - גרסה ישנה (מוסתרת)
 * הפונקציה הזו לא בשימוש יותר - השארנו אותה למקרה שתרצי לחזור
 */
async function loadHistoryOld(startDate = null, endDate = null) {
  // פונקציה ישנה - לא בשימוש
  console.log('פונקציה ישנה - לא בשימוש');
}

/**
 * סינון היסטוריה לפי טווח תאריכים - גרסה ישנה (מוסתרת)
 */
function handleFilterHistoryOld() {
  // פונקציה ישנה - לא בשימוש
  console.log('פונקציה ישנה - לא בשימוש');
}