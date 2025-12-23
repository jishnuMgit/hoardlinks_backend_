import admin from "../config/firebase.js";

export const sendPushNotification = async (
  token: string,
  title: string,
  body: string
) => {
  if (!token) return;

  try {
    await admin.messaging().send({
      token,
      notification: {
        title,
        body,
      },
      android: {
        priority: "high",
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
          },
        },
      },
    });

    console.log("✅ Notification sent");
  } catch (error: any) {
    console.error("❌ FCM error:", error.message);
  }
};
