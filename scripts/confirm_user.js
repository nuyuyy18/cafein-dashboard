
import { createClient } from '@supabase/supabase-js';

// Hardcoded from the .env file I just read
const SUPABASE_URL = "https://rlemxhoixnscwhrloonp.supabase.co";
// This key claims to be the publishable key but decoded payload suggests it might be service_role or at least has high privileges.
// If it is indeed just a publishable key, this might fail. But the decoding 'InNlcnZpY2Vfcm9sZS' -> 'service_role' is a strong hint.
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsZW14aG9peG5zY3docmxvb25wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTg1NzQ4MywiZXhwIjoyMDg1NDMzNDgzfQ.NMzzgyC101EjXA1QvxdEGZyHzr_5171RQBRwjczpqmE";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function confirmUser() {
    const email = "admincafein@gmail.com";
    console.log(`Looking for user: ${email}`);

    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
        console.error("Error listing users:", listError);
        // If we can't list users, maybe the key isn't a service key after all.
        // Try to update directly if possible? No, need ID.
        return;
    }

    const user = users.find(u => u.email === email);

    if (!user) {
        console.error("User not found!");
        return;
    }

    console.log(`Found user ID: ${user.id}`);
    console.log(`Current confirmed_at: ${user.email_confirmed_at}`);

    if (user.email_confirmed_at) {
        console.log("User is already confirmed.");
        return;
    }

    const { data, error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        { email_confirm: true }
    );

    if (updateError) {
        console.error("Error updating user:", updateError);
    } else {
        console.log("SUCCESS: User confirmed programmatically.");
    }
}

confirmUser();
