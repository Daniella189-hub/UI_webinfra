import {initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import{
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const form =document.getElementById("login-form");
const titleEl = document.getElementById("form-title");
const introEl = document.getElementById("form-intro");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const showPassword = document.getElementById("show-password");
const errorEl = document.getElementById("login-error");
const messageEl = document.getElementById("login-message");
const submitBtn = document.getElementById("submit-btn");
const switchText = document.getElementById("switch-text");
const switchBtn = document.getElementById("switch-mode");
const forgotBtn = document.getElementById("forgot");

const APP_PAGE = "index.html#search";
let mode = "login";
let auth = null;
function goToApp(){
    window.location.href = APP_PAGE;

}
function showError(text) {
    errorEl.textContent =text;
    messageEl.textContent = "";

}
function showMessage (text) {
    messageEl.textContent =text;
    errorEl.textContent = "";
}

function friendlyError(code) {
    switch (code){
        case "auth/invalid-email": return "That email address is invalid";
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found": return "Wrong email or password. Try Again";
        case "auth/email-already-in-use": return "An account eith the same email already is in use. Login instead";
        case "auth/weak-password": return "Choose a stronger Password. At least 8 characters with letters, numbers and special characters";
        case "auth/too-many-requests": return "Too many requets . try again in few minutes";
        case "auth/network-request-failed" : return "Check your internet Connection naw";
        case "auth/operation-not-allowed": return "Email and password login is not switched on  the owner firebase project. This is not your fault. contact the owner of this project.";
        case "auth/unauthorized-domain": return "This website  address is not allowed yet but can be added"

        default: return "Something went wrong. Please try again";
    
    }

}
 function setMode(next) {
    mode = next;
    const signup = mode === "signup";
    titleEl.textContent = signup ? "Create your Labelens account" : "Log in  to Labelens";
    introEl.textContent = signup
        ? "Use your email and a password of at least 8characters"
        : "Enter your details  ot start reading medicine labels";
    submitBtn.textContent =signup ? "Create account" : "Log in";
    switchText.textContent =signup ? "Already have an account?" : "New here?";
    switchBtn.textContent = signup ? "Log in" : "Create an account";
    passwordInput.autocomplete = signup ? "new-password" : "current-password";
    errorEl.textContent = "";
    messageEl.textContent = "";
}

showPassword.addEventListener("change", () => {
  passwordInput.type = showPassword.checked ? "text" : "password";
});

switchBtn.addEventListener("click", () => setMode(mode === "login" ? "signup" : "login"));

forgotBtn.addEventListener("click", async () => {
  if (!auth) return;
  const email = emailInput.value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError("Type your email address above first.");
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    if (error.code === "auth/network-request-failed" || error.code === "auth/too-many-requests") {
      showError(friendlyError(error.code));
      return;
    }
    // For other errors, give the same answer so the page does not reveal which emails have accounts.
  }
  showMessage("If an account exists for that email, a reset link has been sent. Check your spam folder too.");
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!auth) return;

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showError("Enter your email and password.");
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError("Enter a valid email address.");
    return;
  }
  if (mode === "signup" && password.length < 8) {
    showError("Choose a password of at least 8 characters.");
    return;
  }

  submitBtn.disabled = true;
  showMessage(mode === "signup" ? "Creating your account…" : "Logging in…");
  try {
    if (mode === "signup") await createUserWithEmailAndPassword(auth, email, password);
    else await signInWithEmailAndPassword(auth, email, password);
    goToApp();
  } catch (error) {
    showError(friendlyError(error.code));
    if (mode === "login") passwordInput.value = "";
  } finally {
    submitBtn.disabled = false;
  }
});

async function setup(){
    try{
        const {firebaseConfig} = await import("./firebase-config.js");
        if (!firebaseConfig || !firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith("PASTE")) {
            throw new Error("not-configured");
        }
        auth = getAuth(initializeApp(firebaseConfig));
        onAuthStateChanged(auth, (user) => {
            if (user) goToApp();

        });

    } catch (error) {
        console.error(error);
        showError ("Login is not set up yet. Add your firebase settings to firebase-config.js");
        submitBtn.disabled =true;
    }
}

setup();


