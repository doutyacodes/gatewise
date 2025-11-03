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

    // Convert all data values to strings (FCM requirement)
    const stringifiedData = {};
    for (const [key, value] of Object.entries(data)) {
      stringifiedData[key] = String(value);
    }
    stringifiedData.channelId = channelId;

    // Log the notification details
    console.log('📝 Notification to send:', {
      token: fcmToken,
      notification: {
        title,
        body,
      },
      data: stringifiedData,
      android: {
        priority: 'high',
        notification: {
          channelId,
          sound: 'guest_arrival_ringtone',
          priority: 'high',
        },
      },
    });

    // ============================================
    // IMPLEMENTATION: Firebase Admin SDK
    // ============================================
    try {
      const admin = require('firebase-admin');

      // Initialize Firebase Admin (only once)
      if (!admin.apps.length) {
        // Try to initialize with service account from environment variable
        if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
          console.log('🔐 Initializing Firebase Admin with service account...');
          const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });
        } else {
          console.log('🔐 Initializing Firebase Admin with default credentials...');
          // Use default credentials from GOOGLE_APPLICATION_CREDENTIALS env variable
          admin.initializeApp({
            credential: admin.credential.applicationDefault(),
          });
        }
        console.log('✅ Firebase Admin initialized');
      }

      // Build the FCM message
      const message = {
        token: fcmToken,
        data: stringifiedData, // Only data payload (no notification object for full control)
        android: {
          priority: 'high',
          notification: {
            channelId: channelId,
            sound: 'guest_arrival_ringtone',
            priority: 'high',
            defaultSound: false,
            defaultVibrateTimings: false,
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'guest_arrival_ringtone.wav',
              badge: 1,
              contentAvailable: true,
            },
          },
        },
      };

      console.log('📤 Sending FCM message via Firebase Admin SDK...');
      const response = await admin.messaging().send(message);
      console.log('✅ FCM sent successfully! Message ID:', response);

      return {
        success: true,
        messageId: response,
      };

    } catch (adminError) {
      console.error('❌ Firebase Admin SDK error:', adminError);
      console.error('Error details:', adminError.message);

      // If Admin SDK fails, return error
      return {
        success: false,
        error: adminError.message || 'Failed to send FCM notification',
      };
    }

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
