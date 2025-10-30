// ============================================
// FILE: lib/db/schema.js
// UPDATED SCHEMA - With Vehicle Numbers and Photo Filenames
// ============================================
import { mysqlTable, bigint, varchar, boolean, timestamp, text, mysqlEnum, int, decimal, date, time } from 'drizzle-orm/mysql-core';

// 1. Super Admins
export const superAdmins = mysqlTable('super_admins', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// 2. Communities
export const communities = mysqlTable('communities', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }).notNull(),
  imageUrl: varchar('image_url', { length: 500 }),
  fullAddress: text('full_address').notNull(),
  latitude: decimal('latitude', { precision: 10, scale: 8 }),
  longitude: decimal('longitude', { precision: 11, scale: 8 }),
  district: varchar('district', { length: 100 }),
  state: varchar('state', { length: 100 }),
  country: varchar('country', { length: 100 }).default('India'),
  pincode: varchar('pincode', { length: 10 }),
  createdBySuperAdminId: bigint('created_by_super_admin_id', { mode: 'number', unsigned: true }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 3. Users
export const users = mysqlTable('users', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }).notNull(),
  mobileNumber: varchar('mobile_number', { length: 15 }).notNull().unique(),
  email: varchar('email', { length: 255 }),
  password: varchar('password', { length: 255 }), // NEW FIELD
  mobileVerified: boolean('mobile_verified').default(false),
  emailVerified: boolean('email_verified').default(false),
  fcmToken: varchar('fcm_token', { length: 500 }), // FCM Push Token
  expoPushToken: varchar('expo_push_token', { length: 500 }), // Expo Push Token
  createdAt: timestamp('created_at').defaultNow(),
});

// 4. Community Admins
export const communityAdmins = mysqlTable('community_admins', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  mobileNumber: varchar('mobile_number', { length: 15 }),
  password: varchar('password', { length: 255 }).notNull(),
  communityId: bigint('community_id', { mode: 'number', unsigned: true }).notNull(),
  role: mysqlEnum('role', ['admin', 'sub_admin']).default('admin'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 5. Rules
export const rules = mysqlTable('rules', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
  communityId: bigint('community_id', { mode: 'number', unsigned: true }).notNull(),
  ruleName: varchar('rule_name', { length: 255 }).notNull(),
  description: text('description'),
  isMandatory: boolean('is_mandatory').default(true),
  proofType: mysqlEnum('proof_type', ['text', 'image', 'both']).default('text'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 6. Apartments
export const apartments = mysqlTable('apartments', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
  communityId: bigint('community_id', { mode: 'number', unsigned: true }).notNull(),
  towerName: varchar('tower_name', { length: 100 }),
  floorNumber: int('floor_number'),
  apartmentNumber: varchar('apartment_number', { length: 50 }).notNull(),
  status: mysqlEnum('status', ['active', 'inactive']).default('active'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 7. Apartment Ownerships
export const apartmentOwnerships = mysqlTable('apartment_ownerships', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
  userId: bigint('user_id', { mode: 'number', unsigned: true }).notNull(),
  apartmentId: bigint('apartment_id', { mode: 'number', unsigned: true }).notNull(),
  ownershipType: mysqlEnum('ownership_type', ['owner', 'tenant']).notNull(),
  rulesAccepted: boolean('rules_accepted').default(false),
  isAdminApproved: boolean('is_admin_approved').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// 8. Members
export const members = mysqlTable('members', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
  userId: bigint('user_id', { mode: 'number', unsigned: true }).notNull(),
  communityId: bigint('community_id', { mode: 'number', unsigned: true }).notNull(),
  apartmentId: bigint('apartment_id', { mode: 'number', unsigned: true }).notNull(), // ADDED THIS FIELD
  name: varchar('name', { length: 255 }).notNull(),
  mobileNumber: varchar('mobile_number', { length: 15 }),
  relation: varchar('relation', { length: 100 }),
  isVerified: boolean('is_verified').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// 9. Securities
export const securities = mysqlTable('securities', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
  communityId: bigint('community_id', { mode: 'number', unsigned: true }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  mobileNumber: varchar('mobile_number', { length: 15 }).notNull(),
  username: varchar('username', { length: 100 }), // ADD THIS LINE
  password: varchar('password', { length: 255 }).notNull(), // ADD THIS LINE
  shiftTiming: varchar('shift_timing', { length: 100 }),
  photoUrl: varchar('photo_url', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow(),
});

// 10. Guests (UPDATED - Added vehicle_number, photo_filename, apartment_id, total_members, is_active)
export const guests = mysqlTable('guests', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
  createdByUserId: bigint('created_by_user_id', { mode: 'number', unsigned: true }).notNull(),
  communityId: bigint('community_id', { mode: 'number', unsigned: true }).notNull(),
  apartmentId: bigint('apartment_id', { mode: 'number', unsigned: true }).notNull(), // NEW FIELD
  guestName: varchar('guest_name', { length: 255 }).notNull(),
  guestPhone: varchar('guest_phone', { length: 15 }),
  guestType: mysqlEnum('guest_type', ['frequent', 'one_time']).default('one_time'),
  approvalType: mysqlEnum('approval_type', ['needs_approval', 'preapproved', 'private']).default('needs_approval'),
  startDate: date('start_date'),
  endDate: date('end_date'),
  startTime: time('start_time'),
  endTime: time('end_time'),
  qrCode: varchar('qr_code', { length: 500 }).unique(),
  qrEncryptedData: text('qr_encrypted_data'), // NEW FIELD - encrypted JSON for QR
  purpose: text('purpose'),
  status: mysqlEnum('status', ['pending', 'approved', 'denied', 'expired']).default('pending'),
  vehicleNumber: varchar('vehicle_number', { length: 50 }),
  photoFilename: varchar('photo_filename', { length: 255 }),
  totalMembers: int('total_members').default(1), // NEW FIELD - total people including guest
  isActive: boolean('is_active').default(true), // NEW FIELD - for frequent guests
  createdByMemberId: bigint('created_by_member_id', { mode: 'number', unsigned: true }), // NEW FIELD
  createdAt: timestamp('created_at').defaultNow(),
});

// 11. Visitor Approvals
export const visitorApprovals = mysqlTable('visitor_approvals', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
  guestId: bigint('guest_id', { mode: 'number', unsigned: true }).notNull(),
  securityId: bigint('security_id', { mode: 'number', unsigned: true }),
  approvedByUserId: bigint('approved_by_user_id', { mode: 'number', unsigned: true }),
  approvalStatus: mysqlEnum('approval_status', ['approved', 'denied']).notNull(),
  approvedAt: timestamp('approved_at').defaultNow(),
});

// 12. Visitor Logs
export const visitorLogs = mysqlTable('visitor_logs', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
  guestId: bigint('guest_id', { mode: 'number', unsigned: true }).notNull(),
  securityId: bigint('security_id', { mode: 'number', unsigned: true }),
  entryTime: timestamp('entry_time').defaultNow(),
  exitTime: timestamp('exit_time'),
  photoUrl: varchar('photo_url', { length: 500 }),
  purpose: text('purpose'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 13. Delivery Logs (UPDATED - Added vehicle_number, company_logo, photo_filename, approval fields)
export const deliveryLogs = mysqlTable('delivery_logs', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
  communityId: bigint('community_id', { mode: 'number', unsigned: true }).notNull(),
  securityId: bigint('security_id', { mode: 'number', unsigned: true }),
  apartmentId: bigint('apartment_id', { mode: 'number', unsigned: true }), // NEW FIELD - for notifications
  deliveryPersonName: varchar('delivery_person_name', { length: 255 }),
  companyName: varchar('company_name', { length: 255 }),
  companyLogo: varchar('company_logo', { length: 255 }), // NEW FIELD - stores logo filename
  purpose: text('purpose'),
  vehicleNumber: varchar('vehicle_number', { length: 50 }), // NEW FIELD
  photoFilename: varchar('photo_filename', { length: 255 }), // NEW FIELD - stores only filename
  approvalStatus: mysqlEnum('approval_status', ['pending', 'approved', 'denied']).default('pending'), // NEW FIELD
  approvedByUserId: bigint('approved_by_user_id', { mode: 'number', unsigned: true }), // NEW FIELD
  approvedAt: timestamp('approved_at'), // NEW FIELD
  entryTime: timestamp('entry_time').defaultNow(),
  exitTime: timestamp('exit_time'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 13b. Delivery Approvals - NEW TABLE
export const deliveryApprovals = mysqlTable('delivery_approvals', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
  deliveryId: bigint('delivery_id', { mode: 'number', unsigned: true }).notNull(),
  approvedByUserId: bigint('approved_by_user_id', { mode: 'number', unsigned: true }).notNull(),
  approvalStatus: mysqlEnum('approval_status', ['approved', 'denied']).notNull(),
  approvedAt: timestamp('approved_at').defaultNow(),
});

// 14. Apartment Requests - NEW
export const apartmentRequests = mysqlTable('apartment_requests', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
  userId: bigint('user_id', { mode: 'number', unsigned: true }).notNull(),
  apartmentId: bigint('apartment_id', { mode: 'number', unsigned: true }).notNull(),
  communityId: bigint('community_id', { mode: 'number', unsigned: true }).notNull(),
  ownershipType: mysqlEnum('ownership_type', ['owner', 'tenant']).notNull(),
  status: mysqlEnum('status', ['pending', 'approved', 'rejected']).default('pending'),
  rejectionReason: text('rejection_reason'),
  adminComments: text('admin_comments'),
  submittedAt: timestamp('submitted_at').defaultNow(),
  reviewedAt: timestamp('reviewed_at'),
  reviewedByAdminId: bigint('reviewed_by_admin_id', { mode: 'number', unsigned: true }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 15. Apartment Request Rule Responses - NEW
export const apartmentRequestRuleResponses = mysqlTable('apartment_request_rule_responses', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
  requestId: bigint('request_id', { mode: 'number', unsigned: true }).notNull(),
  ruleId: bigint('rule_id', { mode: 'number', unsigned: true }).notNull(),
  textResponse: text('text_response'),
  imageFilename: varchar('image_filename', { length: 500 }),
  submittedAt: timestamp('submitted_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

// 16. Apartment Request Members - NEW
export const apartmentRequestMembers = mysqlTable('apartment_request_members', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
  requestId: bigint('request_id', { mode: 'number', unsigned: true }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  mobileNumber: varchar('mobile_number', { length: 15 }),
  relation: varchar('relation', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow(),
});

// 17. QR Scans - NEW (Track all QR code scans by security)
export const qrScans = mysqlTable('qr_scans', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
  guestId: bigint('guest_id', { mode: 'number', unsigned: true }).notNull(),
  securityId: bigint('security_id', { mode: 'number', unsigned: true }).notNull(),
  apartmentId: bigint('apartment_id', { mode: 'number', unsigned: true }).notNull(),
  communityId: bigint('community_id', { mode: 'number', unsigned: true }).notNull(),
  scannedAt: timestamp('scanned_at').defaultNow(),
  accessGranted: boolean('access_granted').default(false),
  accessReason: varchar('access_reason', { length: 255 }), // Reason if denied
  totalMembersPresent: int('total_members_present').default(1),
  vehicleNumber: varchar('vehicle_number', { length: 50 }),
  notes: text('notes'), // Security notes
  createdAt: timestamp('created_at').defaultNow(),
});

// 18. Member Invites - NEW (Track member signup invitations)
export const memberInvites = mysqlTable('member_invites', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
  apartmentId: bigint('apartment_id', { mode: 'number', unsigned: true }).notNull(),
  communityId: bigint('community_id', { mode: 'number', unsigned: true }).notNull(),
  invitedByUserId: bigint('invited_by_user_id', { mode: 'number', unsigned: true }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  mobileNumber: varchar('mobile_number', { length: 15 }).notNull(),
  relation: varchar('relation', { length: 100 }),
  inviteCode: varchar('invite_code', { length: 100 }).unique(),
  status: mysqlEnum('status', ['pending', 'accepted', 'expired']).default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
  acceptedAt: timestamp('accepted_at'),
  expiresAt: timestamp('expires_at'),
});

// 19. User Apartment Context - NEW (Track user's currently selected apartment)
export const userApartmentContext = mysqlTable('user_apartment_context', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
  userId: bigint('user_id', { mode: 'number', unsigned: true }).notNull().unique(),
  currentApartmentId: bigint('current_apartment_id', { mode: 'number', unsigned: true }).notNull(),
  lastSwitchedAt: timestamp('last_switched_at').defaultNow(),
});

// 20. Guest Shares - NEW (Track QR code shares)
export const guestShares = mysqlTable('guest_shares', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
  guestId: bigint('guest_id', { mode: 'number', unsigned: true }).notNull(),
  sharedByUserId: bigint('shared_by_user_id', { mode: 'number', unsigned: true }).notNull(),
  sharedAt: timestamp('shared_at').defaultNow(),
  shareMethod: varchar('share_method', { length: 50 }), // whatsapp, telegram, download, etc.
});