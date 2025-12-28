// Authentication Management System
// This uses localStorage for client-side authentication (suitable for development/demo)

const AUTH_STORAGE_KEY = 'nuwahub_auth';
const USERS_STORAGE_KEY = 'nuwahub_users';

// Initialize default users if not exists
function initializeStorage() {
    if (!localStorage.getItem(USERS_STORAGE_KEY)) {
        const defaultUsers = [
            {
                id: 1,
                name: 'محمد علي',
                email: 'student@example.com',
                password: 'password123',
                userType: 'student',
                joinDate: new Date('2024-01-15').toISOString(),
                notifications: true,
                privacy: 'public',
                lastPasswordChange: null
            },
            {
                id: 2,
                name: 'د. فاطمة محمد',
                email: 'professor@example.com',
                password: 'password123',
                userType: 'professor',
                joinDate: new Date('2023-09-01').toISOString(),
                notifications: true,
                privacy: 'public',
                lastPasswordChange: null
            }
        ];
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(defaultUsers));
    }
}

// Get all users
function getAllUsers() {
    initializeStorage();
    return JSON.parse(localStorage.getItem(USERS_STORAGE_KEY)) || [];
}

// Find user by email
function findUserByEmail(email) {
    const users = getAllUsers();
    return users.find(u => u.email === email);
}

// Register a new user
function registerUser(name, email, userType, password) {
    const users = getAllUsers();

    // Check if email already exists
    if (findUserByEmail(email)) {
        return {
            success: false,
            message: 'هذا البريد الإلكتروني مسجل بالفعل'
        };
    }

    const newUser = {
        id: Date.now(),
        name: name,
        email: email,
        password: password, // In production, this should be hashed!
        userType: userType,
        joinDate: new Date().toISOString(),
        notifications: true,
        privacy: 'public',
        lastPasswordChange: null
    };

    users.push(newUser);
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

    return {
        success: true,
        message: 'تم التسجيل بنجاح',
        user: newUser
    };
}

// Login user
function loginUser(email, password, rememberMe = false) {
    const user = findUserByEmail(email);

    if (!user) {
        return {
            success: false,
            message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
        };
    }

    if (user.password !== password) {
        return {
            success: false,
            message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
        };
    }

    // Store authentication data
    const authData = {
        userId: user.id,
        email: user.email,
        loginTime: new Date().toISOString(),
        rememberMe: rememberMe
    };

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));

    return {
        success: true,
        message: 'تم تسجيل الدخول بنجاح',
        user: user
    };
}

// Get current logged-in user
function getCurrentUser() {
    const authData = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!authData) {
        return null;
    }

    try {
        const auth = JSON.parse(authData);
        const users = getAllUsers();
        const user = users.find(u => u.id === auth.userId);
        return user || null;
    } catch (e) {
        return null;
    }
}

// Logout user
function logoutUser() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    window.location.href = 'login.html';
}

// Confirm logout (called from modal)
function confirmLogout() {
    logoutUser();
}

// Update user data
function updateUserData(updatedUser) {
    const users = getAllUsers();
    const index = users.findIndex(u => u.id === updatedUser.id);

    if (index !== -1) {
        users[index] = updatedUser;
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
        
        // Update auth if it's the current user
        const currentUser = getCurrentUser();
        if (currentUser && currentUser.id === updatedUser.id) {
            const authData = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY));
            authData.loginTime = new Date().toISOString();
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
        }

        return true;
    }
    return false;
}

// Check if user is authenticated
function isAuthenticated() {
    return getCurrentUser() !== null;
}

// Redirect to login if not authenticated
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
    }
}

// Get authentication token (useful for API calls in future)
function getAuthToken() {
    const authData = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!authData) return null;
    return JSON.parse(authData);
}

// Initialize storage on page load
initializeStorage();
