import { auth, db, collection, getDocs, query, where, orderBy, onAuthStateChanged } from "./firebase-config.js";

// DOM references
const historyTable = document.getElementById("historyTable");
const filterDate = document.getElementById("filterDate");
const clearDateBtn = document.getElementById("clearDateBtn");
const filterButtons = document.querySelectorAll(".filter-btn");

let currentUserId = null;
let currentFilterStatus = "All";
let currentFilterDate = "";
let allLogs = [];

// Listen to Auth
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserId = user.uid;
        loadHistory(user.uid);
    }
});

// Load History Logs from Firestore
async function loadHistory(uid) {
    if (!historyTable) return;

    window.showLoading("Fetching history logs...");
    try {
        // Query history items, ordered by createdAt descending
        const q = query(
            collection(db, "history"),
            where("userId", "==", uid),
            orderBy("createdAt", "desc")
        );
        
        const querySnapshot = await getDocs(q);
        
        allLogs = [];
        querySnapshot.forEach((docSnap) => {
            allLogs.push({
                id: docSnap.id,
                ...docSnap.data()
            });
        });

        renderLogs();

    } catch (error) {
        console.error("Error loading history:", error);
        window.showToast("Failed to load medication history", "error");
        historyTable.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: var(--danger); padding: 40px;">
                    ⚠️ Error loading logs. Please try again.
                </td>
            </tr>
        `;
    } finally {
        window.hideLoading();
    }
}

// Render filtered logs
function renderLogs() {
    if (!historyTable) return;

    // Filter logs
    let filteredLogs = allLogs;

    // Apply status filter
    if (currentFilterStatus !== "All") {
        filteredLogs = filteredLogs.filter(log => log.status === currentFilterStatus);
    }

    // Apply date filter
    if (currentFilterDate) {
        filteredLogs = filteredLogs.filter(log => log.date === currentFilterDate);
    }

    // Clear and draw table
    historyTable.innerHTML = "";

    if (filteredLogs.length === 0) {
        historyTable.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 40px;">
                    No medication history matches the selected filters.
                </td>
            </tr>
        `;
        return;
    }

    filteredLogs.forEach((log) => {
        // Format display date
        const displayDate = formatDisplayDate(log.date || log.createdAt);

        // Determine status display class
        let statusClass = "pending";
        if (log.status === "Taken") statusClass = "taken";
        if (log.status === "Missed") statusClass = "missed";

        historyTable.innerHTML += `
            <tr>
                <td style="font-weight: 500;">${displayDate}</td>
                <td style="font-weight: 600; color: #1e3a8a;">${log.medicineName}</td>
                <td>${log.dosage || 'N/A'}</td>
                <td style="font-weight: 500; color: var(--primary);">${log.reminderTime || 'N/A'}</td>
                <td>
                    <span class="status-cell ${statusClass}">
                        <span class="status-dot"></span>
                        ${log.status}
                    </span>
                </td>
            </tr>
        `;
    });
}

// Helpers
function formatDisplayDate(dateString) {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // Fallback if YYYY-MM-DD
    
    // Check if it's YYYY-MM-DD and manually parse to avoid timezone shift
    if (dateString.length === 10 && dateString.includes("-")) {
        const [year, month, day] = dateString.split("-");
        const localDate = new Date(year, month - 1, day);
        return localDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    }

    return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

// ==========================================
// FILTER LISTENERS
// ==========================================

// Tabs Filter
filterButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        // Remove active class
        filterButtons.forEach(b => b.classList.remove("active"));
        // Add active to current
        btn.classList.add("active");
        
        currentFilterStatus = btn.getAttribute("data-filter");
        renderLogs();
    });
});

// Date Filter
if (filterDate) {
    filterDate.addEventListener("input", (e) => {
        currentFilterDate = e.target.value;
        renderLogs();
    });
}

// Clear Date Filter
if (clearDateBtn) {
    clearDateBtn.addEventListener("click", () => {
        if (filterDate) filterDate.value = "";
        currentFilterDate = "";
        renderLogs();
    });
}