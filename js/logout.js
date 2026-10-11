import { auth, signOut } from "./firebase-config.js";

/**
 * Global logout helper using Firebase authentication
 */
export async function logout() {
    if (confirm("Are you sure you want to logout?")) {
        try {
            await signOut(auth);
            window.location.href = "login.html";
        } catch (error) {
            console.error("Logout failed:", error);
        }
    }
}

// Attach to window for legacy support if needed
window.logout = logout;