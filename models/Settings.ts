import mongoose, { Schema, Document, Model } from 'mongoose';

export interface SettingsDocument extends Document {
  key: string;
  value: number;
}

const SettingsSchema = new Schema<SettingsDocument>({
  key: { type: String, required: true, unique: true },
  value: { type: Number, required: true },
});

const Settings: Model<SettingsDocument> =
  (mongoose.models.Settings as Model<SettingsDocument>) ||
  mongoose.model<SettingsDocument>('Settings', SettingsSchema);

export default Settings;
