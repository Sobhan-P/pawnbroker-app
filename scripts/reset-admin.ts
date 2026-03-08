import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('Error: MONGODB_URI is not defined in .env.local');
    process.exit(1);
}

async function resetAdmin() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI!);
        console.log('Connected successfully.');

        // Import the model after connection if needed, 
        // but here we can just use the collection directly to be safe from model initialization issues in scripts
        const db = mongoose.connection.db;
        if (!db) {
            throw new Error('Database connection not established');
        }

        const collection = db.collection('users');

        console.log('Searching for admin users...');
        const adminCount = await collection.countDocuments({ role: 'admin' });
        console.log(`Found ${adminCount} admin user(s).`);

        if (adminCount > 0) {
            console.log('Deleting admin users...');
            const result = await collection.deleteMany({ role: 'admin' });
            console.log(`Successfully deleted ${result.deletedCount} admin user(s).`);
        } else {
            console.log('No admin users found to delete.');
        }

        console.log('Reset complete. You should now be able to run the setup flow.');
    } catch (error) {
        console.error('An error occurred:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

resetAdmin();
