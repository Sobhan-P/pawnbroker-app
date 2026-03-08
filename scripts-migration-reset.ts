import { connectDB } from './lib/mongodb';
import User from './models/User';

async function resetAdmin() {
    try {
        await connectDB();
        console.log("Connected to MongoDB...");
        const result = await User.deleteMany({});
        console.log(`Successfully cleared ${result.deletedCount} users.`);
        console.log("Migration successful. You can now visit /setup to create a new admin.");
        process.exit(0);
    } catch (err) {
        console.error("Migration error:", err);
        process.exit(1);
    }
}

resetAdmin();
