import dotenv from 'dotenv';
import connectDB from './src/db/connection';
import app from './src/app';
import { initializeResumeQueue } from './src/services/resumeQueue';

dotenv.config();

const PORT = process.env.PORT || '3000';

connectDB()
  .then(async () => {
    await initializeResumeQueue();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to start server:', message);
    process.exit(1);
  });
