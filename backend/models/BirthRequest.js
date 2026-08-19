import mongoose from "mongoose";

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    note: { type: String, default: "" },
    changedByRole: { type: String, default: "system" },
    changedByName: { type: String, default: "النظام" },
    changedById: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const birthRequestSchema = new mongoose.Schema(
  {
    requestNumber: { type: String, required: true, unique: true, index: true },
    childName: { type: String, required: true, trim: true },
    birthDate: { type: Date, required: true },
    gender: { type: String, enum: ["male", "female"], required: true },
    birthPlace: { type: String, default: null, trim: true },
    applicantName: { type: String, required: true, trim: true },
    applicantNationalId: { type: String, required: true, trim: true, index: true },
    applicantRelation: { type: String, default: null, trim: true },
    fatherName: { type: String, default: null, trim: true },
    motherName: { type: String, default: null, trim: true },
    registryOffice: { type: String, required: true, trim: true },
    deliveryMethod: { type: String, required: true, trim: true },

    paymentMethod: {
      type: String,
      enum: ["cash", "online", "bank_transfer"],
      default: "cash",
    },
    paymentChannel: { type: String, default: null },

    paid: { type: Boolean, default: false, index: true },
    paymentVerified: { type: Boolean, default: false },
    paymentExpectedAmount: { type: Number, default: 0 },

    transferRef: { type: String, default: null, trim: true },
    transferAmount: { type: Number, default: null },
    transferNote: { type: String, default: null },
    transferAccountId: { type: String, default: null },
    transferAccountLabel: { type: String, default: null },
    transferTxId: { type: String, default: null, trim: true },

    paymentIssueReason: { type: String, default: null },
    refundStatus: {
      type: String,
      enum: ["not_required", "pending_refund", "refunded"],
      default: "not_required",
    },

    paymentIssueType: {
      type: String,
      enum: ["overpaid", "underpaid", null],
      default: null,
    },
    paymentDifferenceAmount: { type: Number, default: 0 },

    paymentResolutionRequested: { type: Boolean, default: false },
    paymentResolutionNote: { type: String, default: null },
    paymentResolutionRequestedAt: { type: Date, default: null },

    paymentResolutionStatus: {
      type: String,
      enum: ["none", "requested", "under_review", "approved", "resolved"],
      default: "none",
    },
    paymentResolutionHandledAt: { type: Date, default: null },
    paymentResolutionHandledBy: { type: String, default: null },

    // مسارات المستندات المرفوعة
    fatherId: { type: String, default: null },
    motherId: { type: String, default: null },
    astatement: { type: String, default: null },
    marriageCert: { type: String, default: null },
    receipt: { type: String, default: null },

    certificateImage: { type: String, default: null },
    certificateNumber: { type: String, default: null, index: true },
    issuedAt: { type: Date, default: null },

    status: {
      type: String,
      enum: [
        "pending_payment",
        "pending",
        "waiting_verification",
        "approved",
        "ready",
        "rejected",
        "needs_revision",
        "payment_issue",
      ],
      default: "pending",
      index: true,
    },

    rejectionReason: { type: String, default: null },
    reviewNotes: { type: String, default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    revisionRequestNumber: { type: String, default: null },
    revisionField: { type: String, default: null },
    revisionReason: { type: String, default: null },

    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    statusHistory: { type: [statusHistorySchema], default: [] },
  },
  { timestamps: true }
);

// فهارس مركبة لتسريع البحث في لوحات الإدارة والموظفين
birthRequestSchema.index({ status: 1, createdAt: -1 });
birthRequestSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("BirthRequest", birthRequestSchema);