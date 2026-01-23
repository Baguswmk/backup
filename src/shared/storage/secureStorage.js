import CryptoJS from "crypto-js";

const SECRET_KEY = import.meta.env.VITE_SECRET_KEY;

export const secureStorage = {
  setItem: (key, value) => {
    try {
      if (!key) {
        throw new Error("Storage key is required");
      }

      if (value === undefined) {
        throw new Error("Value cannot be undefined");
      }

      let jsonString;
      try {
        jsonString = JSON.stringify(value);
      } catch (jsonError) {
        console.error("JSON stringify error:", jsonError);
        throw new Error(`Failed to stringify value: ${jsonError.message}`);
      }

      let encrypted;
      try {
        encrypted = CryptoJS.AES.encrypt(jsonString, SECRET_KEY).toString();
      } catch (encryptError) {
        console.error("Encryption error:", encryptError);
        throw new Error(`Failed to encrypt: ${encryptError.message}`);
      }

      try {
        localStorage.setItem(key, encrypted);
      } catch (storageError) {
        console.error("LocalStorage error:", storageError);
        throw new Error(`Failed to store: ${storageError.message}`);
      }
    } catch (error) {
      console.error(`❌ Encryption error for key "${key}":`, error);
      console.error("Value type:", typeof value);
      console.error("Value sample:", JSON.stringify(value).substring(0, 100));
      throw error;
    }
  },

  getItem: (key) => {
    try {
      if (!key) {
        throw new Error("Storage key is required");
      }

      const encrypted = localStorage.getItem(key);

      if (!encrypted) {
        return null;
      }

      const bytes = CryptoJS.AES.decrypt(encrypted, SECRET_KEY);
      const decryptedString = bytes.toString(CryptoJS.enc.Utf8);

      if (!decryptedString) {
        throw new Error(
          "Decryption resulted in empty string - possibly wrong key",
        );
      }

      const value = JSON.parse(decryptedString);

      return value;
    } catch (error) {
      console.error(`❌ Decryption error for key "${key}":`, error.message);

      try {
        localStorage.removeItem(key);
      } catch (removeError) {
        console.error(
          `❌ Failed to remove corrupted key "${key}":`,
          removeError,
        );
      }

      return null;
    }
  },

  removeItem: (key) => {
    try {
      if (!key) {
        throw new Error("Storage key is required");
      }

      localStorage.removeItem(key);
    } catch (error) {
      console.error(`❌ Failed to remove key "${key}":`, error);
      throw error;
    }
  },

  getAllKeys: () => {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) keys.push(key);
      }
      return keys;
    } catch (error) {
      console.error("❌ Failed to get all keys:", error);
      return [];
    }
  },

  migrate: (key, unencryptedValue) => {
    try {
      secureStorage.setItem(key, unencryptedValue);

      return true;
    } catch (error) {
      console.error(`❌ Migration failed for key "${key}":`, error);
      return false;
    }
  },
};

export default secureStorage;
