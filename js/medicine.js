import { auth, db, collection, addDoc, getDocs, getDoc, updateDoc, deleteDoc, doc, query, where, onAuthStateChanged } from "./firebase-config.js";
import { validateMedicineForm } from "./validation.js";

// DOM references
const medicineForm = document.getElementById("medicineForm");
const medicineTable = document.getElementById("medicineTable");

// Modal elements
const editModal = document.getElementById("editModal");
const editForm = document.getElementById("editMedicineForm");
const closeModalBtn = document.getElementById("closeModalBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

let currentUserId = null;

// Auth state check
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserId = user.uid;
        if (medicineTable) {
            loadMedicines(user.uid);
        }
    }
});

// ==========================================
// ADD MEDICINE HANDLER
// ==========================================
if (medicineForm) {
    medicineForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (!currentUserId) {
            window.showToast("You must be logged in to add medicines", "error");
            return;
        }

        const name = document.getElementById("medicineName").value.trim();
        const dosage = document.getElementById("dosage").value.trim();
        const frequency = document.getElementById("frequency").value;
        const time = document.getElementById("time").value;
        const startDate = document.getElementById("startDate").value;
        const endDate = document.getElementById("endDate").value;
        const food = document.getElementById("food").value;
        const notes = document.getElementById("notes").value.trim();

        // Validation
        const validationResult = validateMedicineForm(name, dosage, frequency, time, startDate, endDate, food);
        if (!validationResult.isValid) {
            // Find first error and show it
            const firstErrorMsg = Object.values(validationResult.errors)[0];
            window.showToast(firstErrorMsg, "warning");
            return;
        }

        window.showLoading("Saving medication...");
        try {
            await addDoc(collection(db, "medicines"), {
                userId: currentUserId,
                medicineName: name,
                dosage: dosage,
                frequency: frequency,
                reminderTime: time,
                startDate: startDate,
                endDate: endDate,
                foodType: food,
                notes: notes,
                status: "Pending", // Default initial status
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            window.showToast("Medicine added successfully!", "success");
            medicineForm.reset();
            
            setTimeout(() => {
                window.location.href = "medicine-list.html";
            }, 1000);

        } catch (error) {
            console.error("Error saving medicine:", error);
            window.showToast("Failed to save medicine: " + error.message, "error");
        } finally {
            window.hideLoading();
        }
    });
}

// ==========================================
// LIST MEDICINES HANDLER
// ==========================================
async function loadMedicines(uid) {
    if (!medicineTable) return;

    window.showLoading("Fetching medicines...");
    try {
        const q = query(collection(db, "medicines"), where("userId", "==", uid));
        const querySnapshot = await getDocs(q);

        medicineTable.innerHTML = "";

        if (querySnapshot.size === 0) {
            medicineTable.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <div class="empty-state-icon">💊</div>
                        <h3>No Medications Added</h3>
                        <p>Keep track of your dosages by adding your first medicine.</p>
                        <a href="add-medicine.html" class="btn btn-primary">Add Medicine</a>
                    </td>
                </tr>
            `;
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const med = docSnap.data();
            const id = docSnap.id;

            // Format dates
            const startStr = formatDate(med.startDate);
            const endStr = formatDate(med.endDate);

            // Determine status class
            let statusClass = "pending";
            if (med.status === "Taken") statusClass = "taken";
            if (med.status === "Missed") statusClass = "missed";

            medicineTable.innerHTML += `
                <tr>
                    <td style="font-weight: 600;">${med.medicineName}</td>
                    <td>${med.dosage}</td>
                    <td>${med.frequency}</td>
                    <td style="font-weight: 500; color: var(--primary);">${med.reminderTime}</td>
                    <td style="font-size:12px; color: var(--text-muted);">${startStr} to ${endStr}</td>
                    <td>${med.foodType}</td>
                    <td><span class="status-pill ${statusClass}">${med.status || 'Pending'}</span></td>
                    <td class="actions-cell">
                        <button class="btn-icon btn-edit" data-id="${id}">
                            ✏️ Edit
                        </button>
                        <button class="btn-icon btn-delete" data-id="${id}">
                            🗑️ Delete
                        </button>
                    </td>
                </tr>
            `;
        });

        // Set up event listeners for table buttons dynamically
        setupTableEventListeners();

    } catch (error) {
        console.error("Error loading medicines:", error);
        window.showToast("Failed to retrieve medicines list", "error");
        medicineTable.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; color: var(--danger); padding: 40px;">
                    ⚠️ Error loading medicines. Please try again.
                </td>
            </tr>
        `;
    } finally {
        window.hideLoading();
    }
}

function setupTableEventListeners() {
    // Edit buttons
    document.querySelectorAll(".btn-edit").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = btn.getAttribute("data-id");
            openEditModal(id);
        });
    });

    // Delete buttons
    document.querySelectorAll(".btn-delete").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = btn.getAttribute("data-id");
            deleteMedicineItem(id);
        });
    });
}

// Format date helper
function formatDate(dateStr) {
    if (!dateStr) return "";
    const options = { month: 'short', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString(undefined, options);
}

// ==========================================
// DELETE MEDICINE ITEM
// ==========================================
async function deleteMedicineItem(id) {
    if (!confirm("Are you sure you want to delete this medication? This action cannot be undone.")) {
        return;
    }

    window.showLoading("Deleting medication...");
    try {
        await deleteDoc(doc(db, "medicines", id));
        window.showToast("Medication deleted successfully", "success");
        if (currentUserId) {
            await loadMedicines(currentUserId);
        }
    } catch (error) {
        console.error("Error deleting medicine:", error);
        window.showToast("Failed to delete medicine: " + error.message, "error");
    } finally {
        window.hideLoading();
    }
}

// ==========================================
// EDIT MODAL / UPDATE MEDICINE HANDLERS
// ==========================================
async function openEditModal(id) {
    if (!editModal) return;

    window.showLoading("Loading details...");
    try {
        const docSnap = await getDoc(doc(db, "medicines", id));
        if (docSnap.exists()) {
            const med = docSnap.data();

            document.getElementById("editMedId").value = id;
            document.getElementById("editMedicineName").value = med.medicineName || "";
            document.getElementById("editDosage").value = med.dosage || "";
            document.getElementById("editFrequency").value = med.frequency || "Daily";
            document.getElementById("editTime").value = med.reminderTime || "";
            document.getElementById("editStartDate").value = med.startDate || "";
            document.getElementById("editEndDate").value = med.endDate || "";
            document.getElementById("editFood").value = med.foodType || "Before Food";
            document.getElementById("editNotes").value = med.notes || "";

            editModal.classList.add("active");
        } else {
            window.showToast("Medication data not found", "error");
        }
    } catch (error) {
        console.error("Error fetching details for edit:", error);
        window.showToast("Failed to fetch medication details", "error");
    } finally {
        window.hideLoading();
    }
}

function closeEditModal() {
    if (editModal) {
        editModal.classList.remove("active");
    }
}

// Modal event listeners
if (closeModalBtn) closeModalBtn.addEventListener("click", closeEditModal);
if (cancelEditBtn) cancelEditBtn.addEventListener("click", closeEditModal);

if (editForm) {
    editForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const id = document.getElementById("editMedId").value;
        const name = document.getElementById("editMedicineName").value.trim();
        const dosage = document.getElementById("editDosage").value.trim();
        const frequency = document.getElementById("editFrequency").value;
        const time = document.getElementById("editTime").value;
        const startDate = document.getElementById("editStartDate").value;
        const endDate = document.getElementById("editEndDate").value;
        const food = document.getElementById("editFood").value;
        const notes = document.getElementById("editNotes").value.trim();

        // Validate
        const validationResult = validateMedicineForm(name, dosage, frequency, time, startDate, endDate, food);
        if (!validationResult.isValid) {
            const firstErrorMsg = Object.values(validationResult.errors)[0];
            window.showToast(firstErrorMsg, "warning");
            return;
        }

        window.showLoading("Saving changes...");
        try {
            const medDocRef = doc(db, "medicines", id);

            // Fetch to preserve createdAt and status
            const existingDoc = await getDoc(medDocRef);
            const existingData = existingDoc.exists() ? existingDoc.data() : {};

            await updateDoc(medDocRef, {
                ...existingData,
                medicineName: name,
                dosage: dosage,
                frequency: frequency,
                reminderTime: time,
                startDate: startDate,
                endDate: endDate,
                foodType: food,
                notes: notes,
                updatedAt: new Date().toISOString()
            });

            window.showToast("Medication updated successfully", "success");
            closeEditModal();
            if (currentUserId) {
                await loadMedicines(currentUserId);
            }
        } catch (error) {
            console.error("Error updating medicine:", error);
            window.showToast("Failed to update medication: " + error.message, "error");
        } finally {
            window.hideLoading();
        }
    });
}

// Export functions for reference if needed
export { loadMedicines, deleteMedicineItem, openEditModal };