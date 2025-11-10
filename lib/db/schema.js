// ============================================
// FILE: lib/db/schema.js
// UPDATED SCHEMA - With Rental Management System
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
  password: varchar('password', { length: 255 }),
  profileImage: varchar('profile_image', { length: 500 }),
  profileImagePrivate: boolean('profile_image_private').default(false),
  mobileVerified: boolean('mobile_verified').default(false),
  emailVerified: boolean('email_verified').default(false),
  fcmToken: varchar('fcm_token', { length: 500 }),
  expoPushToken: varchar('expo_push_token', { length: 500 }),
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
  apartmentId: bigint('apartment_id', { mode: 'number', unsigned: true }).notNull(),
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
  username: varchar('username', { length: 100 }),
  password: varchar('password', { length: 255 }).notNull(),
  shiftTiming: varchar('shift_timing', { length: 100 }),
  photoUrl: varchar('photo_url', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow(),
});

// 10. Guests
export const guests = mysqlTable('guests', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
  createdByUserId: bigint('created_by_user_id', { mode: 'number', unsigned: true }).notNull(),
  communityId: bigint('community_id', { mode: 'number', unsigned: true }).notNull(),
  apartmentId: bigint('apartment_id', { mode: 'number', unsigned: true }).notNull(),
  guestName: varchar('guest_name', { length: 255 }).notNull(),
  guestPhone: varchar('guest_phone', { length: 15 }),
  guestType: mysqlEnum('guest_type', ['frequent', 'one_time']).default('one_time'),
  approvalType: mysqlEnum('approval_type', ['needs_approval', 'preapproved', 'private']).default('needs_approval'),
  startDate: date('start_date'),
  endDate: date('end_date'),
  startTime: time('start_time'),
  endTime: time('end_time'),
  qrCode: varchar('qr_code', { length: 500 }).unique(),
  qrEncryptedData: text('qr_encrypted_data'),
  purpose: text('purpose'),
  status: mysqlEnum('status', ['pending', 'approved', 'denied', 'expired']).default('pending'),
  vehicleNumber: varchar('vehicle_number', { length: 50 }),
  photoFilename: varchar('photo_filename', { length: 255 }),
  totalMembers: int('total_members').default(1),
  isActive: boolean('is_active').default(true),
  createdByMemberId: bigint('created_by_member_id', { mode: 'number', unsigned: true }),
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

// 13. Delivery Logs
export const deliveryLogs = mysqlTable('delivery_logs', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
  communityId: bigint('community_id', { mode: 'number', unsigned: true }).notNull(),
  securityId: bigint('security_id', { mode: 'number', unsigned: true }),
  apartmentId: bigint('apartment_id', { mode: 'number', unsigned: true }),
  deliveryPersonName: varchar('delivery_person_name', { length: 255 }),
  companyName: varchar('company_name', { length: 255 }),
  companyLogo: varchar('company_logo', { length: 255 }),
  purpose: text('purpose'),
  vehicleNumber: varchar('vehicle_number', { length: 50 }),
  photoFilename: varchar('photo_filename', { length: 255 }),
  approvalStatus: mysqlEnum('approval_status', ['pending', 'approved', 'denied']).default('pending'),
  approvedByUserId: bigint('approved_by_user_id', { mode: 'number', unsigned: true }),
  approvedAt: timestamp('approved_at'),
  entryTime: timestamp('entry_time').defaultNow(),
  exitTime: timestamp('exit_time'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 13b. Delivery Approvals
export const deliveryApprovals = mysqlTable('delivery_approvals', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
  deliveryId: bigint('delivery_id', { mode: 'number', unsigned: true }).notNull(),
  approvedByUserId: bigint('approved_by_user_id', { mode: 'number', unsigned: true }).notNull(),
  approvalStatus: mysqlEnum('approval_status', ['approved', 'denied']).notNull(),
  approvedAt: timestamp('approved_at').defaultNow(),
});

// 14. Apartment Requests
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

// 15. Apartment Request Rule Responses
export const apartmentRequestRuleResponses = mysqlTable('apartment_request_rule_responses', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
  requestId: bigint('request_id', { mode: 'number', unsigned: true }).notNull(),
  ruleId: bigint('rule_id', { mode: 'number', unsigned: true }).notNull(),
  textResponse: text('text_response'),
  imageFilename: varchar('image_filename', { length: 500 }),
  submittedAt: timestamp('submitted_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

// 16. Apartment Request Members
export const apartmentRequestMembers = mysqlTable('apartment_request_members', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
  requestId: bigint('request_id', { mode: 'number', unsigned: true }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  mobileNumber: varchar('mobile_number', { length: 15 }),
  relation: varchar('relation', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow(),
});

// 17. QR Scans
export const qrScans = mysqlTable('qr_scans', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
  guestId: bigint('guest_id', { mode: 'number', unsigned: true }).notNull(),
  securityId: bigint('security_id', { mode: 'number', unsigned: true }).notNull(),
  apartmentId: bigint('apartment_id', { mode: 'number', unsigned: true }).notNull(),
  communityId: bigint('community_id', { mode: 'number', unsigned: true }).notNull(),
  scannedAt: timestamp('scanned_at').defaultNow(),
  accessGranted: boolean('access_granted').default(false),
  accessReason: varchar('access_reason', { length: 255 }),
  totalMembersPresent: int('total_members_present').default(1),
  vehicleNumber: varchar('vehicle_number', { length: 50 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 18. Member Invites
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

// 19. User Apartment Context
export const userApartmentContext = mysqlTable('user_apartment_context', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
  userId: bigint('user_id', { mode: 'number', unsigned: true }).notNull().unique(),
  currentApartmentId: bigint('current_apartment_id', { mode: 'number', unsigned: true }).notNull(),
  lastSwitchedAt: timestamp('last_switched_at').defaultNow(),
});

// 20. Guest Shares
export const guestShares = mysqlTable('guest_shares', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
  guestId: bigint('guest_id', { mode: 'number', unsigned: true }).notNull(),
  sharedByUserId: bigint('shared_by_user_id', { mode: 'number', unsigned: true }).notNull(),
  sharedAt: timestamp('shared_at').defaultNow(),
  shareMethod: varchar('share_method', { length: 50 }),
});

// ============================================
// RENTAL MANAGEMENT SYSTEM TABLES
// ============================================

// 21. Rent Sessions
export const rentSessions = mysqlTable('rent_sessions', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
  apartmentId: bigint('apartment_id', { mode: 'number', unsigned: true }).notNull(),
  ownerId: bigint('owner_id', { mode: 'number', unsigned: true }).notNull(),
  tenantId: bigint('tenant_id', { mode: 'number', unsigned: true }).notNull(),
  rentAmount: decimal('rent_amount', { precision: 10, scale: 2 }).notNull(),
  maintenanceCost: decimal('maintenance_cost', { precision: 10, scale: 2 }).default('0.00'),
  initialDeposit: decimal('initial_deposit', { precision: 10, scale: 2 }).default('0.00'),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  durationMonths: int('duration_months'),
  status: mysqlEnum('status', ['active', 'completed', 'terminated']).default('active'),
  earlyTerminationRequestedBy: bigint('early_termination_requested_by', { mode: 'number', unsigned: true }),
  earlyTerminationApprovedBy: bigint('early_termination_approved_by', { mode: 'number', unsigned: true }),
  earlyTerminationReason: text('early_termination_reason'),
  terminatedAt: timestamp('terminated_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 22. Rent Session Additional Charges
export const rentSessionAdditionalCharges = mysqlTable('rent_session_additional_charges', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
  sessionId: bigint('session_id', { mode: 'number', unsigned: true }).notNull(),
  chargeTitle: varchar('charge_title', { length: 255 }).notNull(),
  chargeAmount: decimal('charge_amount', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// 23. Tenant Preferences
export const tenantPreferences = mysqlTable('tenant_preferences', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
  sessionId: bigint('session_id', { mode: 'number', unsigned: true }).notNull(),
  numberOfCars: int('number_of_cars').default(0),
  numberOfPets: int('number_of_pets').default(0),
  ownerRestrictions: text('owner_restrictions'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 24. Admin Defined Tenant Questions
export const adminTenantQuestions = mysqlTable('admin_tenant_questions', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
  communityId: bigint('community_id', { mode: 'number', unsigned: true }).notNull(),
  questionText: text('question_text').notNull(),
  questionType: mysqlEnum('question_type', ['text', 'number', 'boolean', 'choice']).default('text'),
  isRequired: boolean('is_required').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// 25. Tenant Question Responses
export const tenantQuestionResponses = mysqlTable('tenant_question_responses', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
  sessionId: bigint('session_id', { mode: 'number', unsigned: true }).notNull(),
  questionId: bigint('question_id', { mode: 'number', unsigned: true }).notNull(),
  responseText: text('response_text'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 26. Apartment Rooms
export const apartmentRooms = mysqlTable('apartment_rooms', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
  apartmentId: bigint('apartment_id', { mode: 'number', unsigned: true }).notNull(),
  sessionId: bigint('session_id', { mode: 'number', unsigned: true }),
  roomName: varchar('room_name', { length: 255 }).notNull(),
  roomType: varchar('room_type', { length: 100 }),
  createdBy: bigint('created_by', { mode: 'number', unsigned: true }).notNull(),
  createdByRole: mysqlEnum('created_by_role', ['owner', 'tenant']).notNull(),
  approvalStatus: mysqlEnum('approval_status', ['pending', 'approved', 'rejected']).default('approved'),
  approvedBy: bigint('approved_by', { mode: 'number', unsigned: true }),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 27. Room Accessories
export const roomAccessories = mysqlTable('room_accessories', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
  roomId: bigint('room_id', { mode: 'number', unsigned: true }).notNull(),
  accessoryName: varchar('accessory_name', { length: 255 }).notNull(),
  brandName: varchar('brand_name', { length: 255 }),
  quantity: int('quantity').default(1),
  createdBy: bigint('created_by', { mode: 'number', unsigned: true }).notNull(),
  createdByRole: mysqlEnum('created_by_role', ['owner', 'tenant']).notNull(),
  approvalStatus: mysqlEnum('approval_status', ['pending', 'approved', 'rejected']).default('approved'),
  approvedBy: bigint('approved_by', { mode: 'number', unsigned: true }),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 28. Accessory Replacement History
export const accessoryReplacementHistory = mysqlTable('accessory_replacement_history', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
  sessionId: bigint('session_id', { mode: 'number', unsigned: true }).notNull(),
  roomId: bigint('room_id', { mode: 'number', unsigned: true }).notNull(),
  accessoryId: bigint('accessory_id', { mode: 'number', unsigned: true }),
  oldAccessoryName: varchar('old_accessory_name', { length: 255 }),
  newAccessoryName: varchar('new_accessory_name', { length: 255 }),
  replacementReason: text('replacement_reason'),
  replacedBy: bigint('replaced_by', { mode: 'number', unsigned: true }).notNull(),
  replacedByRole: mysqlEnum('replaced_by_role', ['owner', 'tenant']).notNull(),
  cost: decimal('cost', { precision: 10, scale: 2 }),
  paidBy: mysqlEnum('paid_by', ['owner', 'tenant']).notNull(),
  includedInRent: boolean('included_in_rent').default(false),
  replacementDate: date('replacement_date'),
  approvalStatus: mysqlEnum('approval_status', ['pending', 'approved', 'rejected']).default('pending'),
  approvedBy: bigint('approved_by', { mode: 'number', unsigned: true }),
  approvedAt: timestamp('approved_at'),
  rejectionReason: text('rejection_reason'),
  replacedAt: timestamp('replaced_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 29. Rent Session Documents
export const rentSessionDocuments = mysqlTable('rent_session_documents', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
  sessionId: bigint('session_id', { mode: 'number', unsigned: true }).notNull(),
  documentType: varchar('document_type', { length: 255 }).notNull(),
  documentFilename: varchar('document_filename', { length: 500 }).notNull(),
  uploadedBy: bigint('uploaded_by', { mode: 'number', unsigned: true }).notNull(),
  approvalStatus: mysqlEnum('approval_status', ['pending', 'approved', 'rejected']).default('pending'),
  approvedBy: bigint('approved_by', { mode: 'number', unsigned: true }),
  rejectionReason: text('rejection_reason'),
  approvedAt: timestamp('approved_at'),
  uploadedAt: timestamp('uploaded_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

// 30. Rent Payments
export const rentPayments = mysqlTable('rent_payments', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
  sessionId: bigint('session_id', { mode: 'number', unsigned: true }).notNull(),
  paymentAmount: decimal('payment_amount', { precision: 10, scale: 2 }).notNull(),
  paymentDate: date('payment_date').notNull(),
  paymentMonth: varchar('payment_month', { length: 20 }),
  paymentYear: int('payment_year'),
  loggedBy: bigint('logged_by', { mode: 'number', unsigned: true }).notNull(),
  loggedByRole: mysqlEnum('logged_by_role', ['owner', 'tenant']).notNull(),
  approvalStatus: mysqlEnum('approval_status', ['pending', 'approved', 'disputed']).default('pending'),
  approvedBy: bigint('approved_by', { mode: 'number', unsigned: true }),
  approvedAt: timestamp('approved_at'),
  disputeReason: text('dispute_reason'),
  editedAmount: decimal('edited_amount', { precision: 10, scale: 2 }),
  finalAccepted: boolean('final_accepted').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 31. Dispute Reports
export const disputeReports = mysqlTable('dispute_reports', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
  sessionId: bigint('session_id', { mode: 'number', unsigned: true }).notNull(),
  reportedBy: bigint('reported_by', { mode: 'number', unsigned: true }).notNull(),
  reportedByRole: mysqlEnum('reported_by_role', ['owner', 'tenant']).notNull(),
  reportType: mysqlEnum('report_type', ['room_based', 'common']).notNull(),
  roomId: bigint('room_id', { mode: 'number', unsigned: true }),
  reason: text('reason').notNull(),
  imageFilename: varchar('image_filename', { length: 500 }),
  status: mysqlEnum('status', ['open', 'in_progress', 'resolved', 'escalated']).default('open'),
  escalatedToAdmin: boolean('escalated_to_admin').default(false),
  escalatedAt: timestamp('escalated_at'),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 32. Dispute Chat Messages
export const disputeChatMessages = mysqlTable('dispute_chat_messages', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
  disputeId: bigint('dispute_id', { mode: 'number', unsigned: true }).notNull(),
  senderId: bigint('sender_id', { mode: 'number', unsigned: true }).notNull(),
  senderRole: mysqlEnum('sender_role', ['owner', 'tenant', 'admin']).notNull(),
  messageText: text('message_text').notNull(),
  imageFilename: varchar('image_filename', { length: 500 }),
  sentAt: timestamp('sent_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

// 33. Dispute Resolution Approvals
export const disputeResolutionApprovals = mysqlTable('dispute_resolution_approvals', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
  disputeId: bigint('dispute_id', { mode: 'number', unsigned: true }).notNull(),
  approvedBy: bigint('approved_by', { mode: 'number', unsigned: true }).notNull(),
  approvedByRole: mysqlEnum('approved_by_role', ['owner', 'tenant', 'admin']).notNull(),
  approvedAt: timestamp('approved_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

// 34. Community Posts
export const communityPosts = mysqlTable('community_posts', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
  communityId: bigint('community_id', { mode: 'number', unsigned: true }).notNull(),
  createdByUserId: bigint('created_by_user_id', { mode: 'number', unsigned: true }).notNull(),
  description: text('description').notNull(),
  isDeleted: boolean('is_deleted').default(false),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 35. Community Post Images
export const communityPostImages = mysqlTable('community_post_images', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
  postId: bigint('post_id', { mode: 'number', unsigned: true }).notNull(),
  imageFilename: varchar('image_filename', { length: 500 }).notNull(),
  imageOrder: int('image_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// 36. Community Post Comments
export const communityPostComments = mysqlTable('community_post_comments', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
  postId: bigint('post_id', { mode: 'number', unsigned: true }).notNull(),
  userId: bigint('user_id', { mode: 'number', unsigned: true }).notNull(),
  commentText: text('comment_text').notNull(),
  parentCommentId: bigint('parent_comment_id', { mode: 'number', unsigned: true }),
  isDeleted: boolean('is_deleted').default(false),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 37. Community Post Reports
export const communityPostReports = mysqlTable('community_post_reports', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
  postId: bigint('post_id', { mode: 'number', unsigned: true }).notNull(),
  reportedBy: bigint('reported_by', { mode: 'number', unsigned: true }).notNull(),
  reportReason: text('report_reason').notNull(),
  status: mysqlEnum('status', ['pending', 'reviewed', 'resolved']).default('pending'),
  reviewedBy: bigint('reviewed_by', { mode: 'number', unsigned: true }),
  reviewedAt: timestamp('reviewed_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 38. Classifieds
export const classifieds = mysqlTable('classifieds', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
  communityId: bigint('community_id', { mode: 'number', unsigned: true }).notNull(),
  createdByUserId: bigint('created_by_user_id', { mode: 'number', unsigned: true }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }),
  category: varchar('category', { length: 100 }),
  isDeleted: boolean('is_deleted').default(false),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 39. Classified Images
export const classifiedImages = mysqlTable('classified_images', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
  classifiedId: bigint('classified_id', { mode: 'number', unsigned: true }).notNull(),
  imageFilename: varchar('image_filename', { length: 500 }).notNull(),
  imageOrder: int('image_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// 40. Classified Comments
export const classifiedComments = mysqlTable('classified_comments', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
  classifiedId: bigint('classified_id', { mode: 'number', unsigned: true }).notNull(),
  userId: bigint('user_id', { mode: 'number', unsigned: true }).notNull(),
  commentText: text('comment_text').notNull(),
  parentCommentId: bigint('parent_comment_id', { mode: 'number', unsigned: true }),
  isDeleted: boolean('is_deleted').default(false),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 41. Classified Reports
export const classifiedReports = mysqlTable('classified_reports', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
  classifiedId: bigint('classified_id', { mode: 'number', unsigned: true }).notNull(),
  reportedBy: bigint('reported_by', { mode: 'number', unsigned: true }).notNull(),
  reportReason: text('report_reason').notNull(),
  status: mysqlEnum('status', ['pending', 'reviewed', 'resolved']).default('pending'),
  reviewedBy: bigint('reviewed_by', { mode: 'number', unsigned: true }),
  reviewedAt: timestamp('reviewed_at'),
  createdAt: timestamp('created_at').defaultNow(),
});
