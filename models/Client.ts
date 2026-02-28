import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ClientDocument extends Document {
  serialNumber: number;
  name: string;
  contactNumber: string;
  jewelleryDetails: string;
  goldWeight: number;
  pawnAmount: number;
  interestRate: number;
  pawnDate: Date;
  expectedReturnDate: Date;
  facePhotoUrl?: string;
  kycDocumentUrl?: string;
  jewelleryPhotoUrl?: string;
  status: 'active' | 'closed';
  closedDate?: Date;
  totalAmountPaid?: number;
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema = new Schema<ClientDocument>(
  {
    serialNumber: { type: Number, unique: true, sparse: true },
    name: { type: String, required: true, trim: true },
    contactNumber: { type: String, required: true, trim: true },
    jewelleryDetails: { type: String, required: true },
    goldWeight: { type: Number, required: true },
    pawnAmount: { type: Number, required: true },
    interestRate: { type: Number, required: true },
    pawnDate: { type: Date, required: true },
    expectedReturnDate: { type: Date, required: true },
    facePhotoUrl: { type: String },
    kycDocumentUrl: { type: String },
    jewelleryPhotoUrl: { type: String },
    status: { type: String, enum: ['active', 'closed'], default: 'active' },
    closedDate: { type: Date },
    totalAmountPaid: { type: Number },
  },
  { timestamps: true }
);

const Client: Model<ClientDocument> =
  (mongoose.models.Client as Model<ClientDocument>) ||
  mongoose.model<ClientDocument>('Client', ClientSchema);

export default Client;
