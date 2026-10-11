// Client-Side Validation Helpers

export function validateEmail(email) {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email);
}

export function validatePassword(password) {
    return password.length >= 6;
}

export function validatePhone(phone) {
    // Basic phone validation (allowing digits, spaces, dashes, parentheses, at least 7 digits)
    const pattern = /^[0-9\s\-()]{7,15}$/;
    return pattern.test(phone);
}

export function validateMedicineForm(name, dosage, frequency, time, startDate, endDate, food) {
    const errors = {};

    if (!name || name.trim() === "") {
        errors.name = "Medicine name is required.";
    }

    if (!dosage || dosage.trim() === "") {
        errors.dosage = "Dosage is required (e.g., 500mg).";
    }

    if (!frequency || frequency.trim() === "") {
        errors.frequency = "Frequency is required.";
    }

    if (!time) {
        errors.time = "Reminder time is required.";
    }

    if (!startDate) {
        errors.startDate = "Start date is required.";
    }

    if (!endDate) {
        errors.endDate = "End date is required.";
    }

    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end < start) {
            errors.endDate = "End date cannot be before start date.";
        }
    }

    if (!food) {
        errors.food = "Food preference is required.";
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
}