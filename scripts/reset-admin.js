const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Basic env loader
function loadEnv() {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const parts = line.split('=');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                const value = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
                process.env[key] = value;
            }
        });
    }
}

loadEnv();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('Error: MONGODB_URI is not defined in .env.local');
    process.exit(1);
}

async function resetAdmin() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected successfully.');

        const db = mongoose.connection.db;
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
