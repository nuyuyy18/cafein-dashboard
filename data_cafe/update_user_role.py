import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables from parent directory
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(env_path)

url = os.environ.get("VITE_SUPABASE_URL")
key = os.environ.get("VITE_SUPABASE_PUBLISHABLE_KEY")

if not url or not key:
    print("Error: Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY")
    exit(1)

supabase: Client = create_client(url, key)

def update_user_role_to_admin(username: str):
    """
    Update user role to admin based on profile full_name
    """
    try:
        # 1. Find user by full_name (case-insensitive)
        print(f"Searching for user with full_name containing: {username}")
        profile_response = supabase.table("profiles").select("*").ilike("full_name", f"%{username}%").execute()
        
        if not profile_response.data or len(profile_response.data) == 0:
            print(f"Error: No user found with full_name containing '{username}'")
            print("Let me list all profiles to help you find the correct name:")
            all_profiles = supabase.table("profiles").select("user_id, full_name").execute()
            if all_profiles.data:
                print("\nAvailable profiles:")
                for p in all_profiles.data:
                    print(f"  - {p.get('full_name', 'N/A')} (ID: {p['user_id']})")
            return False
        
        # If multiple matches, show them
        if len(profile_response.data) > 1:
            print(f"\nFound {len(profile_response.data)} matching users:")
            for idx, p in enumerate(profile_response.data, 1):
                print(f"{idx}. {p.get('full_name', 'N/A')} (ID: {p['user_id']})")
            print("\nUsing the first match...")
        
        profile = profile_response.data[0]
        user_id = profile['user_id']
        print(f"\nSelected user: {profile.get('full_name', 'N/A')} (ID: {user_id})")
        
        # 2. Check existing roles
        roles_response = supabase.table("user_roles").select("*").eq("user_id", user_id).execute()
        
        existing_roles = [r['role'] for r in roles_response.data] if roles_response.data else []
        print(f"Current roles: {existing_roles}")
        
        # 3. Check if admin role already exists
        if 'admin' in existing_roles:
            print(f"\n✅ User '{profile.get('full_name')}' already has admin role!")
            return True
        
        # 4. Add admin role
        print(f"\nAdding admin role to user '{profile.get('full_name')}'...")
        insert_response = supabase.table("user_roles").insert({
            "user_id": user_id,
            "role": "admin"
        }).execute()
        
        if insert_response.data:
            print(f"\n✅ Successfully added admin role!")
            print(f"Updated roles: {existing_roles + ['admin']}")
            return True
        else:
            print(f"\n❌ Error: Failed to add admin role")
            return False
            
    except Exception as e:
        print(f"\n❌ Error updating user role: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("UPDATE USER ROLE TO ADMIN")
    print("=" * 60)
    
    # Update role for user with full_name containing "cafein" or "CafeIn"
    success = update_user_role_to_admin("cafein")
    
    print("\n" + "=" * 60)
    if success:
        print("🎉 ROLE SUCCESSFULLY UPDATED TO ADMIN!")
        print("=" * 60)
        print("\n📌 Next steps:")
        print("   1. Refresh your browser (Ctrl+F5 or Cmd+Shift+R)")
        print("   2. You may need to logout and login again")
        print("   3. Check Settings page - Role should show 'Admin'")
    else:
        print("❌ FAILED TO UPDATE ROLE")
        print("=" * 60)

