import Profile from '../models/Profile';
import User from '../models/User';

/** Copy legacy favorites once, without needing to create a public specialist profile. */
export async function initializeAccountFavorites(userId: string): Promise<boolean> {
  const account = await User.findById(userId).select('favoriteJobs').lean();
  if (!account) return false;
  if (Array.isArray(account.favoriteJobs)) return true;
  const profile = await Profile.findOne({ userId }).select('favoriteJobs').lean();
  // The empty array is the migration marker: deleted favorites must not be reimported.
  await User.updateOne({ _id: userId, $or: [{ favoriteJobs: { $exists: false } }, { favoriteJobs: null }] }, {
    $set: { favoriteJobs: profile?.favoriteJobs ?? [] },
  });
  return true;
}
