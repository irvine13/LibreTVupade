// Firebase Configuration (来自用户提供)
const firebaseConfig = {
  apiKey: "AIzaSyDt_zl4vtqZ4ytpqYN43Y-SxfFJq9n_WrQ",
  authDomain: "vdeioweb.firebaseapp.com",
  projectId: "vdeioweb",
  storageBucket: "vdeioweb.firebasestorage.app",
  messagingSenderId: "921110532693",
  appId: "1:921110532693:web:6fce414bdb697bdf7a7adc",
  measurementId: "G-Q1SK624E86"
};

// 初始化 Firebase
// 使用 compat 版本以保持与现有代码风格的一致性 (如果需要)
// 或者直接使用 modular SDK: import { initializeApp } from "firebase/app"; import { getAuth } from "firebase/auth";
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth(); // 获取认证服务实例

// --- 认证相关函数 ---

// 检查用户登录状态 (返回 Promise)
function checkAuthState() {
  return new Promise((resolve, reject) => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      unsubscribe(); // 取消监听，避免重复触发
      resolve(user); // user 对象，如果未登录则为 null
    }, error => {
      reject(error);
    });
  });
}

// 获取当前用户的 ID Token (返回 Promise)
function getIdToken() {
  return new Promise((resolve, reject) => {
    const user = auth.currentUser;
    if (user) {
      user.getIdToken(true) // true 强制刷新 token
        .then(idToken => resolve(idToken))
        .catch(error => reject(error));
    } else {
      resolve(null); // 没有登录用户
    }
  });
}

// 邮箱密码注册
function registerWithEmail(email, password) {
  return auth.createUserWithEmailAndPassword(email, password);
}

// 邮箱密码登录
function loginWithEmail(email, password) {
  return auth.signInWithEmailAndPassword(email, password);
}

// 登出
function logout() {
  return auth.signOut();
}

// 监听认证状态变化 (提供回调函数)
function onAuthStateChanged(callback) {
  return auth.onAuthStateChanged(callback);
}

// 导出需要使用的函数/对象 (如果使用 ES Module)
// export { auth, checkAuthState, getIdToken, registerWithEmail, loginWithEmail, logout, onAuthStateChanged };

// 注意：由于现有项目未使用 ES Module (从 HTML script 引入判断)，暂时不使用 export
// 全局函数可以直接调用