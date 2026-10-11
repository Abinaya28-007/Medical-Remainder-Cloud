import { auth, signOut, onAuthStateChanged, isSimulationMode, db, doc, getDoc } from "./firebase-config.js";

// Helper to identify pages
const path = window.location.pathname;
const currentPage = path.split("/").pop() || "index.html";

const PUBLIC_PAGES = ["index.html", ""];
const AUTH_PAGES = ["login.html", "register.html"];
const PROTECTED_PAGES = ["dashboard.html", "add-medicine.html", "medicine-list.html", "history.html", "profile.html"];

// Core loaders
document.addEventListener("DOMContentLoaded", () => {
    // Inject loading overlay and toast container
    injectOverlayAndToasts();
    
    // Inject Banner if in Simulation Mode
    if (isSimulationMode) {
        injectSimulationBanner();
    }

    // Monitor Authentication State
    onAuthStateChanged(auth, async (user) => {
        const isAuth = !!user;
        
        // Redirect logic
        if (PROTECTED_PAGES.includes(currentPage)) {
            if (!isAuth) {
                window.location.href = "login.html";
                return;
            }
        } else if (AUTH_PAGES.includes(currentPage)) {
            if (isAuth) {
                window.location.href = "dashboard.html";
                return;
            }
        }

        // Fetch User Details to customize Nav
        let userName = "User";
        if (isAuth) {
            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    userName = userDoc.data().name || "User";
                }
            } catch (err) {
                console.error("Error fetching user profile for nav:", err);
            }
        }

        // Inject Nav and Footer based on auth state
        injectHeader(isAuth, userName);
        injectFooter();
        setupMobileMenu();
    });
});

// Injection Functions
function injectOverlayAndToasts() {
    // Loading overlay
    if (!document.getElementById("loadingOverlay")) {
        const overlay = document.createElement("div");
        overlay.id = "loadingOverlay";
        overlay.className = "loading-overlay";
        overlay.innerHTML = `
            <div class="spinner"></div>
            <div class="loading-text" id="loadingText">Please wait...</div>
        `;
        document.body.appendChild(overlay);
    }

    // Toast Container
    if (!document.getElementById("toastContainer")) {
        const container = document.createElement("div");
        container.id = "toastContainer";
        container.className = "toast-container";
        document.body.appendChild(container);
    }
}

function injectSimulationBanner() {
    if (!document.getElementById("simBanner")) {
        const banner = document.createElement("div");
        banner.id = "simBanner";
        banner.className = "sim-mode-banner";
        banner.innerHTML = `
            <span>⚠️ Running in <strong>Firebase Simulation Mode</strong>. Data is stored locally. Edit <code>js/firebase-config.js</code> to link real Firebase.</span>
        `;
        document.body.insertBefore(banner, document.body.firstChild);
    }
}

function injectHeader(isAuth, userName) {
    const existingHeader = document.querySelector("header");
    if (!existingHeader) return;

    let navHTML = "";
    if (isAuth) {
        navHTML = `
            <a href="dashboard.html" class="${currentPage === 'dashboard.html' ? 'active' : ''}">Dashboard</a>
            <a href="medicine-list.html" class="${currentPage === 'medicine-list.html' ? 'active' : ''}">Medicines</a>
            <a href="add-medicine.html" class="${currentPage === 'add-medicine.html' ? 'active' : ''}">Add Medicine</a>
            <a href="history.html" class="${currentPage === 'history.html' ? 'active' : ''}">History</a>
            <a href="profile.html" class="${currentPage === 'profile.html' ? 'active' : ''}">Profile</a>
            <div class="nav-user">
                <span class="nav-user-name">👤 ${userName}</span>
                <button id="logoutBtn">Logout</button>
            </div>
        `;
    } else {
        navHTML = `
            <a href="index.html" class="${currentPage === 'index.html' || currentPage === '' ? 'active' : ''}">Home</a>
            <a href="login.html" class="${currentPage === 'login.html' ? 'active' : ''}">Login</a>
            <a href="register.html" class="${currentPage === 'register.html' ? 'active' : ''}">Register</a>
        `;
    }

    existingHeader.innerHTML = `
        <a href="index.html" class="logo">
            <span>💊</span> MediTrack
        </a>
        <button class="mobile-nav-toggle" id="mobileNavToggle" aria-label="Toggle Menu">☰</button>
        <nav id="navbar">
            ${navHTML}
        </nav>
    `;

    // Handle logout button
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            if (confirm("Are you sure you want to logout?")) {
                showLoading("Logging out...");
                try {
                    await signOut(auth);
                    showToast("Logged out successfully", "success");
                    window.location.href = "login.html";
                } catch (error) {
                    showToast("Logout failed: " + error.message, "error");
                } finally {
                    hideLoading();
                }
            }
        });
    }
}

function injectFooter() {
    const existingFooter = document.querySelector("footer");
    if (existingFooter) {
        existingFooter.innerHTML = `<p>&copy; ${new Date().getFullYear()} MediTrack. Built with ❤️ for absolute health security.</p>`;
    } else {
        const footer = document.createElement("footer");
        footer.innerHTML = `<p>&copy; ${new Date().getFullYear()} MediTrack. Built with ❤️ for absolute health security.</p>`;
        document.body.appendChild(footer);
    }
}

function setupMobileMenu() {
    const toggle = document.getElementById("mobileNavToggle");
    const navbar = document.getElementById("navbar");
    if (toggle && navbar) {
        toggle.addEventListener("click", () => {
            navbar.classList.toggle("active");
            toggle.textContent = navbar.classList.contains("active") ? "✕" : "☰";
        });
    }
}

// Global UI Helper Functions
export function showLoading(message = "Please wait...") {
    const overlay = document.getElementById("loadingOverlay");
    const text = document.getElementById("loadingText");
    if (overlay && text) {
        text.textContent = message;
        overlay.classList.add("active");
    }
}

export function hideLoading() {
    const overlay = document.getElementById("loadingOverlay");
    if (overlay) {
        overlay.classList.remove("active");
    }
}

export function showToast(message, type = "info") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
    let icon = "ℹ️";
    if (type === "success") icon = "✅";
    if (type === "error") icon = "❌";
    if (type === "warning") icon = "⚠️";

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    // Trigger transition
    setTimeout(() => toast.classList.add("show"), 10);

    // Remove toast after 4s
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Make them available globally on the window object
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.showToast = showToast;
