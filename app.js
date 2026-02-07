// Note Logic Migration
function migrateNotes(oldNotes) {
    if (!oldNotes) return [];
    try {
        const parsed = JSON.parse(oldNotes);
        if (Array.isArray(parsed)) return parsed;
        return [];
    } catch (e) {
        if (typeof oldNotes === 'string' && oldNotes.trim() !== '') {
            return [{
                id: Date.now(),
                title: 'Nota Importada',
                content: oldNotes,
                date: new Date().toLocaleDateString()
            }];
        }
        return [];
    }
}

// State Management
const appState = {
    currentDate: new Date(),
    events: JSON.parse(localStorage.getItem('agenda_events')) || [],
    view: 'dashboard', // 'dashboard' | 'weekly'
    notes: migrateNotes(localStorage.getItem('focus_notes')),
    habits: JSON.parse(localStorage.getItem('agenda_habits')) || [
        { id: 1, name: 'Beber 2L de agua', completedDates: [] },
        { id: 2, name: 'Estudiar 1h', completedDates: [] },
        { id: 3, name: 'Leer 20 mins', completedDates: [] }
    ],
    pomodoro: {
        timeLeft: 25 * 60,
        isActive: false,
        type: 'focus', // 'focus' | 'break'
        interval: null
    },
    recipes: JSON.parse(localStorage.getItem('agenda_recipes')) || [],
    recipeSearchQuery: '',
    // Analytics Logs
    weightLog: JSON.parse(localStorage.getItem('agenda_weight_log')) || [],
    hormoneLog: JSON.parse(localStorage.getItem('agenda_hormone_log')) || [],
    cycleLog: JSON.parse(localStorage.getItem('agenda_cycle_log')) || [],
    expenses: JSON.parse(localStorage.getItem('agenda_expenses')) || [],
    expenseCategories: JSON.parse(localStorage.getItem('agenda_expense_categories')) || [
        { name: 'Comida', emoji: '🛒', color: '#48bb78' },
        { name: 'Transporte', emoji: '🚗', color: '#4299e1' },
        { name: 'Salud', emoji: '🏥', color: '#ed8936' },
        { name: 'Ocio', emoji: '🎉', color: '#9f7aea' },
        { name: 'Suscripciones', emoji: '📺', color: '#f6ad55' },
        { name: 'Hogar', emoji: '🏠', color: '#4a5568' },
        { name: 'Otros', emoji: '📦', color: '#a0aec0' }
    ]
};

// Recipe Modal Session State
let currentRecipeIngredients = [];
let currentRecipeSteps = [];
let currentRecipeImage = '';

// DOM Elements
const elements = {
    views: {
        dashboard: document.getElementById('dashboard-view'),
        weekly: document.getElementById('weekly-view'),
        expenses: document.getElementById('expenses-view'),
        sop: document.getElementById('sop-view')
    },
    navButtons: document.querySelectorAll('.nav-btn'),
    // Dashboard Specific
    calendarGrid: document.getElementById('calendar-grid'),
    currentMonthLabel: document.getElementById('current-month-label'),
    notesList: document.getElementById('notes-list-container'),
    addNoteBtn: document.getElementById('add-note-btn'),
    // Removed legacy sopBtn reference since it's now a nav tab
    habitModal: document.getElementById('habit-modal'),
    // Pomodoro
    pomodoro: {
        timer: document.getElementById('pomodoro-timer'),
        label: document.getElementById('pomodoro-label'),
        start: document.getElementById('pomodoro-start'),
        pause: document.getElementById('pomodoro-pause'),
        reset: document.getElementById('pomodoro-reset'),
        container: document.getElementById('pomodoro-container')
    },
    // Weekly Specific
    weekGrid: document.getElementById('week-grid'),
    currentWeekLabel: document.getElementById('current-week-label'),
    habitsTable: document.getElementById('habits-table-container'),
    manageHabitsBtn: document.getElementById('manage-habits-btn'),
    addTaskBtn: document.getElementById('add-task-btn'),
    // Nav Controls
    navControls: {
        prevWeek: document.getElementById('prev-week'),
        nextWeek: document.getElementById('next-week'),
        prevMonth: document.getElementById('prev-month'),
        nextMonth: document.getElementById('next-month')
    },
    // Modal
    modal: {
        overlay: document.getElementById('event-modal'),
        form: document.getElementById('event-form'),
        closeBtn: document.querySelector('.close-modal'),
        addBtn: document.getElementById('add-event-btn'),
        // Habit Modal
        habitOverlay: document.getElementById('habit-modal'),
        habitForm: document.getElementById('habit-form'),
        habitCloseBtn: document.querySelector('.close-habit-modal'),
        habitList: document.getElementById('habits-manage-list'),
        // Category Modal
        categoryOverlay: document.getElementById('category-modal'),
        categoryCloseBtn: document.getElementById('close-category-modal'),
        categoryList: document.getElementById('category-list'),
        // Expense Edit Modal
        expenseEditOverlay: document.getElementById('expense-edit-modal'),
        expenseEditCloseBtn: document.getElementById('close-expense-edit-modal'),
        expenseEditForm: document.getElementById('expense-edit-form'),
        // Note Modal
        noteOverlay: document.getElementById('note-modal'),
        noteForm: document.getElementById('note-form'),
        noteCloseBtn: document.querySelector('.close-note-modal'),
        // Recipe Modal
        recipeOverlay: document.getElementById('recipe-modal'),
        recipeForm: document.getElementById('recipe-form'),
        recipeCloseBtn: document.querySelector('.close-recipe-modal')
    },
    recipesList: document.getElementById('recetas-container'),
    addRecipeBtn: document.getElementById('add-recipe-btn')
};

// Utils
const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
};

const formatDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const saveEvents = () => {
    localStorage.setItem('agenda_events', JSON.stringify(appState.events));
};

const saveHabits = () => {
    localStorage.setItem('agenda_habits', JSON.stringify(appState.habits));
};

// Initialization
function getContrastColor(hexColor) {
    if (!hexColor) return '#1a202c';
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#1a202c' : 'white';
}

function init() {
    console.log("FocusHub v2.1: Gastos & SOP Visual Fix Initialized");
    setupEventListeners();
    updateCategorySelects(); // Initial load for expense select

    // Initial render
    render();
}

// Event Listeners
function setupEventListeners() {
    // Navigation Tabs
    elements.navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const view = e.currentTarget.dataset.view;
            switchView(view);
        });
    });

    // Note Controls
    if (elements.addNoteBtn) {
        elements.addNoteBtn.addEventListener('click', () => openNoteModal());
    }
    if (elements.modal.noteCloseBtn) {
        elements.modal.noteCloseBtn.addEventListener('click', () => toggleNoteModal(false));
    }
    if (elements.modal.noteForm) {
        elements.modal.noteForm.addEventListener('submit', handleNoteSubmit);
    }
    const deleteNoteBtn = document.getElementById('delete-note-btn');
    if (deleteNoteBtn) {
        deleteNoteBtn.addEventListener('click', () => {
            const id = document.getElementById('note-id').value;
            if (id && confirm('¿Borrar esta idea permanentemente?')) {
                appState.notes = appState.notes.filter(n => n.id != id);
                saveNotes();
                toggleNoteModal(false);
                render();
            }
        });
    }



    // Time Navigation
    elements.navControls.prevWeek.addEventListener('click', () => changeTime(-7, 'days'));
    elements.navControls.nextWeek.addEventListener('click', () => changeTime(7, 'days'));
    elements.navControls.prevMonth.addEventListener('click', () => changeTime(-1, 'months'));
    elements.navControls.nextMonth.addEventListener('click', () => changeTime(1, 'months'));

    // Modal
    if (elements.modal.addBtn) {
        elements.modal.addBtn.addEventListener('click', () => openModal(null, false));
    }

    if (elements.addTaskBtn) {
        elements.addTaskBtn.addEventListener('click', () => openModal(null, true));
    }

    elements.modal.closeBtn.addEventListener('click', () => toggleModal(false));
    elements.modal.overlay.addEventListener('click', (e) => {
        if (e.target === elements.modal.overlay) toggleModal(false);
    });

    elements.modal.form.addEventListener('submit', handleFormSubmit);

    // Toggle color picker visibility based on checkbox
    const recurringCheckbox = document.getElementById('event-recurring');
    const recurringOptions = document.getElementById('recurring-options');
    if (recurringCheckbox) {
        recurringCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                recurringOptions.classList.remove('hidden');
            } else {
                recurringOptions.classList.add('hidden');
            }
        });
    }

    // View Toggle (Weekly)
    const btnBlocks = document.getElementById('view-blocks-btn');
    const btnHourly = document.getElementById('view-hourly-btn');
    if (btnBlocks && btnHourly) {
        btnBlocks.addEventListener('click', () => switchWeeklyMode('blocks'));
        btnHourly.addEventListener('click', () => switchWeeklyMode('hourly'));
    }

    // Habit Management
    if (elements.manageHabitsBtn) {
        elements.manageHabitsBtn.addEventListener('click', () => openHabitModal());
    }
    if (elements.modal.habitCloseBtn) {
        elements.modal.habitCloseBtn.addEventListener('click', () => toggleHabitModal(false));
    }
    if (elements.modal.habitForm) {
        elements.modal.habitForm.addEventListener('submit', handleHabitSubmit);
    }
    const deleteHabitBtn = document.getElementById('delete-habit-btn');
    if (deleteHabitBtn) {
        deleteHabitBtn.addEventListener('click', () => {
            const id = document.getElementById('habit-id').value;
            if (id && confirm('¿Borrar este hábito y todo su progreso?')) {
                appState.habits = appState.habits.filter(h => h.id != id);
                saveHabits();
                toggleHabitModal(false);
                render();
            }
        });
    }

    // Delete Logic
    const deleteBtn = document.getElementById('delete-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            const id = document.getElementById('event-id').value;
            if (id && confirm('¿Borrar este evento?')) {
                appState.events = appState.events.filter(e => e.id != id);
                saveEvents();
                toggleModal(false);
                render();
            }
        });
    }
    // Recipe Management
    if (elements.addRecipeBtn) {
        elements.addRecipeBtn.addEventListener('click', () => openRecipeModal());
    }
    if (elements.modal.recipeCloseBtn) {
        elements.modal.recipeCloseBtn.addEventListener('click', () => toggleRecipeModal(false));
    }
    if (elements.modal.recipeForm) {
        elements.modal.recipeForm.addEventListener('submit', handleRecipeSubmit);
    }
    const deleteRecipeBtn = document.getElementById('delete-recipe-btn');
    if (deleteRecipeBtn) {
        deleteRecipeBtn.addEventListener('click', () => {
            const id = document.getElementById('recipe-id').value;
            if (id && confirm('¿Borrar esta receta de forma permanente?')) {
                appState.recipes = appState.recipes.filter(r => r.id != id);
                saveRecipes();
                toggleRecipeModal(false);
                render();
            }
        });
    }

    // Recipe Search
    const recipeSearch = document.getElementById('recipe-search');
    if (recipeSearch) {
        recipeSearch.addEventListener('input', (e) => {
            appState.recipeSearchQuery = e.target.value.toLowerCase();
            renderRecipes(appState.recipeSearchQuery);
        });
    }

    // Dynamic Lists for Recipes
    const addIngBtn = document.getElementById('add-ingredient-btn');
    const addStepBtn = document.getElementById('add-step-btn');
    const ingInput = document.getElementById('new-ingredient');
    const stepInput = document.getElementById('new-step');

    if (addIngBtn) addIngBtn.addEventListener('click', () => addListItem('ingredient'));
    if (addStepBtn) addStepBtn.addEventListener('click', () => addListItem('step'));

    if (ingInput) {
        ingInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addListItem('ingredient');
            }
        });
    }
    if (stepInput) {
        stepInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addListItem('step');
            }
        });
    }

    // Recipe Photo Upload
    const photoContainer = document.getElementById('photo-upload-container');
    const photoInput = document.getElementById('recipe-photo-input');
    const photoPreview = document.getElementById('recipe-photo-preview');
    const photoPlaceholder = document.getElementById('photo-preview-placeholder');

    if (photoContainer && photoInput) {
        photoContainer.addEventListener('click', () => photoInput.click());

        photoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    currentRecipeImage = event.target.result;
                    photoPreview.src = currentRecipeImage;
                    photoPreview.classList.remove('hidden');
                    photoPlaceholder.classList.add('hidden');
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Analytics Toggle
    const addAnalyticsBtn = document.getElementById('add-analytics-btn');
    const closeAnalyticsBtn = document.getElementById('close-analytics-modal');
    if (addAnalyticsBtn) addAnalyticsBtn.addEventListener('click', () => openAnalyticsModal());
    if (closeAnalyticsBtn) closeAnalyticsBtn.addEventListener('click', () => toggleAnalyticsModal(false));

    const analyticsForm = document.getElementById('analytics-form');
    if (analyticsForm) analyticsForm.addEventListener('submit', handleAnalyticsSubmit);

    // Pomodoro Controls
    if (elements.pomodoro.start) {
        elements.pomodoro.start.addEventListener('click', startPomodoro);
        elements.pomodoro.pause.addEventListener('click', pausePomodoro);
        elements.pomodoro.reset.addEventListener('click', resetPomodoro);
    }

    // --- EXPENSES & CATEGORIES (Consolidated) ---
    const expenseForm = document.getElementById('expense-form');
    if (expenseForm) {
        expenseForm.addEventListener('submit', addExpense);
        const expDate = document.getElementById('expense-date');
        if (expDate) expDate.value = new Date().toISOString().split('T')[0];
    }

    const manageCatBtn = document.getElementById('manage-categories-btn');
    if (manageCatBtn) manageCatBtn.addEventListener('click', () => toggleCategoryModal(true));

    const closeCatBtn = document.getElementById('close-category-modal');
    if (closeCatBtn) {
        closeCatBtn.addEventListener('click', () => {
            toggleCategoryModal(false);
            cancelCategoryEdit();
        });
    }

    const cancelCatEditBtn = document.getElementById('cancel-category-edit');
    if (cancelCatEditBtn) cancelCatEditBtn.addEventListener('click', cancelCategoryEdit);

    const cancelExpEditBtn = document.getElementById('cancel-expense-edit');
    if (cancelExpEditBtn) cancelExpEditBtn.addEventListener('click', cancelExpenseEdit);

    const closeEditModalBtn = document.getElementById('close-expense-edit-modal');
    if (closeEditModalBtn) closeEditModalBtn.addEventListener('click', () => toggleExpenseEditModal(false));

    const expenseEditForm = document.getElementById('expense-edit-form');
    if (expenseEditForm) {
        expenseEditForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const index = document.getElementById('edit-modal-expense-index').value;
            const description = document.getElementById('edit-expense-desc').value;
            const amount = parseFloat(document.getElementById('edit-expense-amount').value);
            const category = document.getElementById('edit-expense-category').value;
            const date = document.getElementById('edit-expense-date').value;
            const paymentMethodCheckbox = document.querySelector('input[name="edit-payment-method"]:checked');
            const paymentMethod = paymentMethodCheckbox ? paymentMethodCheckbox.value : 'tarjeta';

            if (!description || isNaN(amount)) return;

            appState.expenses[parseInt(index)] = { description, amount, category, date, paymentMethod };
            localStorage.setItem('agenda_expenses', JSON.stringify(appState.expenses));

            toggleExpenseEditModal(false);
            renderExpenses();
        });
    }

    const addCatForm = document.getElementById('add-category-form');
    if (addCatForm) {
        addCatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const editIndex = document.getElementById('edit-category-index').value;
            const name = document.getElementById('category-name').value;
            const emoji = document.getElementById('category-emoji').value || '📦';
            const color = document.getElementById('category-color').value;

            const existing = appState.expenseCategories.find((c, idx) => c.name === name && idx.toString() !== editIndex);
            if (existing) {
                alert("Esta categoría ya existe.");
                return;
            }

            if (editIndex !== '') {
                const oldName = appState.expenseCategories[parseInt(editIndex)].name;
                appState.expenseCategories[parseInt(editIndex)] = { name, emoji, color };

                if (oldName !== name) {
                    appState.expenses.forEach(exp => {
                        if (exp.category === oldName) exp.category = name;
                    });
                    localStorage.setItem('agenda_expenses', JSON.stringify(appState.expenses));
                    renderExpenses();
                }
                cancelCategoryEdit();
            } else {
                appState.expenseCategories.push({ name, emoji, color });
                addCatForm.reset();
                document.getElementById('category-color').value = '#9f7aea';
            }

            saveCategories();
            renderCategoryManager();
            updateCategorySelects();
            calculateExpenseStats();
        });
    }

    // Auto-calculate nutrition button delegation
    document.addEventListener('click', (e) => {
        if (e.target.id === 'auto-calc-btn') {
            parseAndCalculateNutrition();
        }
    });
}

// Logic
function switchView(viewName) {
    appState.view = viewName;

    elements.navButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    // Toggle all views
    Object.keys(elements.views).forEach(key => {
        const viewEl = elements.views[key];
        if (key === viewName) {
            viewEl.classList.remove('hidden');
            viewEl.style.display = 'block';
        } else {
            viewEl.classList.add('hidden');
            viewEl.style.display = 'none';
        }
    });

    render();
}

function changeTime(amount, unit) {
    const newDate = new Date(appState.currentDate);
    if (unit === 'days') {
        newDate.setDate(newDate.getDate() + amount);
    } else {
        // Fix: Set date to 1st to avoid month overflow/skipping
        newDate.setDate(1);
        newDate.setMonth(newDate.getMonth() + amount);
    }
    appState.currentDate = newDate;
    render();
}

function toggleModal(show) {
    if (show) {
        elements.modal.overlay.classList.remove('hidden');
    } else {
        elements.modal.overlay.classList.add('hidden');
    }
}

function openModal(event = null, asTask = false) {
    const isEdit = !!event;
    document.getElementById('modal-title-text').textContent =
        isEdit ? (event.isTask ? 'Editar Tarea' : 'Editar Evento') : (asTask ? 'Nueva Tarea' : 'Nuevo Evento');

    document.getElementById('event-is-task').value = asTask || (event && event.isTask) ? 'true' : 'false';
    const recurringCheckbox = document.getElementById('event-recurring');
    const recurringGroup = recurringCheckbox.closest('.form-group');
    const recurringOptions = document.getElementById('recurring-options');

    // Hide some options for tasks
    if (asTask || (event && event.isTask)) {
        recurringGroup.style.display = 'none';
    } else {
        recurringGroup.style.display = 'block';
    }

    if (isEdit) {
        document.getElementById('event-id').value = event.id;
        document.getElementById('event-title').value = event.title;
        document.getElementById('event-date').value = event.date;
        document.getElementById('event-time').value = event.time || '';
        document.getElementById('event-time-end').value = event.timeEnd || ''; // Set end time
        document.querySelector(`input[name="event-type"][value="${event.type}"]`).checked = true;

        recurringCheckbox.checked = !!event.recurring;
        if (event.recurring) {
            recurringOptions.classList.remove('hidden');
        } else {
            recurringOptions.classList.add('hidden');
        }
        document.getElementById('event-color').value = event.color || '#667eea';

        document.getElementById('delete-btn').classList.remove('hidden');
    } else {
        document.getElementById('event-form').reset();
        document.getElementById('event-id').value = '';
        document.getElementById('event-date').value = formatDateKey(new Date());
        document.querySelector('input[name="event-type"][value="personal"]').checked = true;

        recurringCheckbox.checked = false;
        recurringOptions.classList.add('hidden');
        document.getElementById('event-color').value = '#667eea';

        document.getElementById('delete-btn').classList.add('hidden');
    }

    toggleModal(true);
}

function handleFormSubmit(e) {
    e.preventDefault();
    const idInput = document.getElementById('event-id').value;
    const isRecurring = document.getElementById('event-recurring').checked;
    const isTask = document.getElementById('event-is-task').value === 'true';
    const dateInput = document.getElementById('event-date').value;

    const dateObj = new Date(dateInput);

    const eventData = {
        id: idInput ? parseInt(idInput) : Date.now(),
        title: document.getElementById('event-title').value,
        type: document.querySelector('input[name="event-type"]:checked').value,
        date: dateInput,
        time: document.getElementById('event-time').value,
        timeEnd: document.getElementById('event-time-end').value,
        recurring: isRecurring && !isTask,
        isTask: isTask,
        completed: idInput ? (appState.events.find(ev => ev.id == idInput)?.completed || false) : false,
        dayOfWeek: dateObj.getDay(),
        color: document.getElementById('event-color').value
    };

    if (idInput) {
        const index = appState.events.findIndex(e => e.id == idInput);
        if (index !== -1) appState.events[index] = eventData;
    } else {
        appState.events.push(eventData);
    }

    saveEvents();
    toggleModal(false);
    render();
}

// Habit Logic
function toggleHabitModal(show) {
    if (show) {
        elements.modal.habitOverlay.classList.remove('hidden');
        renderManageHabits();
    } else {
        elements.modal.habitOverlay.classList.add('hidden');
    }
}

function openHabitModal(habit = null) {
    const isEdit = !!habit;
    document.getElementById('habit-modal-title').textContent = isEdit ? 'Editar Hábito' : 'Nuevo Hábito';
    document.getElementById('habit-id').value = isEdit ? habit.id : '';
    document.getElementById('habit-name').value = isEdit ? habit.name : '';
    document.getElementById('habit-goal').value = isEdit ? (habit.goal || 7) : 7;

    document.getElementById('delete-habit-btn').classList.toggle('hidden', !isEdit);
    toggleHabitModal(true);
}

function handleHabitSubmit(e) {
    e.preventDefault();
    const idInput = document.getElementById('habit-id').value;
    const nameInput = document.getElementById('habit-name').value;
    const goalInput = parseInt(document.getElementById('habit-goal').value);

    if (idInput) {
        const habit = appState.habits.find(h => h.id == idInput);
        if (habit) {
            habit.name = nameInput;
            habit.goal = goalInput;
        }
    } else {
        appState.habits.push({
            id: Date.now(),
            name: nameInput,
            goal: goalInput,
            completedDates: []
        });
    }

    saveHabits();
    document.getElementById('habit-form').reset();
    document.getElementById('habit-id').value = '';
    renderManageHabits(); // Update list in modal
    render(); // Update table in main view
}

function renderManageHabits() {
    const list = elements.modal.habitList;
    list.innerHTML = '';
    appState.habits.forEach(habit => {
        const item = document.createElement('div');
        item.className = 'habit-manage-item';
        item.innerHTML = `
            <span>${habit.name}</span>
            <button class="habit-edit-btn">Editar</button>
        `;
        item.querySelector('.habit-edit-btn').addEventListener('click', () => openHabitModal(habit));
        list.appendChild(item);
    });
}

function toggleHabit(habitId, dateKey) {
    const habit = appState.habits.find(h => h.id === habitId);
    if (!habit) return;

    if (habit.completedDates.includes(dateKey)) {
        habit.completedDates = habit.completedDates.filter(d => d !== dateKey);
    } else {
        habit.completedDates.push(dateKey);
    }
    saveHabits();
    renderHabits();
}

function renderHabits() {
    const tableContainer = elements.habitsTable;
    if (!tableContainer) return;
    tableContainer.innerHTML = '';

    if (appState.habits.length === 0) {
        tableContainer.innerHTML = '<p style="text-align:center; padding: 20px; color: var(--text-light);">No hay hábitos rastreados. ¡Añade uno!</p>';
        return;
    }

    const startOfWeek = getStartOfWeek(appState.currentDate);
    const days = [];
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        const dateKey = formatDateKey(d);
        days.push({
            label: d.toLocaleDateString('es-ES', { weekday: 'narrow' }).toUpperCase(),
            dateKey: dateKey
        });
        weekDates.push(dateKey);
    }

    const table = document.createElement('table');
    table.className = 'habits-table';

    // Header
    let headerHTML = '<thead><tr><th class="habit-name-cell">Hábito</th><th style="width: 80px;">Meta Sem.</th>';
    days.forEach(day => {
        headerHTML += `<th>${day.label}</th>`;
    });
    headerHTML += '</tr></thead>';
    table.innerHTML = headerHTML;

    // Body
    const tbody = document.createElement('tbody');
    appState.habits.forEach(habit => {
        const tr = document.createElement('tr');

        // Calculate weekly progress
        const weeklyCompletedCount = habit.completedDates.filter(date => weekDates.includes(date)).length;
        const goal = habit.goal || 7;
        const isGoalMet = weeklyCompletedCount >= goal;

        let rowHTML = `
            <td class="habit-name-cell">${habit.name}</td>
            <td class="habit-progress-cell ${isGoalMet ? 'goal-met' : ''}">
                <span class="progress-val">${weeklyCompletedCount}/${goal}</span>
            </td>
        `;

        days.forEach(day => {
            const isCompleted = habit.completedDates.includes(day.dateKey);
            rowHTML += `
                <td class="habit-check-cell" data-habit-id="${habit.id}" data-date="${day.dateKey}">
                    <div class="habit-dot ${isCompleted ? 'completed' : ''}">${isCompleted ? '✓' : ''}</div>
                </td>
            `;
        });
        tr.innerHTML = rowHTML;

        // Add click listeners to cells
        tr.querySelectorAll('.habit-check-cell').forEach(cell => {
            cell.addEventListener('click', () => {
                toggleHabit(parseInt(cell.dataset.habitId), cell.dataset.date);
            });
        });

        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    tableContainer.appendChild(table);
}


// Rendering

function render() {
    // Always render calendar widget for dashboard interaction
    renderCompactCalendar();

    if (appState.view === 'dashboard') {
        renderNotes();
    } else if (appState.view === 'weekly') {
        renderWeeklyView();
        renderHabits();
    } else if (appState.view === 'expenses') {
        renderExpenses();
    } else if (appState.view === 'sop') {
        renderRecipes(appState.recipeSearchQuery);
        updateAnalyticsDashboard();
    }
}

let weeklyMode = 'blocks'; // 'blocks' | 'hourly'

function switchWeeklyMode(mode) {
    weeklyMode = mode;
    document.getElementById('view-blocks-btn').classList.toggle('active', mode === 'blocks');
    document.getElementById('view-hourly-btn').classList.toggle('active', mode === 'hourly');

    if (mode === 'blocks') {
        document.getElementById('week-grid').classList.remove('hidden');
        document.getElementById('hourly-grid').classList.add('hidden');
    } else {
        document.getElementById('week-grid').classList.add('hidden');
        document.getElementById('hourly-grid').classList.remove('hidden');
    }
    renderWeeklyView();
}


function renderWeeklyView() {
    const startOfWeek = getStartOfWeek(appState.currentDate);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);

    const options = { month: 'long', day: 'numeric' };
    elements.currentWeekLabel.textContent = `${startOfWeek.toLocaleDateString('es-ES', options)} - ${endOfWeek.toLocaleDateString('es-ES', options)}`;

    if (weeklyMode === 'blocks') {
        renderWeeklyBlocks(startOfWeek);
    } else {
        renderWeeklyHourly(startOfWeek);
    }
}

function toggleTask(id) {
    const ev = appState.events.find(e => e.id == id);
    if (ev) {
        ev.completed = !ev.completed;
        saveEvents();
        render();
    }
}

function renderWeeklyBlocks(startOfWeek) {
    elements.weekGrid.innerHTML = '';
    let totalWeekTasks = 0;
    let completedWeekTasks = 0;

    for (let i = 0; i < 7; i++) {
        const dayDate = new Date(startOfWeek);
        dayDate.setDate(startOfWeek.getDate() + i);
        const dateKey = formatDateKey(dayDate);
        const isToday = dateKey === formatDateKey(new Date());

        const dayColumn = document.createElement('div');
        dayColumn.className = 'day-column';

        const dayHeader = document.createElement('div');
        dayHeader.className = `day-header ${isToday ? 'today' : ''}`;
        dayHeader.innerHTML = `<div>${dayDate.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase()} ${dayDate.getDate()}</div>`;

        const dayContent = document.createElement('div');
        dayContent.className = 'day-content';

        // Filter events AND tasks for this day - EXCLUDE recurring
        const dayAll = appState.events.filter(e => e.date === dateKey && !e.recurring);
        dayAll.sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));

        dayAll.forEach(item => {
            if (item.isTask) {
                totalWeekTasks++;
                if (item.completed) completedWeekTasks++;

                const taskEl = document.createElement('div');
                taskEl.className = `task-item-container ${item.completed ? 'completed' : ''}`;
                taskEl.innerHTML = `
                    <input type="checkbox" class="task-checkbox" ${item.completed ? 'checked' : ''}>
                    <span class="task-text">${item.title}</span>
                `;
                taskEl.querySelector('input').addEventListener('change', (e) => {
                    e.stopPropagation();
                    toggleTask(item.id);
                });
                taskEl.addEventListener('click', (e) => {
                    if (e.target.tagName !== 'INPUT') openModal(item);
                });
                if (item.color) {
                    taskEl.style.borderLeft = `5px solid ${item.color}`;
                    taskEl.style.background = `${item.color}15`; // 15 is ~8% opacity in hex
                }
                dayContent.appendChild(taskEl);
            } else {
                const eventCard = document.createElement('div');
                eventCard.className = `event-card ${item.type}`;
                if (item.color) {
                    eventCard.style.backgroundColor = item.color;
                    eventCard.style.borderLeft = `4px solid rgba(0,0,0,0.2)`;
                    eventCard.style.color = getContrastColor(item.color);
                }
                const timeStr = item.time ? (item.timeEnd ? `${item.time}-${item.timeEnd}` : item.time) : '';
                eventCard.textContent = `${timeStr} ${item.title}`;
                eventCard.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openModal(item);
                });
                dayContent.appendChild(eventCard);
            }
        });

        dayColumn.appendChild(dayHeader);
        dayColumn.appendChild(dayContent);
        elements.weekGrid.appendChild(dayColumn);
    }

    // Render Progress Bar
    const percentage = totalWeekTasks > 0 ? Math.round((completedWeekTasks / totalWeekTasks) * 100) : 0;
    const progressSection = document.getElementById('weekly-progress-section');
    if (progressSection) {
        document.getElementById('progress-percentage').textContent = `${percentage}%`;
        document.getElementById('progress-fill').style.width = `${percentage}%`;
        progressSection.style.display = totalWeekTasks > 0 ? 'block' : 'none';
    }
}

function renderWeeklyHourly(startOfWeek) {
    const grid = document.getElementById('hourly-grid');
    grid.innerHTML = '';

    // Header Row
    const corner = document.createElement('div');
    corner.className = 'hourly-header-cell';
    grid.appendChild(corner);

    for (let i = 0; i < 7; i++) {
        const dayDate = new Date(startOfWeek);
        dayDate.setDate(startOfWeek.getDate() + i);
        const dateKey = formatDateKey(dayDate);
        const isToday = dateKey === formatDateKey(new Date());
        const header = document.createElement('div');
        header.className = 'hourly-header-cell';
        if (isToday) header.style.color = 'var(--accent-color)';
        header.textContent = `${dayDate.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase()} ${dayDate.getDate()}`;
        grid.appendChild(header);
    }

    // Prepare Events for easy lookup to avoid excessive filtering loops if possible, 
    // but standard loop is fine for small scale.
    // NOTE: Implementing "Height" based on duration means we can't just use standard 60px slots easily if we want precise absolute positioning.
    // BUT user asked for "option to put start/end time".
    // We will stick to the Grid SLOT approach, but extend the height of the element to span multiple slots if needed, 
    // OR just use absolute positioning completely relative to the column.
    // The previous implementation used slots. Let's stick to slots but make event "overflow" if it is long.
    // Actually, absolute positioning within a day column is best for duration.
    // Let's refactor to Column-Based Layout for Hourly instead of Row-Based Grid if we want true duration visuals.
    // However, existing CSS is Grid. Let's try to map it to the grid.

    // Easier approach for this structure: stick to grid slots. If event starts at 10:00 and ends at 12:00, 
    // we can either put it in 10:00 slot and make height 200%.

    for (let hour = 8; hour <= 21; hour++) {
        // Time Label
        const timeLabel = document.createElement('div');
        timeLabel.className = 'time-slot-label';
        timeLabel.textContent = `${hour}:00`;
        grid.appendChild(timeLabel);

        // Day Slots
        for (let i = 0; i < 7; i++) {
            const dayDate = new Date(startOfWeek);
            dayDate.setDate(startOfWeek.getDate() + i);
            const dateKey = formatDateKey(dayDate);
            const currentDayOfWeek = dayDate.getDay();

            const slot = document.createElement('div');
            slot.className = 'time-slot';
            slot.dataset.date = dateKey;
            slot.dataset.hour = hour;

            // Find events starting this hour
            const slotEvents = appState.events.filter(e => {
                const eventHour = e.time ? parseInt(e.time.split(':')[0]) : -1;
                if (eventHour !== hour) return false;
                if (e.isTask) return false; // HIDE TASKS
                if (e.recurring) return e.dayOfWeek === currentDayOfWeek;
                return e.date === dateKey;
            });
            slotEvents.forEach(event => {
                const el = document.createElement('div');
                el.className = `hourly-event ${event.type}`;
                if (event.color) {
                    el.style.backgroundColor = event.color;
                    el.style.borderLeft = `4px solid rgba(0,0,0,0.2)`;
                    el.style.color = getContrastColor(event.color);
                }

                // Calculate height
                let height = '90%'; // default almost full slot
                if (event.time && event.timeEnd) {
                    const startH = parseInt(event.time.split(':')[0]);
                    const startM = parseInt(event.time.split(':')[1]);
                    const endH = parseInt(event.timeEnd.split(':')[0]);
                    const endM = parseInt(event.timeEnd.split(':')[1]);

                    const durationMinutes = ((endH * 60) + endM) - ((startH * 60) + startM);
                    const heightPercent = (durationMinutes / 60) * 100;
                    if (heightPercent > 0) {
                        el.style.height = `calc(${heightPercent}% - 4px)`;
                        el.style.zIndex = '5'; // overlay next slots
                    }
                }

                if (event.recurring) {
                    el.style.borderStyle = 'dashed';
                    el.innerHTML = `<strong>↻</strong> ${event.title}`;
                    if (event.color) {
                        el.style.backgroundColor = event.color + '80';
                        el.style.borderLeftColor = event.color;
                        el.style.color = '#fff';
                        el.style.textShadow = '0 1px 2px rgba(0,0,0,0.5)';
                    }
                } else {
                    el.textContent = event.title;
                }

                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openModal(event);
                });
                slot.appendChild(el);
            });

            slot.addEventListener('click', () => {
                openModal(null, false); // Default not a task
                document.getElementById('event-date').value = dateKey;
                document.getElementById('event-time').value = `${hour.toString().padStart(2, '0')}:00`;
                document.getElementById('event-time-end').value = `${(hour + 1).toString().padStart(2, '0')}:00`;
            });

            grid.appendChild(slot);
        }
    }
}

function renderCompactCalendar() {
    const year = appState.currentDate.getFullYear();
    const month = appState.currentDate.getMonth();

    elements.currentMonthLabel.textContent = appState.currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();
    elements.calendarGrid.innerHTML = '';

    const displayDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    displayDays.forEach(d => {
        const h = document.createElement('div');
        h.className = 'calendar-header-cell';
        h.textContent = d;
        elements.calendarGrid.appendChild(h);
    });

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let startParams = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

    for (let i = 0; i < startParams; i++) {
        const empty = document.createElement('div');
        empty.className = 'calendar-day empty';
        elements.calendarGrid.appendChild(empty);
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
        const cellDate = new Date(year, month, i);
        const dateKey = formatDateKey(cellDate);
        const isToday = dateKey === formatDateKey(new Date());
        // HIDE TASKS IN MONTHLY
        const dayEvents = appState.events.filter(e => e.date === dateKey && !e.recurring && !e.isTask);

        const cell = document.createElement('div');
        cell.className = `calendar-day ${isToday ? 'today' : ''}`;

        const num = document.createElement('span');
        num.className = 'day-number';
        num.textContent = i;
        cell.appendChild(num);

        dayEvents.forEach(ev => {
            const evEl = document.createElement('div');
            evEl.className = `month-event-item ${ev.type}`;
            if (ev.color) {
                evEl.style.backgroundColor = ev.color;
                evEl.style.color = getContrastColor(ev.color);
            }
            evEl.textContent = ev.title;
            cell.appendChild(evEl);
        });

        cell.addEventListener('click', () => {
            appState.currentDate = cellDate;
            switchView('weekly');
        });

        elements.calendarGrid.appendChild(cell);
    }
}

// Start App
document.addEventListener('DOMContentLoaded', init);

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then((registration) => {
                console.log('FocusHub PWA: Service Worker registered successfully:', registration.scope);
            })
            .catch((error) => {
                console.log('FocusHub PWA: Service Worker registration failed:', error);
            });
    });
}

// Pomodoro Logic
function updatePomodoroDisplay() {
    const mins = Math.floor(appState.pomodoro.timeLeft / 60);
    const secs = appState.pomodoro.timeLeft % 60;

    if (elements.pomodoro && elements.pomodoro.timer) {
        elements.pomodoro.timer.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        elements.pomodoro.label.textContent = appState.pomodoro.type === 'focus' ? 'ENFOQUE' : 'DESCANSO';

        // Pulse effect when active
        if (appState.pomodoro.isActive) {
            elements.pomodoro.container.style.transform = `scale(${1 + Math.sin(Date.now() / 500) * 0.01})`;
        } else {
            elements.pomodoro.container.style.transform = 'scale(1)';
        }
    }
}

function startPomodoro() {
    if (appState.pomodoro.isActive) return;

    appState.pomodoro.isActive = true;
    elements.pomodoro.start.classList.add('hidden');
    elements.pomodoro.pause.classList.remove('hidden');

    appState.pomodoro.interval = setInterval(() => {
        appState.pomodoro.timeLeft--;

        if (appState.pomodoro.timeLeft < 0) {
            clearInterval(appState.pomodoro.interval);
            appState.pomodoro.isActive = false;

            // Switch mode
            if (appState.pomodoro.type === 'focus') {
                appState.pomodoro.type = 'break';
                appState.pomodoro.timeLeft = 5 * 60;
                alert('¡Tiempo de enfoque terminado! Toma un descanso de 5 minutos.');
            } else {
                appState.pomodoro.type = 'focus';
                appState.pomodoro.timeLeft = 25 * 60;
                alert('¡Descanso terminado! Volvamos al trabajo.');
            }

            resetPomodoroUI();
            updatePomodoroDisplay();
        } else {
            updatePomodoroDisplay();
        }
    }, 1000);
}

function pausePomodoro() {
    clearInterval(appState.pomodoro.interval);
    appState.pomodoro.isActive = false;
    resetPomodoroUI();
}

function resetPomodoro() {
    clearInterval(appState.pomodoro.interval);
    appState.pomodoro.isActive = false;
    appState.pomodoro.type = 'focus';
    appState.pomodoro.timeLeft = 25 * 60;
    resetPomodoroUI();
    updatePomodoroDisplay();
}

function resetPomodoroUI() {
    if (elements.pomodoro && elements.pomodoro.start) {
        elements.pomodoro.start.classList.remove('hidden');
        elements.pomodoro.pause.classList.add('hidden');
        elements.pomodoro.container.style.transform = 'scale(1)';
    }
}

function saveNotes() {
    localStorage.setItem('focus_notes', JSON.stringify(appState.notes));
}

function toggleNoteModal(show) {
    if (show) {
        elements.modal.noteOverlay.classList.remove('hidden');
    } else {
        elements.modal.noteOverlay.classList.add('hidden');
    }
}

function openNoteModal(note = null) {
    const isEdit = !!note;
    document.getElementById('note-modal-title').textContent = isEdit ? 'Editar Idea' : 'Nueva Idea';
    document.getElementById('note-id').value = isEdit ? note.id : '';
    document.getElementById('note-title').value = isEdit ? note.title : '';
    document.getElementById('note-content').value = isEdit ? note.content : '';

    document.getElementById('delete-note-btn').classList.toggle('hidden', !isEdit);
    toggleNoteModal(true);
}

function handleNoteSubmit(e) {
    e.preventDefault();
    const idInput = document.getElementById('note-id').value;
    const titleInput = document.getElementById('note-title').value;
    const contentInput = document.getElementById('note-content').value;

    if (idInput) {
        const note = appState.notes.find(n => n.id == idInput);
        if (note) {
            note.title = titleInput;
            note.content = contentInput;
        }
    } else {
        appState.notes.push({
            id: Date.now(),
            title: titleInput,
            content: contentInput,
            date: new Date().toLocaleDateString()
        });
    }

    saveNotes();
    toggleNoteModal(false);
    renderNotes();
}

function renderNotes() {
    const container = elements.notesList;
    if (!container) return;
    container.innerHTML = '';

    if (appState.notes.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding: 20px; color: var(--text-light); font-size: 0.8rem;">No hay ideas registradas. ¡Empieza una!</p>';
        return;
    }

    // Sort by newest first
    const sorted = [...appState.notes].reverse();

    sorted.forEach(note => {
        const item = document.createElement('div');
        item.className = 'note-item';
        item.innerHTML = `
            <h4>${note.title}</h4>
            <p>${note.content}</p>
            <div class="note-date">${note.date}</div>
        `;
        item.addEventListener('click', () => openNoteModal(note));
        container.appendChild(item);
    });
}

// Recipe Logic
function saveRecipes() {
    localStorage.setItem('agenda_recipes', JSON.stringify(appState.recipes));
}

function toggleRecipeModal(show) {
    if (!elements.modal.recipeOverlay) return;
    if (show) {
        elements.modal.recipeOverlay.classList.remove('hidden');
    } else {
        elements.modal.recipeOverlay.classList.add('hidden');
    }
}

function openRecipeModal(recipe = null) {
    const isEdit = !!recipe;
    document.getElementById('recipe-modal-title').textContent = isEdit ? 'Editar Receta' : 'Nueva Receta';
    document.getElementById('recipe-id').value = isEdit ? recipe.id : '';
    document.getElementById('recipe-name').value = isEdit ? recipe.name : '';

    // Migrate string data to arrays if needed
    if (isEdit) {
        currentRecipeImage = recipe.image || '';
        if (Array.isArray(recipe.ingredients)) {
            currentRecipeIngredients = [...recipe.ingredients];
        } else {
            // Migration for old string data (splitting by newline/bullets)
            const raw = recipe.ingredients || recipe.instructions || '';
            currentRecipeIngredients = raw.split('\n').map(s => s.replace(/^[•\s*-]+/, '').trim()).filter(s => s !== '');
        }

        if (Array.isArray(recipe.steps)) {
            currentRecipeSteps = [...recipe.steps];
        } else {
            const raw = recipe.steps || '';
            currentRecipeSteps = raw.split('\n').map(s => s.replace(/^\d+[\.\)\s*-]+/, '').trim()).filter(s => s !== '');
        }
    } else {
        currentRecipeIngredients = [];
        currentRecipeSteps = [];
        currentRecipeImage = '';
    }

    // Update Photo Preview
    const photoPreview = document.getElementById('recipe-photo-preview');
    const photoPlaceholder = document.getElementById('photo-preview-placeholder');
    if (currentRecipeImage) {
        photoPreview.src = currentRecipeImage;
        photoPreview.classList.remove('hidden');
        photoPlaceholder.classList.add('hidden');
    } else {
        photoPreview.src = '';
        photoPreview.classList.add('hidden');
        photoPlaceholder.classList.remove('hidden');
    }

    renderDynamicList('ingredient');
    renderDynamicList('step');

    document.getElementById('recipe-protein').value = isEdit ? (recipe.protein || 0) : 0;
    document.getElementById('recipe-carbs').value = isEdit ? (recipe.carbs || 0) : 0;
    document.getElementById('recipe-fats').value = isEdit ? (recipe.fats || 0) : 0;

    document.getElementById('delete-recipe-btn').classList.toggle('hidden', !isEdit);
    toggleRecipeModal(true);
}

function renderDynamicList(type) {
    const list = type === 'ingredient' ? currentRecipeIngredients : currentRecipeSteps;
    const container = document.getElementById(type === 'ingredient' ? 'ingredients-list' : 'steps-list');
    if (!container) return;

    container.innerHTML = '';
    list.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = 'dynamic-item-row';
        row.innerHTML = `
            <span>${type === 'step' ? (index + 1) + '. ' : '• '}${item}</span>
            <span class="remove-item-btn" onclick="removeItemFromList('${type}', ${index})">&times;</span>
        `;
        container.appendChild(row);
    });
}

function addListItem(type) {
    const inputId = type === 'ingredient' ? 'new-ingredient' : 'new-step';
    const input = document.getElementById(inputId);
    const value = input.value.trim();

    if (value) {
        if (type === 'ingredient') {
            currentRecipeIngredients.push(value);
        } else {
            currentRecipeSteps.push(value);
        }
        input.value = '';
        renderDynamicList(type);
    }
}

function removeItemFromList(type, index) {
    if (type === 'ingredient') {
        currentRecipeIngredients.splice(index, 1);
    } else {
        currentRecipeSteps.splice(index, 1);
    }
    renderDynamicList(type);
}

// Attach to window so onclick works (or better, use delegation)
window.removeItemFromList = removeItemFromList;

function handleRecipeSubmit(e) {
    e.preventDefault();
    const idInput = document.getElementById('recipe-id').value;
    const name = document.getElementById('recipe-name').value;
    const protein = parseInt(document.getElementById('recipe-protein').value) || 0;
    const carbs = parseInt(document.getElementById('recipe-carbs').value) || 0;
    const fats = parseInt(document.getElementById('recipe-fats').value) || 0;

    if (idInput) {
        const recipe = appState.recipes.find(r => r.id == idInput);
        if (recipe) {
            recipe.name = name;
            recipe.ingredients = [...currentRecipeIngredients];
            recipe.steps = [...currentRecipeSteps];
            recipe.image = currentRecipeImage;
            delete recipe.instructions;
            recipe.protein = protein;
            recipe.carbs = carbs;
            recipe.fats = fats;
        }
    } else {
        appState.recipes.push({
            id: Date.now(),
            name,
            ingredients: [...currentRecipeIngredients],
            steps: [...currentRecipeSteps],
            image: currentRecipeImage,
            protein,
            carbs,
            fats,
            date: new Date().toLocaleDateString()
        });
    }

    saveRecipes();
    toggleRecipeModal(false);
    render();
}

function renderRecipes(searchQuery = '') {
    const container = elements.recipesList;
    if (!container) return;
    container.innerHTML = '';

    const filteredRecipes = searchQuery
        ? appState.recipes.filter(r => r.name.toLowerCase().includes(searchQuery))
        : appState.recipes;

    if (filteredRecipes.length === 0) {
        container.innerHTML = `<p style="text-align:center; padding: 20px; color: var(--text-light); font-size: 0.8rem; width: 100%; border-top: 1px solid rgba(255,255,255,0.1);">
            ${searchQuery ? 'No se encontraron recetas que coincidan con "' + searchQuery + '"' : 'No hay recetas registradas. ¡Añade tu primera receta saludable!'}
        </p>`;
        return;
    }

    filteredRecipes.forEach(recipe => {
        const calories = (recipe.protein * 4) + (recipe.carbs * 4) + (recipe.fats * 9);
        const card = document.createElement('div');
        card.className = 'recipe-card';

        const photoHTML = recipe.image ? `<img src="${recipe.image}" class="recipe-card-img" alt="${recipe.name}">` : '';

        let ingHTML = '';
        if (Array.isArray(recipe.ingredients)) {
            ingHTML = '<ul>' + recipe.ingredients.slice(0, 3).map(i => `<li>${i}</li>`).join('') + (recipe.ingredients.length > 3 ? '<li>...</li>' : '') + '</ul>';
        } else {
            ingHTML = `<p class="instr-preview">${recipe.ingredients || recipe.instructions || 'Sin ingredientes'}</p>`;
        }

        card.innerHTML = `
            ${photoHTML}
            <h4>${recipe.name}</h4>
            <div class="instr-preview">
                <strong>Ingredientes:</strong>
                ${ingHTML}
            </div>
            <div class="recipe-nutrition-summary">
                <span class="nutrition-badge badge-protein">P: ${recipe.protein}g</span>
                <span class="nutrition-badge badge-carbs">HC: ${recipe.carbs}g</span>
                <span class="nutrition-badge badge-fats">G: ${recipe.fats}g</span>
                <span class="nutrition-badge badge-calories">${calories} kcal</span>
            </div>
        `;
        card.addEventListener('click', () => openRecipeModal(recipe));
        container.appendChild(card);
    });
}

// Nutrition Database (Reference values per 100g or unit)
const NUTRITION_DB = {
    // PROTEINS
    'pollo': { p: 27, c: 0, f: 3, unit: 'g' },
    'pavo': { p: 29, c: 0, f: 1, unit: 'g' },
    'huevo': { p: 13, c: 1, f: 11, isUnit: true, unitWeight: 50 }, // per unit
    'atun': { p: 26, c: 0, f: 1, unit: 'g' },
    'salmon': { p: 20, c: 0, f: 13, unit: 'g' },
    'ternera': { p: 26, c: 0, f: 15, unit: 'g' },
    'tofu': { p: 8, c: 2, f: 4, unit: 'g' },
    'lentejas': { p: 9, c: 20, f: 0.5, unit: 'g' }, // cocidas
    'garbanzos': { p: 19, c: 60, f: 6, unit: 'g' }, // secos
    'soja': { p: 36, c: 30, f: 20, unit: 'g' },

    // CARBS
    'arroz': { p: 2.7, c: 28, f: 0.3, unit: 'g' }, // cocido
    'quinoa': { p: 4.4, c: 21, f: 1.9, unit: 'g' }, // cocida
    'pasta': { p: 5, c: 25, f: 1.1, unit: 'g' }, // cocida
    'avena': { p: 17, c: 66, f: 7, unit: 'g' },
    'pan': { p: 9, c: 49, f: 3, unit: 'g' },
    'patata': { p: 2, c: 17, f: 0.1, unit: 'g' },
    'boniato': { p: 1.6, c: 20, f: 0.1, unit: 'g' },

    // FATS
    'aguacate': { p: 2, c: 8, f: 15, isUnit: true, unitWeight: 150 }, // per unit
    'nueces': { p: 15, c: 14, f: 65, unit: 'g' },
    'almendras': { p: 21, c: 22, f: 50, unit: 'g' },
    'aceite': { p: 0, c: 0, f: 100, unit: 'g' }, // AOVE
    'crema cacahuete': { p: 25, c: 20, f: 50, unit: 'g' },

    // VEGGIES (low cal but good for tracking)
    'espinacas': { p: 2.9, c: 3.6, f: 0.4, unit: 'g' },
    'brocoli': { p: 2.8, c: 7, f: 0.3, unit: 'g' },
    'tomate': { p: 0.9, c: 3.9, f: 0.2, unit: 'g' },
    'lechuga': { p: 1.4, c: 2.9, f: 0.2, unit: 'g' }
};

// Initial Call handled by DOMContentLoaded at line 991

function toggleAnalyticsModal(show) {
    const modal = document.getElementById('analytics-modal');
    if (!modal) return;
    if (show) {
        modal.classList.remove('hidden');
        document.getElementById('health-date').value = new Date().toISOString().split('T')[0];
    } else {
        modal.classList.add('hidden');
    }
}

function openAnalyticsModal() {
    document.getElementById('health-record-id').value = '';
    document.getElementById('analytics-form').reset();
    document.getElementById('analytics-modal-title').textContent = 'Nuevo Registro de Salud';
    toggleAnalyticsModal(true);
}

function handleAnalyticsSubmit(e) {
    e.preventDefault();
    const date = document.getElementById('health-date').value;
    const weight = parseFloat(document.getElementById('health-weight').value);
    const lh = parseFloat(document.getElementById('health-lh').value);
    const estrogen = parseFloat(document.getElementById('health-estrogen').value);
    const progesterone = parseFloat(document.getElementById('health-progesterone').value);
    const isPeriodStart = document.getElementById('health-period-start').checked;

    const recordId = document.getElementById('health-record-id').value; // Original date if editing

    // If editing, remove old entries for that specific date first to avoid duplicates
    if (recordId) {
        appState.weightLog = appState.weightLog.filter(d => d.date !== recordId);
        appState.hormoneLog = appState.hormoneLog.filter(d => d.date !== recordId);
        appState.cycleLog = appState.cycleLog.filter(d => d.date !== recordId);
    }

    if (weight) {
        appState.weightLog.push({ date, weight });
        appState.weightLog.sort((a, b) => new Date(a.date) - new Date(b.date));
        localStorage.setItem('agenda_weight_log', JSON.stringify(appState.weightLog));
    }

    if (lh || estrogen || progesterone) {
        appState.hormoneLog.push({ date, lh, estrogen, progesterone });
        appState.hormoneLog.sort((a, b) => new Date(a.date) - new Date(b.date));
        localStorage.setItem('agenda_hormone_log', JSON.stringify(appState.hormoneLog));
    }

    if (isPeriodStart) {
        appState.cycleLog.push({ date });
        appState.cycleLog.sort((a, b) => new Date(a.date) - new Date(b.date));
        localStorage.setItem('agenda_cycle_log', JSON.stringify(appState.cycleLog));
    }

    toggleAnalyticsModal(false);
    render();
}

function updateAnalyticsDashboard() {
    renderWeightChart();
    renderCycleStatus();
    renderHormoneSummary();
    renderHormoneChart();
    renderHealthHistory();
}

function renderWeightChart() {
    const svg = document.getElementById('weight-chart');
    if (!svg || appState.weightLog.length < 2) {
        if (svg) svg.innerHTML = '<text x="300" y="150" text-anchor="middle" fill="#ccc">Añade al menos 2 registros de peso para ver el gráfico</text>';
        return;
    }

    const margin = { top: 30, right: 30, bottom: 40, left: 50 };
    const width = 600;
    const height = 300;
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const weights = appState.weightLog.map(d => d.weight);
    const minW = Math.min(...weights) - 1;
    const maxW = Math.max(...weights) + 1;

    const dates = appState.weightLog.map(d => new Date(d.date).getTime());
    const minD = Math.min(...dates);
    const maxD = Math.max(...dates);

    const getX = (t) => margin.left + ((t - minD) / (maxD - minD)) * chartWidth;
    const getY = (w) => margin.top + chartHeight - ((w - minW) / (maxW - minW)) * chartHeight;

    let points = appState.weightLog.map(d => ({
        x: getX(new Date(d.date).getTime()),
        y: getY(d.weight),
        data: d
    }));

    // Path for line
    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
        pathD += ` L ${points[i].x} ${points[i].y}`;
    }

    // Path for area (closing the shape to the bottom)
    let areaD = `${pathD} L ${points[points.length - 1].x} ${margin.top + chartHeight} L ${points[0].x} ${margin.top + chartHeight} Z`;

    let gridLines = '';
    for (let i = 0; i <= 4; i++) {
        const y = margin.top + (i / 4) * chartHeight;
        const weightLabel = (maxW - (i / 4) * (maxW - minW)).toFixed(1);
        gridLines += `<line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" class="chart-grid" />`;
        gridLines += `<text x="${margin.left - 10}" y="${y + 5}" text-anchor="end" font-size="10" fill="#999">${weightLabel}kg</text>`;
    }

    const circles = points.map((p, i) => `
        <circle class="chart-point" cx="${p.x}" cy="${p.y}" r="6" 
            onmouseover="showChartTooltip(event, '${p.data.weight}kg', '${p.data.date}')" 
            onmouseout="hideChartTooltip()" />
    `).join('');

    svg.innerHTML = `
        <defs>
            <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:var(--type-personal);stop-opacity:0.4" />
                <stop offset="100%" style="stop-color:var(--type-personal);stop-opacity:0" />
            </linearGradient>
        </defs>
        ${gridLines}
        <path d="${areaD}" class="chart-area" />
        <path d="${pathD}" class="chart-line" />
        ${circles}
    `;
}

window.showChartTooltip = (e, weight, date) => {
    const tooltip = document.getElementById('chart-tooltip');
    if (!tooltip) return;
    tooltip.innerHTML = `<strong>${weight}</strong><br><small>${date}</small>`;
    tooltip.classList.remove('hidden');

    // Position tooltip near cursor
    const rect = e.target.closest('svg').getBoundingClientRect();
    tooltip.style.left = (e.clientX - rect.left + 15) + 'px';
    tooltip.style.top = (e.clientY - rect.top - 40) + 'px';
};

window.hideChartTooltip = () => {
    const tooltip = document.getElementById('chart-tooltip');
    if (tooltip) tooltip.classList.add('hidden');
};

function renderCycleStatus() {
    const phaseEl = document.getElementById('current-phase-val');
    const nextEl = document.getElementById('next-period-val');
    if (!phaseEl || !nextEl) return;

    if (appState.cycleLog.length === 0) {
        phaseEl.textContent = 'Sin datos';
        nextEl.textContent = 'Registra el inicio de tu periodo';
        return;
    }

    const lastPeriod = new Date(appState.cycleLog[appState.cycleLog.length - 1].date);
    const today = new Date();
    const diffDays = Math.floor((today - lastPeriod) / (1000 * 60 * 60 * 24));

    let phase = 'Fase Folicular';
    if (diffDays >= 0 && diffDays <= 5) phase = 'Menstruación 🩸';
    else if (diffDays > 5 && diffDays <= 12) phase = 'Fase Folicular';
    else if (diffDays > 12 && diffDays <= 16) phase = 'Ovulación ✨';
    else if (diffDays > 16 && diffDays <= 28) phase = 'Fase Lútea';
    else phase = 'Retraso / Ciclo Largo';

    phaseEl.textContent = phase;

    // Simple prediction (28 days)
    const nextDate = new Date(lastPeriod);
    nextDate.setDate(lastPeriod.getDate() + 28);
    nextEl.textContent = `Próxima regla: ${nextDate.toLocaleDateString()}`;
}

function renderHormoneSummary() {
    const container = document.getElementById('hormone-summary-content');
    if (!container) return;

    if (appState.hormoneLog.length === 0) {
        container.innerHTML = '<p>Sin datos recientes</p>';
        return;
    }

    const latest = appState.hormoneLog[appState.hormoneLog.length - 1];
    container.innerHTML = `
        <div class="hormone-badges">
            <span class="badge badge-lh">LH: ${latest.lh || '--'}</span>
            <span class="badge badge-e2">E2: ${latest.estrogen || '--'}</span>
            <span class="badge badge-p4">P4: ${latest.progesterone || '--'}</span>
        </div>
        <p class="stat-date">Último registro: ${new Date(latest.date).toLocaleDateString()}</p>
    `;
}

function renderHormoneChart() {
    const svg = document.getElementById('hormone-chart');
    if (!svg || appState.hormoneLog.length < 2) {
        if (svg) svg.innerHTML = '<text x="300" y="100" text-anchor="middle" fill="#ccc">Añade al menos 2 registros para ver tendencias</text>';
        return;
    }

    const margin = { top: 20, right: 30, bottom: 30, left: 40 };
    const width = 600;
    const height = 200;
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const logs = [...appState.hormoneLog].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Scales
    const dates = logs.map(d => new Date(d.date).getTime());
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);

    // Multiple scales or normalized? Relative trends
    const maxLH = Math.max(...logs.map(d => d.lh || 0), 1);
    const maxE2 = Math.max(...logs.map(d => d.estrogen || 0), 1);
    const maxP4 = Math.max(...logs.map(d => d.progesterone || 0), 1);

    const getX = (t) => margin.left + (maxDate === minDate ? chartWidth / 2 : ((t - minDate) / (maxDate - minDate)) * chartWidth);
    const getY = (val, max) => margin.top + chartHeight - (val / max) * chartHeight;

    let content = '';

    // Draw lines
    const drawLine = (key, max, className) => {
        let path = `M ${getX(new Date(logs[0].date).getTime())} ${getY(logs[0][key] || 0, max)}`;
        logs.forEach((d, i) => {
            if (i === 0) return;
            path += ` L ${getX(new Date(d.date).getTime())} ${getY(d[key] || 0, max)}`;
        });
        return `<path d="${path}" class="hormone-line ${className}" />`;
    };

    content += drawLine('lh', maxLH, 'line-lh');
    content += drawLine('estrogen', maxE2, 'line-estrogen');
    content += drawLine('progesterone', maxP4, 'line-progesterone');

    // Draw points for tooltips
    logs.forEach(d => {
        const tx = getX(new Date(d.date).getTime());
        content += `
            <circle cx="${tx}" cy="${getY(d.lh || 0, maxLH)}" r="4" fill="#ed8936" class="hormone-point" 
                onmouseover="showHormoneTooltip(event, 'LH', '${d.lh || 0}', '${d.date}')" onmouseout="hideHormoneTooltip()" />
            <circle cx="${tx}" cy="${getY(d.estrogen || 0, maxE2)}" r="4" fill="#9f7aea" class="hormone-point"
                onmouseover="showHormoneTooltip(event, 'E2', '${d.estrogen || 0}', '${d.date}')" onmouseout="hideHormoneTooltip()" />
            <circle cx="${tx}" cy="${getY(d.progesterone || 0, maxP4)}" r="4" fill="#4299e1" class="hormone-point"
                onmouseover="showHormoneTooltip(event, 'P4', '${d.progesterone || 0}', '${d.date}')" onmouseout="hideHormoneTooltip()" />
        `;
    });

    svg.innerHTML = content;
}

window.showHormoneTooltip = (e, label, val, date) => {
    const tooltip = document.getElementById('hormone-chart-tooltip');
    if (!tooltip) return;
    tooltip.innerHTML = `<strong>${new Date(date).toLocaleDateString()}</strong><br>${label}: ${val}`;
    tooltip.classList.remove('hidden');
    tooltip.style.left = (e.pageX + 10) + 'px';
    tooltip.style.top = (e.pageY - 30) + 'px';
};

window.hideHormoneTooltip = () => {
    const tooltip = document.getElementById('hormone-chart-tooltip');
    if (tooltip) tooltip.classList.add('hidden');
};

function renderHealthHistory() {
    const body = document.getElementById('health-history-body');
    if (!body) return;

    const unified = {};
    appState.weightLog.forEach(d => { unified[d.date] = { ...unified[d.date], weight: d.weight }; });
    appState.hormoneLog.forEach(d => { unified[d.date] = { ...unified[d.date], ...d }; });
    appState.cycleLog.forEach(d => { unified[d.date] = { ...unified[d.date], period: true }; });

    const sortedDates = Object.keys(unified).sort((a, b) => new Date(b) - new Date(a));

    body.innerHTML = sortedDates.map(date => {
        const d = unified[date];
        return `
            <tr>
                <td>${new Date(date).toLocaleDateString()}</td>
                <td>${d.weight ? d.weight + 'kg' : '--'}</td>
                <td>
                    <small>LH: ${d.lh || '-'}</small> | 
                    <small>E2: ${d.estrogen || '-'}</small> | 
                    <small>P4: ${d.progesterone || '-'}</small>
                </td>
                <td>${d.period ? '🩸' : '--'}</td>
                <td>
                    <button class="action-btn-sm edit-btn" onclick="editHealthRecord('${date}')">✏️</button>
                    <button class="action-btn-sm delete-btn" onclick="deleteHealthRecord('${date}')">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

window.editHealthRecord = (date) => {
    const weightData = appState.weightLog.find(d => d.date === date);
    const hormoneData = appState.hormoneLog.find(d => d.date === date);
    const cycleData = appState.cycleLog.find(d => d.date === date);

    document.getElementById('health-record-id').value = date;
    document.getElementById('health-date').value = date;
    document.getElementById('health-weight').value = weightData ? weightData.weight : '';
    document.getElementById('health-lh').value = hormoneData ? hormoneData.lh : '';
    document.getElementById('health-estrogen').value = hormoneData ? hormoneData.estrogen : '';
    document.getElementById('health-progesterone').value = hormoneData ? hormoneData.progesterone : '';
    document.getElementById('health-period-start').checked = !!cycleData;

    document.getElementById('analytics-modal-title').textContent = 'Editar Registro';
    openAnalyticsModal();
};

window.deleteHealthRecord = (date) => {
    if (!confirm('¿Estás seguro de eliminar este registro?')) return;
    appState.weightLog = appState.weightLog.filter(d => d.date !== date);
    appState.hormoneLog = appState.hormoneLog.filter(d => d.date !== date);
    appState.cycleLog = appState.cycleLog.filter(d => d.date !== date);

    localStorage.setItem('agenda_weight_log', JSON.stringify(appState.weightLog));
    localStorage.setItem('agenda_hormone_log', JSON.stringify(appState.hormoneLog));
    localStorage.setItem('agenda_cycle_log', JSON.stringify(appState.cycleLog));

    render();
};

function getCategoryData(name) {
    return appState.expenseCategories.find(c => c.name === name) || { name: 'Otros', emoji: '📦', color: '#a0aec0' };
}

function renderExpenses() {
    const listBody = document.getElementById('expense-list-body');
    if (!listBody) return;
    listBody.innerHTML = '';

    const expenses = appState.expenses;
    expenses.sort((a, b) => new Date(b.date) - new Date(a.date));

    expenses.forEach((exp, index) => {
        const row = document.createElement('tr');
        const methodIcon = exp.paymentMethod === 'efectivo' ? '💵' : '💳';
        const methodLabel = exp.paymentMethod === 'efectivo' ? 'Efectivo' : 'Tarjeta';
        const catData = getCategoryData(exp.category);

        row.innerHTML = `
            <td>${new Date(exp.date).toLocaleDateString()}</td>
            <td><span class="category-badge" style="background: ${catData.color}22; color: ${catData.color}; border: 1px solid ${catData.color}44;">${catData.emoji} ${catData.name}</span></td>
            <td>${exp.description}</td>
            <td><span class="payment-badge">${methodIcon} ${methodLabel}</span></td>
            <td style="font-weight: 700;">${parseFloat(exp.amount).toFixed(2)}€</td>
            <td style="display: flex; gap: 5px;">
                <button class="edit-expense-btn" onclick="editExpense(${index})" title="Editar">✏️</button>
                <button class="delete-expense-btn" onclick="deleteExpense(${index})" title="Eliminar">🗑️</button>
            </td>
        `;
        listBody.appendChild(row);
    });

    calculateExpenseStats();
    populateMonthFilter();
}

function editExpense(index) {
    const expenses = appState.expenses;
    appState.expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
    const exp = appState.expenses[index];

    document.getElementById('edit-modal-expense-index').value = index;
    document.getElementById('edit-expense-desc').value = exp.description;
    document.getElementById('edit-expense-amount').value = exp.amount;
    document.getElementById('edit-expense-category').value = exp.category;
    document.getElementById('edit-expense-date').value = exp.date;

    const radio = document.querySelector(`input[name="edit-payment-method"][value="${exp.paymentMethod || 'tarjeta'}"]`);
    if (radio) radio.checked = true;

    toggleExpenseEditModal(true);
}

function toggleExpenseEditModal(show) {
    if (elements.modal.expenseEditOverlay) {
        elements.modal.expenseEditOverlay.classList.toggle('hidden', !show);
    }
}

window.editExpense = editExpense;

function addExpense(e) {
    e.preventDefault();
    const description = document.getElementById('expense-desc').value;
    const amount = parseFloat(document.getElementById('expense-amount').value);
    const category = document.getElementById('expense-category').value;
    const date = document.getElementById('expense-date').value;
    const paymentMethod = document.querySelector('input[name="payment-method"]:checked').value;

    if (!description || isNaN(amount)) return;

    appState.expenses.push({ description, amount, category, date, paymentMethod });
    localStorage.setItem('agenda_expenses', JSON.stringify(appState.expenses));

    e.target.reset();
    document.getElementById('expense-date').value = new Date().toISOString().split('T')[0];
    renderExpenses();
}

function deleteExpense(index) {
    appState.expenses.splice(index, 1);
    localStorage.setItem('agenda_expenses', JSON.stringify(appState.expenses));
    renderExpenses();
}

window.deleteExpense = deleteExpense;

function calculateExpenseStats() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthExpenses = appState.expenses.filter(exp => {
        const d = new Date(exp.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const total = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    document.getElementById('month-total').textContent = `${total.toFixed(2)}€`;

    const categoryTotals = {};
    const methodTotals = { 'tarjeta': 0, 'efectivo': 0 };

    monthExpenses.forEach(exp => {
        categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
        if (exp.paymentMethod) {
            methodTotals[exp.paymentMethod] = (methodTotals[exp.paymentMethod] || 0) + exp.amount;
        } else {
            // Default to card for legacy data
            methodTotals['tarjeta'] += exp.amount;
        }
    });

    let topCat = '--';
    let maxVal = 0;
    for (const cat in categoryTotals) {
        if (categoryTotals[cat] > maxVal) {
            maxVal = categoryTotals[cat];
            topCat = cat;
        }
    }
    document.getElementById('top-category').textContent = topCat;

    // Category Chart
    renderExpensePieChart('expense-pie-chart', 'expense-pie-legend', categoryTotals, total);

    // Payment Method Chart
    renderExpensePieChart('payment-pie-chart', 'payment-pie-legend', methodTotals, total, {
        'tarjeta': '#667eea',
        'efectivo': '#48bb78'
    });
}

function renderExpensePieChart(svgId, legendId, totals, totalAmount, customColors = null) {
    const svg = document.getElementById(svgId);
    const legend = document.getElementById(legendId);
    if (!svg || !legend) return;

    if (totalAmount === 0) {
        svg.innerHTML = '<circle cx="100" cy="100" r="80" fill="#f0f0f0" />';
        legend.innerHTML = '<p style="grid-column: 1/-1; text-align: center; opacity: 0.5; font-size: 0.7rem;">Sin datos</p>';
        return;
    }

    const categories = Object.keys(totals);
    let cumulativePercent = 0;
    let paths = '';
    let legendHTML = '';

    const dynamicColors = {};
    appState.expenseCategories.forEach(c => dynamicColors[c.name] = c.color);

    const colors = customColors || dynamicColors;

    categories.forEach(cat => {
        if (totals[cat] === 0) return;
        const percent = totals[cat] / totalAmount;
        const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
        cumulativePercent += percent;
        const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
        const largeArcFlag = percent > 0.5 ? 1 : 0;

        const pathData = [
            `M 100 100`,
            `L ${startX} ${startY}`,
            `A 80 80 0 ${largeArcFlag} 1 ${endX} ${endY}`,
            `Z`
        ].join(' ');

        const catData = getCategoryData(cat);
        const label = `${catData.emoji} ${catData.name}`;

        paths += `<path d="${pathData}" class="pie-slice" fill="${colors[cat] || '#ccc'}" 
            onmouseover="showPieTooltip(event, '${svgId}', '${label}', '${totals[cat].toFixed(2)}€')" 
            onmouseout="hidePieTooltip()" />`;

        legendHTML += `
            <div class="legend-item">
                <div class="legend-color" style="background: ${colors[cat] || '#ccc'}"></div>
                <span>${label}</span>
            </div>
        `;
    });

    svg.innerHTML = paths;
    legend.innerHTML = legendHTML;
}

window.showPieTooltip = (e, svgId, cat, amount) => {
    // Determine which tooltip to show
    const tooltipId = svgId === 'expense-pie-chart' ? 'expense-pie-tooltip' : 'payment-pie-tooltip';
    const tooltip = document.getElementById(tooltipId);
    if (!tooltip) return;

    tooltip.innerHTML = `<strong>${cat}</strong><br>${amount}`;
    tooltip.classList.remove('hidden');

    const rect = document.getElementById(svgId).getBoundingClientRect();

    // Position tooltip near cursor relative to the SVG container
    tooltip.style.left = (e.clientX - rect.left + 10) + 'px';
    tooltip.style.top = (e.clientY - rect.top - 10) + 'px';
};

window.hidePieTooltip = () => {
    const tooltips = document.querySelectorAll('.chart-tooltip');
    tooltips.forEach(t => t.classList.add('hidden'));
};

function getCoordinatesForPercent(percent) {
    const x = 100 + Math.cos(2 * Math.PI * percent - Math.PI / 2) * 80;
    const y = 100 + Math.sin(2 * Math.PI * percent - Math.PI / 2) * 80;
    return [x, y];
}

function populateMonthFilter() {
    const filter = document.getElementById('expense-filter-month');
    if (!filter || filter.options.length > 0) return;

    const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const now = new Date();

    for (let i = 0; i < 12; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = months[i];
        if (i === now.getMonth()) opt.selected = true;
        filter.appendChild(opt);
    }
}

// Category Management Functions
function toggleCategoryModal(show) {
    if (elements.modal.categoryOverlay) {
        elements.modal.categoryOverlay.classList.toggle('hidden', !show);
        if (show) renderCategoryManager();
    }
}

function renderCategoryManager() {
    const list = elements.modal.categoryList;
    if (!list) return;
    list.innerHTML = '';

    appState.expenseCategories.forEach((cat, index) => {
        const item = document.createElement('div');
        item.className = 'category-manage-item';
        item.innerHTML = `
            <div class="category-info">
                <div class="category-color-dot" style="background: ${cat.color}"></div>
                <span>${cat.emoji} ${cat.name}</span>
            </div>
            <div class="item-actions">
                <button class="mini-edit-btn" onclick="editExpenseCategory(${index})" title="Editar">✏️</button>
                <button class="mini-delete-btn" onclick="deleteExpenseCategory(${index})" title="Eliminar">🗑️</button>
            </div>
        `;
        list.appendChild(item);
    });
}

function editExpenseCategory(index) {
    const cat = appState.expenseCategories[index];
    document.getElementById('edit-category-index').value = index;
    document.getElementById('category-name').value = cat.name;
    document.getElementById('category-emoji').value = cat.emoji;
    document.getElementById('category-color').value = cat.color;

    document.getElementById('category-submit-btn').textContent = '✓';
    document.getElementById('cancel-category-edit').classList.remove('hidden');
}

window.editExpenseCategory = editExpenseCategory;

function cancelCategoryEdit() {
    document.getElementById('add-category-form').reset();
    document.getElementById('edit-category-index').value = '';
    document.getElementById('category-submit-btn').textContent = '+';
    document.getElementById('cancel-category-edit').classList.add('hidden');
}

window.cancelCategoryEdit = cancelCategoryEdit;

function updateCategorySelects() {
    const selects = [document.getElementById('expense-category'), document.getElementById('edit-expense-category')];

    selects.forEach(select => {
        if (!select) return;
        const currentVal = select.value;
        select.innerHTML = appState.expenseCategories.map(cat =>
            `<option value="${cat.name}">${cat.emoji} ${cat.name}</option>`
        ).join('');

        if (appState.expenseCategories.find(c => c.name === currentVal)) {
            select.value = currentVal;
        }
    });
}

function deleteExpenseCategory(index) {
    if (appState.expenseCategories.length <= 1) {
        alert("Debes tener al menos una categoría.");
        return;
    }
    appState.expenseCategories.splice(index, 1);
    saveCategories();
    renderCategoryManager();
    updateCategorySelects();
    calculateExpenseStats(); // Refresh charts
}

function saveCategories() {
    localStorage.setItem('agenda_expense_categories', JSON.stringify(appState.expenseCategories));
}

window.deleteExpenseCategory = deleteExpenseCategory;

// Hook up the form
// End of App Logic

function parseAndCalculateNutrition() {
    let totalP = 0, totalC = 0, totalF = 0;

    currentRecipeIngredients.forEach(line => {
        const lowerLine = line.toLowerCase();
        // Try to find a quantity (g or units)
        const qtyMatch = lowerLine.match(/(\d+)\s*(g|gr|gramos|unidad|uds|unidades)?/i);
        let amount = qtyMatch ? parseInt(qtyMatch[1]) : 100; // default 100g if no number found
        let unit = qtyMatch && qtyMatch[2] ? qtyMatch[2].toLowerCase() : 'g';

        // Check for keywords in NUTRITION_DB
        for (let food in NUTRITION_DB) {
            if (lowerLine.includes(food)) {
                const data = NUTRITION_DB[food];

                if (data.isUnit && (unit.includes('u') || !qtyMatch)) {
                    // It's a unit-based calculation
                    totalP += (data.p * amount);
                    totalC += (data.c * amount);
                    totalF += (data.f * amount);
                } else {
                    // It's a gram-based calculation (scaled to 100g)
                    const factor = amount / 100;
                    totalP += (data.p * factor);
                    totalC += (data.c * factor);
                    totalF += (data.f * factor);
                }
                break; // Stop at first match for this line
            }
        }
    });

    // Update UI
    document.getElementById('recipe-protein').value = Math.round(totalP);
    document.getElementById('recipe-carbs').value = Math.round(totalC);
    document.getElementById('recipe-fats').value = Math.round(totalF);
}

// End of App Logic
