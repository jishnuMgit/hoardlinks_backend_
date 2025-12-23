import admin from "../config/firebase.js";

export const createFirebaseUserKey = async (
  userId: string | number,
  loginId: string
): Promise<string> => {
  // Create a new node under /users
  const userRef = admin.database().ref("users").push();

  await userRef.set({
    userId: userId.toString(),
    login_id: loginId,
    createdAt: new Date().toISOString(),
  });

  // 🔑 THIS is the Firebase key
  return userRef.key as string;
};
