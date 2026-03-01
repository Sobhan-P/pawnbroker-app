import mongoose, { Schema, Document, Model } from 'mongoose';

export type AuditAction =
  | 'loan_created'
  | 'loan_closed'
  | 'interest_paid'
  | 'partial_payment'
  | 'user_created'
  | 'user_deleted';

export interface AuditLogDocument extends Document {
  action: AuditAction;
  performedBy: mongoose.Types.ObjectId;
  performedByName: string;
  loanId?: mongoose.Types.ObjectId;
  glNumber?: string;
  clientName?: string;
  amount?: number;
  details?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<AuditLogDocument>(
  {
    action: {
      type: String,
      enum: ['loan_created', 'loan_closed', 'interest_paid', 'partial_payment', 'user_created', 'user_deleted'],
      required: true,
    },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    performedByName: { type: String, required: true },
    loanId: { type: Schema.Types.ObjectId, ref: 'Client' },
    glNumber: { type: String },
    clientName: { type: String },
    amount: { type: Number },
    details: { type: String },
  },
  { timestamps: true }
);

const AuditLog: Model<AuditLogDocument> =
  (mongoose.models.AuditLog as Model<AuditLogDocument>) ||
  mongoose.model<AuditLogDocument>('AuditLog', AuditLogSchema);

export default AuditLog;
