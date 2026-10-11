import { auth, db, collection, getDocs, getDoc, setDoc, addDoc, doc, query, where, onAuthStateChanged } from "./firebase-config.js";

// DOM references
const welcomeUser = document.getElementById("welcomeUser");
const currentDateDisplay = document.getElementById("currentDateDisplay");
const todayMedsList = document.getElementById("todayMedsList");

// Stats references
const activeMedsCount = document.getElementById("activeMedsCount");
const takenTodayCount = document.getElementById("takenTodayCount");
const missedTodayCount = document.getElementById("missedTodayCount");
const totalMedsCount = document.getElementById("totalMedsCount");

let currentUserId = null;

// Set Current Date Display
if (currentDateDisplay) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    currentDateDisplay.textContent = new Date().toLocaleDateString(undefined, options);
}

// Auth State Changes
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUserId = user.uid;
        
        // Load User Name
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                const data = userDoc.data();
                welcomeUser.textContent = `Welcome, ${data.name || 'User'} 👋`;
            }
        } catch (err) {
            console.error("Error greeting user:", err);
        }

        // Initialize Stats and Lists
        await refreshDashboard();
    }
});

// Refresh Dashboard Stats and Lists
async function refreshDashboard() {
    if (!currentUserId) return;

    window.showLoading("Updating dashboard stats...");
    try {
        const todayStr = getTodayDateString();

        // 1. Fetch user's medicines
        const medQuery = query(collection(db, "medicines"), where("userId", "==", currentUserId));
        const medSnapshot = await getDocs(medQuery);

        // 2. Fetch user's history for today
        const historyQuery = query(
            collection(db, "history"), 
            where("userId", "==", currentUserId),
            where("date", "==", todayStr)
        );
        const historySnapshot = await getDocs(historyQuery);

        // Map today's history records by medicine ID
        const todayHistoryMap = {};
        let takenToday = 0;
        let missedToday = 0;

        historySnapshot.forEach((docSnap) => {
            const hist = docSnap.data();
            todayHistoryMap[hist.medicineId] = {
                id: docSnap.id,
                ...hist
            };
            if (hist.status === "Taken") takenToday++;
            if (hist.status === "Missed") missedToday++;
        });

        // 3. Process medicine stats
        let totalMeds = medSnapshot.size;
        let activeMeds = 0;
        const todayDate = new Date(todayStr);

        const scheduledMedsToday = [];

        medSnapshot.forEach((docSnap) => {
            const med = docSnap.data();
            const id = docSnap.id;

            const start = new Date(med.startDate);
            const end = new Date(med.endDate);

            // Active medicine count check
            if (todayDate >= start && todayDate <= end) {
                activeMeds++;
                
                // Collect medicines scheduled for today
                // Check if they are daily or fit frequency (in this case, active is scheduled)
                scheduledMedsToday.push({
                    id,
                    ...med
                });
            }
        });

        // 4. Update Stats in DOM
        if (totalMedsCount) totalMedsCount.textContent = totalMeds;
        if (activeMedsCount) activeMedsCount.textContent = activeMeds;
        if (takenTodayCount) takenTodayCount.textContent = takenToday;
        if (missedTodayCount) missedTodayCount.textContent = missedToday;

        // 5. Render today's list
        renderTodayMeds(scheduledMedsToday, todayHistoryMap);

    } catch (error) {
        console.error("Error refreshing dashboard:", error);
        window.showToast("Failed to refresh dashboard data", "error");
    } finally {
        window.hideLoading();
    }
}

// Render Today's Medicine List
function renderTodayMeds(medicines, historyMap) {
    if (!todayMedsList) return;

    if (medicines.length === 0) {
        todayMedsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🎉</div>
                <h3>No Medications Scheduled Today</h3>
                <p>Enjoy your day! You have no active medicine schedules today.</p>
            </div>
        `;
        return;
    }

    todayMedsList.innerHTML = "";

    medicines.forEach((med) => {
        const historyRecord = historyMap[med.id];
        
        // Decide display status & action buttons
        let statusText = "Pending";
        let statusClass = "pending";
        let showButtons = true;

        if (historyRecord) {
            statusText = historyRecord.status;
            statusClass = historyRecord.status.toLowerCase();
            showButtons = false;
        }

        const foodText = med.foodType ? ` • ${med.foodType}` : "";

        let actionButtonsHTML = "";
        if (showButtons) {
            actionButtonsHTML = `
                <div class="med-actions">
                    <button class="btn-action btn-take" data-id="${med.id}" data-name="${med.medicineName}" data-dosage="${med.dosage}" data-time="${med.reminderTime}">Take</button>
                    <button class="btn-action btn-miss" data-id="${med.id}" data-name="${med.medicineName}" data-dosage="${med.dosage}" data-time="${med.reminderTime}">Miss</button>
                </div>
            `;
        } else {
            actionButtonsHTML = `<span class="status-pill ${statusClass}">${statusText}</span>`;
        }

        todayMedsList.innerHTML += `
            <div class="med-item">
                <div class="med-details">
                    <div class="med-icon">💊</div>
                    <div class="med-info">
                        <h3>${med.medicineName}</h3>
                        <div class="med-meta">
                            <span class="med-time">⏰ ${med.reminderTime}</span>
                            <span class="med-dosage">⚖️ ${med.dosage}</span>
                            <span class="med-food">${foodText}</span>
                        </div>
                    </div>
                </div>
                ${actionButtonsHTML}
            </div>
        `;
    });

    setupListActionListeners();
}

function setupListActionListeners() {
    document.querySelectorAll(".btn-take").forEach(btn => {
        btn.addEventListener("click", () => {
            const medId = btn.getAttribute("data-id");
            const name = btn.getAttribute("data-name");
            const dosage = btn.getAttribute("data-dosage");
            const time = btn.getAttribute("data-time");
            logMedicationStatus(medId, name, dosage, time, "Taken");
        });
    });

    document.querySelectorAll(".btn-miss").forEach(btn => {
        btn.addEventListener("click", () => {
            const medId = btn.getAttribute("data-id");
            const name = btn.getAttribute("data-name");
            const dosage = btn.getAttribute("data-dosage");
            const time = btn.getAttribute("data-time");
            logMedicationStatus(medId, name, dosage, time, "Missed");
        });
    });
}

// Log status to history and update medicine status in database
async function logMedicationStatus(medId, name, dosage, time, status) {
    if (!currentUserId) return;

    window.showLoading(`Logging as ${status}...`);
    try {
        const todayStr = getTodayDateString();

        // 1. Add log to history collection
        await addDoc(collection(db, "history"), {
            userId: currentUserId,
            medicineId: medId,
            medicineName: name,
            dosage: dosage,
            date: todayStr,
            reminderTime: time,
            status: status,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        // 2. Update the current status of the medicine document itself
        const medDocRef = doc(db, "medicines", medId);
        const medDocSnap = await getDoc(medDocRef);
        if (medDocSnap.exists()) {
            await setDoc(medDocRef, {
                ...medDocSnap.data(),
                status: status,
                updatedAt: new Date().toISOString()
            });
        }

        window.showToast(`Medication logged as ${status}`, "success");
        await refreshDashboard();

    } catch (error) {
        console.error("Error logging status:", error);
        window.showToast("Failed to update status: " + error.message, "error");
    } finally {
        window.hideLoading();
    }
}

// Utility to get today's date in local YYYY-MM-DD
function getTodayDateString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}