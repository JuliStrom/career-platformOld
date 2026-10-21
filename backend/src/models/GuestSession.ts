import mongoose, { Schema } from 'mongoose';

const schema = new Schema({
  // guest_id is a bearer credential; persist only its hash.
  keyHash: { type: String, required: true, unique: true, select: false },
  ownerId: { type: String, default: null, index: true },
  firstTouch: { type: Schema.Types.Mixed, required: true },
  language: { type: String, default: 'ru' },
  draft: { type: Schema.Types.Mixed, select: false },
  expiresAt: Date,
}, { timestamps: true });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export default mongoose.model('GuestSession', schema);
