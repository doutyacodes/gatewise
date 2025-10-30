// ============================================
// FILE: mobile-api/helpers/fcmHelper.js
// Firebase Cloud Messaging Helper Functions
// ============================================

/**
 * Send FCM notification using Firebase Admin SDK or HTTP API
 *
 * NOTE: This implementation uses the Firebase HTTP v1 API
 * You need to:
 * 1. Go to Firebase Console > Project Settings > Service Accounts
 * 2. Generate a new private key (JSON file)
 * 3. Save it securely (DO NOT commit to git)
 * 4. Set GOOGLE_APPLICATION_CREDENTIALS env variable
 *
 * For production, use Firebase Admin SDK:
 * npm install firebase-admin
 */

/**
 * Send notification to FCM token
 * @param {Object} options - Notification options
 * @param {string} options.fcmToken - FCM device token
 * @param {string} options.title - Notification title
 * @param {string} options.body - Notification body
 * @param {Object} options.data - Custom data payload
 * @param {string} options.channelId - Android notification channel
 * @returns {Promise<Object>} Result
 */
export async function sendFCMNotification(options) {
  try {
    const {
      fcmToken,
      title,
      body,
      data = {},
      channelId = 'default',
    } = options;

    console.log('📤 Sending FCM notification...');
    console.log('To token:', fcmToken?.substring(0, 20) + '...');
    console.log('Title:', title);
    console.log('Body:', body);

    if (!fcmToken) {
      console.error('❌ No FCM token provided');
      return {
        success: false,
        error: 'No FCM token provided',
      };
    }

    // TODO: Implement actual FCM sending
    // For now, log the notification that would be sent
    console.log('📝 Notification to send:', {
      token: fcmToken,
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        channelId,
      },
      android: {
        priority: 'high',
        notification: {
          channelId,
          sound: 'notification.wav',
          priority: 'high',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'notification.wav',
            badge: 1,
          },
        },
      },
    });

    // IMPLEMENTATION OPTIONS:

    // Option 1: Use Firebase Admin SDK (Recommended for production)
    /*
    const admin = require('firebase-admin');

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }

    const message = {
      token: fcmToken,
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        channelId,
      },
      android: {
        priority: 'high',
        notification: {
          channelId,
          sound: 'notification.wav',
          priority: 'high',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'notification.wav',
            badge: 1,
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log('✅ FCM sent successfully:', response);

    return {
      success: true,
      messageId: response,
    };
    */

    // Option 2: Use HTTP API with service account
    /*
    const { GoogleAuth } = require('google-auth-library');

    const auth = new GoogleAuth({
      scopes: 'https://www.googleapis.com/auth/firebase.messaging',
    });

    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    const projectId = 'your-project-id'; // From google-services.json
    const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token: fcmToken,
          notification: {
            title,
            body,
          },
          data: {
            ...data,
            channelId,
          },
          android: {
            priority: 'high',
            notification: {
              channelId,
              sound: 'notification.wav',
            },
          },
        },
      }),
    });

    const result = await response.json();
    console.log('✅ FCM sent successfully:', result);

    return {
      success: true,
      messageId: result.name,
    };
    */

    // Option 3: Use Expo Push Notifications (Recommended for Expo projects)
    /*
    const expoPushToken = data.expoPushToken;

    if (expoPushToken) {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: expoPushToken,
          title,
          body,
          data: {
            ...data,
            channelId,
          },
          sound: 'notification.wav',
          priority: 'high',
          channelId,
        }),
      });

      const result = await response.json();
      console.log('✅ Expo notification sent:', result);

      return {
        success: true,
        data: result,
      };
    }
    */

    // For now, return mock success
    console.log('⚠️ FCM sending not implemented - notification logged only');
    console.log('💡 To enable: Uncomment one of the implementation options above');

    return {
      success: true,
      messageId: 'mock-' + Date.now(),
      mock: true,
    };

  } catch (error) {
    console.error('❌ Error sending FCM notification:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Send notification to multiple tokens
 * @param {Object} options - Notification options
 * @param {string[]} options.fcmTokens - Array of FCM tokens
 * @param {string} options.title - Notification title
 * @param {string} options.body - Notification body
 * @param {Object} options.data - Custom data payload
 * @returns {Promise<Object>} Result
 */
export async function sendFCMNotificationToMultiple(options) {
  try {
    const { fcmTokens, title, body, data = {} } = options;

    console.log(`📤 Sending FCM notification to ${fcmTokens.length} devices...`);

    if (!fcmTokens || fcmTokens.length === 0) {
      return {
        success: false,
        error: 'No FCM tokens provided',
      };
    }

    // Send to each token
    const results = await Promise.allSettled(
      fcmTokens.map((token) =>
        sendFCMNotification({
          fcmToken: token,
          title,
          body,
          data,
        })
      )
    );

    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    const failureCount = results.filter((r) => r.status === 'rejected').length;

    console.log(`✅ Sent to ${successCount}/${fcmTokens.length} devices`);

    return {
      success: true,
      successCount,
      failureCount,
      results,
    };

  } catch (error) {
    console.error('❌ Error sending multiple FCM notifications:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Send notification to topic
 * @param {Object} options - Notification options
 * @param {string} options.topic - FCM topic name
 * @param {string} options.title - Notification title
 * @param {string} options.body - Notification body
 * @param {Object} options.data - Custom data payload
 * @returns {Promise<Object>} Result
 */
export async function sendFCMNotificationToTopic(options) {
  try {
    const { topic, title, body, data = {} } = options;

    console.log(`📤 Sending FCM notification to topic: ${topic}`);

    // TODO: Implement topic-based notification
    // Example with Firebase Admin SDK:
    /*
    const admin = require('firebase-admin');

    const message = {
      topic,
      notification: {
        title,
        body,
      },
      data,
    };

    const response = await admin.messaging().send(message);
    return {
      success: true,
      messageId: response,
    };
    */

    console.log('⚠️ Topic notification not implemented');

    return {
      success: true,
      mock: true,
    };

  } catch (error) {
    console.error('❌ Error sending topic notification:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

export default {
  sendFCMNotification,
  sendFCMNotificationToMultiple,
  sendFCMNotificationToTopic,
};
