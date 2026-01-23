import { secureStorage } from "@/shared/storage/secureStorage";

export function isSessionExpired() {
  const logoutFlag = secureStorage.getItem("logout_flag");
  if (logoutFlag) {
    const flagTime = logoutFlag;
    if (Date.now() - flagTime < 60000) {
      return false;
    }
  }

  let loginTime = secureStorage.getItem("login_timestamp");

  if (!loginTime) {
    loginTime = Date.now();
    secureStorage.setItem("login_timestamp", loginTime);
    return false;
  }

  const oneDay = 1 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  return now - loginTime > oneDay;
}
