// Firebase SDK Imports (Real SDK)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword as realCreateUser,
    signInWithEmailAndPassword as realSignIn,
    signOut as realSignOut,
    onAuthStateChanged as realOnAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getFirestore,
    doc as realDoc,
    setDoc as realSetDoc,
    getDoc as realGetDoc,
    addDoc as realAddDoc,
    updateDoc as realUpdateDoc,
    deleteDoc as realDeleteDoc,
    collection as realCollection,
    query as realQuery,
    where as realWhere,
    orderBy as realOrderBy,
    getDocs as realGetDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Replace with YOUR Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyCgfZSFDzXtQOeLzxVAjQWstq5SEhZut1Q",
    authDomain: "medicine-remainder-1e60c.firebaseapp.com",
    projectId: "medicine-remainder-1e60c",
    storageBucket: "medicine-remainder-1e60c.firebasestorage.app",
    messagingSenderId: "738490986377",
    appId: "1:738490986377:web:c368fcd76025d39330bb58"
};

// Check if credentials are placeholders
const isSimulationMode = !firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith("YOUR_");

let authInstance;
let dbInstance;

if (!isSimulationMode) {
    try {
        const app = initializeApp(firebaseConfig);
        authInstance = getAuth(app);
        dbInstance = getFirestore(app);
        console.log("MediTrack: Running in Cloud Firebase Mode");
    } catch (e) {
        console.error("MediTrack: Firebase initialization failed, falling back to Simulation Mode", e);
    }
}

// ----------------------------------------------------
// SIMULATION MODE IMPLEMENTATION
// ----------------------------------------------------
const MOCK_DB_KEY = "meditrack_mock_db";
const MOCK_AUTH_KEY = "meditrack_mock_auth";

// Helper to get/set mock DB
const getMockDB = () => JSON.parse(localStorage.getItem(MOCK_DB_KEY)) || {};
const saveMockDB = (data) => localStorage.setItem(MOCK_DB_KEY, JSON.stringify(data));

class MockAuth {
    constructor() {
        this.listeners = [];
        this.currentUser = JSON.parse(localStorage.getItem(MOCK_AUTH_KEY)) || null;
    }

    onAuthStateChanged(callback) {
        this.listeners.push(callback);
        // Call immediately with current state
        setTimeout(() => callback(this.currentUser), 0);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    setCurrentUser(user) {
        this.currentUser = user;
        if (user) {
            localStorage.setItem(MOCK_AUTH_KEY, JSON.stringify(user));
        } else {
            localStorage.removeItem(MOCK_AUTH_KEY);
        }
        this.listeners.forEach(callback => callback(this.currentUser));
    }

    signOut() {
        this.setCurrentUser(null);
        return Promise.resolve();
    }
}

const mockAuthInstance = new MockAuth();

// Wrapper functions that check simulation flag
export const auth = isSimulationMode ? mockAuthInstance : authInstance;
export const db = isSimulationMode ? {} : dbInstance;
export { isSimulationMode };

// AUTH FUNCTIONS
export async function createUserWithEmailAndPassword(authObj, email, password) {
    if (isSimulationMode) {
        const dbData = getMockDB();
        const users = dbData.users || {};

        // Check if email exists
        const exists = Object.values(users).some(u => u.email.toLowerCase() === email.toLowerCase());
        if (exists) {
            throw new Error("auth/email-already-in-use: The email address is already in use by another account.");
        }

        const uid = "mock_uid_" + Math.random().toString(36).substring(2, 9);
        const newUser = { uid, email };
        mockAuthInstance.setCurrentUser(newUser);
        return { user: newUser };
    }
    return realCreateUser(auth, email, password);
}

export async function signInWithEmailAndPassword(authObj, email, password) {
    if (isSimulationMode) {
        const dbData = getMockDB();
        const users = dbData.users || {};

        // Find user by email
        const userEntry = Object.entries(users).find(([uid, u]) => u.email.toLowerCase() === email.toLowerCase());
        if (!userEntry) {
            throw new Error("auth/user-not-found: There is no user record corresponding to this identifier.");
        }

        const [uid, userProfile] = userEntry;
        // In simulation mode, accept any password >= 6 chars for convenience
        if (password.length < 6) {
            throw new Error("auth/wrong-password: Password is invalid.");
        }

        const user = { uid, email };
        mockAuthInstance.setCurrentUser(user);
        return { user };
    }
    return realSignIn(auth, email, password);
}

export async function signOut(authObj) {
    if (isSimulationMode) {
        return mockAuthInstance.signOut();
    }
    return realSignOut(auth);
}

export function onAuthStateChanged(authObj, callback) {
    if (isSimulationMode) {
        return mockAuthInstance.onAuthStateChanged(callback);
    }
    return realOnAuthStateChanged(auth, callback);
}

// FIRESTORE FUNCTIONS
export function doc(dbObj, collectionPath, docId) {
    if (isSimulationMode) {
        return { type: "doc", path: `${collectionPath}/${docId}`, collection: collectionPath, id: docId };
    }
    return realDoc(db, collectionPath, docId);
}

export function collection(dbObj, collectionPath) {
    if (isSimulationMode) {
        return { type: "collection", path: collectionPath };
    }
    return realCollection(db, collectionPath);
}

export async function setDoc(docRef, data) {
    if (isSimulationMode) {
        const dbData = getMockDB();

        // Parse collection and id
        const pathParts = docRef.path.split("/");
        const collectionName = pathParts[0];
        const docId = pathParts[1];

        if (!dbData[collectionName]) {
            dbData[collectionName] = {};
        }

        // Merge with existing document if any
        dbData[collectionName][docId] = {
            ...dbData[collectionName][docId],
            ...data
        };

        saveMockDB(dbData);
        return Promise.resolve();
    }
    return realSetDoc(docRef, data);
}

export async function updateDoc(docRef, data) {
    if (isSimulationMode) {
        return setDoc(docRef, data); // setDoc merges in our mock implementation
    }
    return realUpdateDoc(docRef, data);
}

export async function getDoc(docRef) {
    if (isSimulationMode) {
        const dbData = getMockDB();
        const pathParts = docRef.path.split("/");
        const collectionName = pathParts[0];
        const docId = pathParts[1];

        const docData = dbData[collectionName] ? dbData[collectionName][docId] : null;

        return {
            exists: () => !!docData,
            id: docId,
            data: () => docData
        };
    }
    return realGetDoc(docRef);
}

export async function addDoc(colRef, data) {
    if (isSimulationMode) {
        const docId = "mock_doc_" + Math.random().toString(36).substring(2, 9);
        const docRef = doc(null, colRef.path, docId);
        await setDoc(docRef, data);
        return { id: docId };
    }
    return realAddDoc(colRef, data);
}

export function query(colRef, ...queryConstraints) {
    if (isSimulationMode) {
        return { type: "query", colRef, constraints: queryConstraints };
    }
    return realQuery(colRef, ...queryConstraints);
}

export function where(field, operator, value) {
    if (isSimulationMode) {
        return { type: "where", field, operator, value };
    }
    return realWhere(field, operator, value);
}

export function orderBy(field, direction = "asc") {
    if (isSimulationMode) {
        return { type: "orderBy", field, direction };
    }
    return realOrderBy(field, direction);
}

export async function getDocs(queryRef) {
    if (isSimulationMode) {
        const dbData = getMockDB();

        // Find collection name from query or collection
        const isQuery = queryRef.type === "query";
        const collectionName = isQuery ? queryRef.colRef.path : queryRef.path;

        const collectionData = dbData[collectionName] || {};
        let docs = Object.entries(collectionData).map(([id, data]) => ({
            id,
            data: () => data
        }));

        // Filter and sort if it is a query
        if (isQuery && queryRef.constraints) {
            for (const constraint of queryRef.constraints) {
                if (constraint.type === "where") {
                    const { field, operator, value } = constraint;
                    docs = docs.filter(docObj => {
                        const docVal = docObj.data()[field];
                        if (operator === "==") return docVal === value;
                        if (operator === "!=") return docVal !== value;
                        if (operator === ">") return docVal > value;
                        if (operator === "<") return docVal < value;
                        if (operator === ">=") return docVal >= value;
                        if (operator === "<=") return docVal <= value;
                        return true;
                    });
                }
                // Order by constraint
                if (constraint.type === "orderBy") {
                    const { field, direction } = constraint;
                    docs.sort((a, b) => {
                        const valA = a.data()[field];
                        const valB = b.data()[field];
                        if (valA === undefined || valB === undefined) return 0;
                        if (valA < valB) return direction === "asc" ? -1 : 1;
                        if (valA > valB) return direction === "asc" ? 1 : -1;
                        return 0;
                    });
                }
            }
        }

        return {
            docs,
            size: docs.length,
            forEach: (callback) => docs.forEach(callback)
        };
    }
    return realGetDocs(queryRef);
}

export async function deleteDoc(docRef) {
    if (isSimulationMode) {
        const dbData = getMockDB();
        const pathParts = docRef.path.split("/");
        const collectionName = pathParts[0];
        const docId = pathParts[1];

        if (dbData[collectionName] && dbData[collectionName][docId]) {
            delete dbData[collectionName][docId];
            saveMockDB(dbData);
        }
        return Promise.resolve();
    }
    return realDeleteDoc(docRef);
}