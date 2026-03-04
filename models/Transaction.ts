import mongoose, { Schema, Document, Model } from 'mongoose';

export interface TransactionDocument extends Document {
  date: Date;
  type: 'income' | 'expense';
  amount: number;
  tag: string;
  description?: string;
  recordedBy?: mongoose.Types.ObjectId;
  recordedByName?: string;
  createdAt: Date;
}

const TransactionSchema = new Schema<TransactionDocument>(
  {
    date: { type: Date, required: true },
    type: { type: String, enum: ['income', 'expense'], required: true },
    amount: { type: Number, required: true, min: 0 },
    tag: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    recordedByName: { type: String },
  },
  { timestamps: true }
);

const Transaction: Model<TransactionDocument> =
  (mongoose.models.Transaction as Model<TransactionDocument>) ||
  mongoose.model<TransactionDocument>('Transaction', TransactionSchema);

export default Transaction;
