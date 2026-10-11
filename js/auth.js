import { auth, db, createUserWithEmailAndPassword, signInWithEmailAndPassword, setDoc, doc } from "./firebase-config.js";
import { validateEmail, validatePassword } from "./validation.js";

// DOM elements
const registerForm = document.getElementById("registerForm");
const loginForm = document.getElementById("loginForm");

// Generic Inline Error Handler
function showInlineError(elementId, errorMsg) {
    const input = document.getElementById(elementId);
    if (!input) return;
    
    const group = input.closest(".form-group");
    if (!group) return;

    let errorElement = group.querySelector(".error-msg");
    if (!errorElement) {
        errorElement = document.createElement("div");
        errorElement.className = "error-msg";
        group.appendChild(errorElement);
    }

    errorElement.textContent = errorMsg;
    group.classList.add("has-error");
}

function clearErrors() {
    document.querySelectorAll(".form-group").forEach(group => {
        group.classList.remove("has-error");
        const err = group.querySelector(".error-msg");
        if (err) err.textContent = "";
    });
}

// Password Visibility Toggle setup
function setupPasswordToggle() {
    const toggles = document.querySelectorAll(".password-toggle");
    toggles.forEach(toggle => {
        toggle.addEventListener("click", () => {
            const inputId = toggle.getAttribute("data-target");
            const input = document.getElementById(inputId);
            if (input) {
                if (input.type === "password") {
                    input.type = "text";
                    toggle.textContent = "👁️";
                } else {
                    input.type = "password";
                    toggle.textContent = "👁️‍🗨️";
                }
            }
        });
    });
}

// Initialize Password Toggle on load
document.addEventListener("DOMContentLoaded", setupPasswordToggle);

// Register Flow
if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        clearErrors();

        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        let hasError = false;

        if (!name) {
            showInlineError("name", "Name is required");
            hasError = true;
        }

        if (!validateEmail(email)) {
            showInlineError("email", "Please enter a valid email address");
            hasError = true;
        }

        if (!validatePassword(password)) {
            showInlineError("password", "Password must be at least 6 characters long");
            hasError = true;
        }

        if (password !== confirmPassword) {
            showInlineError("confirmPassword", "Passwords do not match");
            hasError = true;
        }

        if (hasError) return;

        window.showLoading("Creating your account...");
        try {
            // Register with Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const uid = userCredential.user.uid;

            // Create profile document in Firestore (never store password)
            await setDoc(doc(db, "users", uid), {
                name: name,
                email: email,
                phone: "",
                age: "",
                gender: "",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            window.showToast("Account created successfully! Logging you in...", "success");
            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 1500);

        } catch (error) {
            console.error("Registration error:", error);
            if (error.code === "auth/email-already-in-use" || error.message.includes("email-already-in-use")) {
                showInlineError("email", "This email is already in use");
            } else {
                window.showToast(error.message, "error");
            }
        } finally {
            window.hideLoading();
        }
    });
}

// Login Flow
if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        clearErrors();

        const email = document.getElementById("loginEmail").value.trim();
        const password = document.getElementById("loginPassword").value;

        let hasError = false;

        if (!validateEmail(email)) {
            showInlineError("loginEmail", "Please enter a valid email address");
            hasError = true;
        }

        if (!password) {
            showInlineError("loginPassword", "Password is required");
            hasError = true;
        }

        if (hasError) return;

        window.showLoading("Authenticating...");
        try {
            await signInWithEmailAndPassword(auth, email, password);
            
            window.showToast("Welcome back! Redirecting...", "success");
            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 1000);

        } catch (error) {
            console.error("Login error:", error);
            if (error.code === "auth/user-not-found" || error.message.includes("user-not-found") ||
                error.code === "auth/wrong-password" || error.message.includes("wrong-password")) {
                window.showToast("Invalid email or password", "error");
            } else {
                window.showToast(error.message, "error");
            }
        } finally {
            window.hideLoading();
        }
    });
}