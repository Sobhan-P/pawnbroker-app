import mongoose, { Schema, Document, Model } from 'mongoose';

export interface PaymentEntry {
  date: Date;
  type: 'interest' | 'partial' | 'full';
  amountPaid: number;
  principalReduced: number;
  interestPaid: number;
  facePhotoUrl?: string;
  jewelleryPhotoUrl?: string;
  resetsInterestClock?: boolean;
  discount?: number;
  processedBy?: mongoose.Types.ObjectId;
  processedByName?: string;
}

export interface ClientDocument extends Document {
  serialNumber: number;
  glNumber?: string;
  name: string;
  contactNumber: string;
  jewelleryDetails: string;
  goldWeight: number;
  goldWeightGross?: number;
  goldWeightNet?: number;
  pawnAmount: number;
  interestRate?: number; // legacy field, kept for backward compat
  pawnDate: Date;
  expectedReturnDate: Date;
  facePhotoUrl?: string;
  kycDocumentUrl?: string;
  kycBackDocumentUrl?: string;
  jewelleryPhotoUrl?: string;
  closingFacePhotoUrl?: string;
  closingJewelleryPhotoUrl?: string;
  status: 'active' | 'closed';
  closedDate?: Date;
  totalAmountPaid?: number;
  payments: PaymentEntry[];
  createdBy?: mongoose.Types.ObjectId;
  createdByName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<PaymentEntry>(
  {
    date: { type: Date, required: true },
    type: { type: String, enum: ['interest', 'partial', 'full'], required: true },
    amountPaid: { type: Number, required: true },
    principalReduced: { type: Number, default: 0 },
    interestPaid: { type: Number, default: 0 },
    facePhotoUrl: { type: String },
    jewelleryPhotoUrl: { type: String },
    resetsInterestClock: { type: Boolean },
    discount: { type: Number },
    processedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    processedByName: { type: String },
  },
  { _id: true }
);

const ClientSchema = new Schema<ClientDocument>(
  {
    serialNumber: { type: Number, unique: true, sparse: true },
    glNumber: { type: String, unique: true, sparse: true, trim: true },
    name: { type: String, required: true, trim: true },
    contactNumber: { type: String, required: true, trim: true },
    jewelleryDetails: { type: String, required: true },
    goldWeight: { type: Number, required: true },
    goldWeightGross: { type: Number },
    goldWeightNet: { type: Number },
    pawnAmount: { type: Number, required: true },
    interestRate: { type: Number },
    pawnDate: { type: Date, required: true },
    expectedReturnDate: { type: Date, required: true },
    facePhotoUrl: { type: String },
    kycDocumentUrl: { type: String },
    kycBackDocumentUrl: { type: String },
    jewelleryPhotoUrl: { type: String },
    closingFacePhotoUrl: { type: String },
    closingJewelleryPhotoUrl: { type: String },
    status: { type: String, enum: ['active', 'closed'], default: 'active' },
    closedDate: { type: Date },
    totalAmountPaid: { type: Number },
    payments: { type: [PaymentSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdByName: { type: String },
  },
  { timestamps: true }
);

const Client: Model<ClientDocument> =
  (mongoose.models.Client as Model<ClientDocument>) ||
  mongoose.model<ClientDocument>('Client', ClientSchema);

export default Client;
