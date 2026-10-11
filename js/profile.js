import { auth, db, doc, getDoc, setDoc, collection, getDocs, query, where, onAuthStateChanged } from "./firebase-config.js";
import { validatePhone } from "./validation.js";

const profileForm = document.getElementById("profileForm");

let currentUserId = null;

// Listen to Auth State
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUserId = user.uid;
        await loadUserProfile(user);
        await loadProfileStats(user.uid);
    }
});

// Load Profile Data from Firestore
async function loadUserProfile(user) {
    window.showLoading("Loading your profile...");
    try {
        const userDocRef = doc(db, "users", user.uid);
        const userSnapshot = await getDoc(userDocRef);

        // Standard Email
        document.getElementById("userEmail").value = user.email;
        const emailDisplay = document.getElementById("displayProfileEmail");
        if (emailDisplay) emailDisplay.textContent = user.email;

        if (userSnapshot.exists()) {
            const data = userSnapshot.data();

            document.getElementById("userName").value = data.name || "";
            document.getElementById("phone").value = data.phone || "";
            document.getElementById("age").value = data.age || "";
            document.getElementById("gender").value = data.gender || "";

            // Summary card display
            const nameDisplay = document.getElementById("displayProfileName");
            if (nameDisplay) nameDisplay.textContent = data.name || "User";

            const avatarDisplay = document.getElementById("avatarDisplay");
            if (avatarDisplay && data.name) {
                avatarDisplay.textContent = data.name.charAt(0).toUpperCase();
            }

            // Joined date
            const joinedDateDisplay = document.getElementById("joinedDateDisplay");
            if (joinedDateDisplay && data.createdAt) {
                const joinedDate = new Date(data.createdAt);
                const options = { month: 'long', year: 'numeric' };
                joinedDateDisplay.textContent = "Member since " + joinedDate.toLocaleDateString(undefined, options);
            }
        } else {
            document.getElementById("userName").value = user.displayName || "";
            const nameDisplay = document.getElementById("displayProfileName");
            if (nameDisplay) nameDisplay.textContent = user.displayName || "User";
        }
    } catch (error) {
        console.error("Error loading user profile:", error);
        window.showToast("Failed to load profile details", "error");
    } finally {
        window.hideLoading();
    }
}

// Load sidebar stats (active meds count, taken today count)
async function loadProfileStats(uid) {
    try {
        const todayStr = getTodayDateString();

        // Count active medicines
        const medQuery = query(collection(db, "medicines"), where("userId", "==", uid));
        const medSnapshot = await getDocs(medQuery);

        let activeMeds = 0;
        const todayDate = new Date(todayStr);
        medSnapshot.forEach((docSnap) => {
            const med = docSnap.data();
            const start = new Date(med.startDate);
            const end = new Date(med.endDate);
            if (todayDate >= start && todayDate <= end) {
                activeMeds++;
            }
        });

        // Count taken today
        const historyQuery = query(
            collection(db, "history"),
            where("userId", "==", uid),
            where("date", "==", todayStr)
        );
        const historySnapshot = await getDocs(historyQuery);
        let takenToday = 0;
        historySnapshot.forEach((docSnap) => {
            if (docSnap.data().status === "Taken") takenToday++;
        });

        // Update DOM
        const statActive = document.getElementById("statActiveCount");
        const statTaken = document.getElementById("statTakenCount");
        if (statActive) statActive.textContent = activeMeds;
        if (statTaken) statTaken.textContent = takenToday;

    } catch (error) {
        console.error("Error loading profile stats:", error);
    }
}

// Update Profile
if (profileForm) {
    profileForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (!currentUserId) {
            window.showToast("You must be logged in to update your profile", "error");
            return;
        }

        const name = document.getElementById("userName").value.trim();
        const phone = document.getElementById("phone").value.trim();
        const age = document.getElementById("age").value.trim();
        const gender = document.getElementById("gender").value;

        // Validation
        if (!name) {
            window.showToast("Full Name is required", "warning");
            return;
        }

        if (phone && !validatePhone(phone)) {
            window.showToast("Please enter a valid phone number", "warning");
            return;
        }

        if (age && (isNaN(age) || parseInt(age) < 1 || parseInt(age) > 120)) {
            window.showToast("Please enter a valid age between 1 and 120", "warning");
            return;
        }

        window.showLoading("Saving changes...");
        try {
            const userDocRef = doc(db, "users", currentUserId);

            // Fetch existing document to preserve createdAt
            const existingDoc = await getDoc(userDocRef);
            const existingData = existingDoc.exists() ? existingDoc.data() : {};

            await setDoc(userDocRef, {
                ...existingData,
                name: name,
                phone: phone,
                age: age,
                gender: gender,
                updatedAt: new Date().toISOString()
            });

            // Update sidebar UI elements
            const nameDisplay = document.getElementById("displayProfileName");
            if (nameDisplay) nameDisplay.textContent = name;

            const avatarDisplay = document.getElementById("avatarDisplay");
            if (avatarDisplay) avatarDisplay.textContent = name.charAt(0).toUpperCase();

            window.showToast("Profile updated successfully!", "success");
        } catch (error) {
            console.error("Error updating profile:", error);
            window.showToast("Failed to update profile: " + error.message, "error");
        } finally {
            window.hideLoading();
        }
    });
}

// Utility
function getTodayDateString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}