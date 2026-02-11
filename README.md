# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase (Backend & Database)

## How can I deploy this project?

### Deploy to Vercel (Recommended)

This project is pre-configured for deployment to Vercel with [`vercel.json`](vercel.json).

#### Prerequisites
- A [Vercel account](https://vercel.com/signup)
- Your Supabase credentials (found in `.env` file)

#### Deployment Steps

1. **Install Vercel CLI** (optional, for command-line deployment)
   ```sh
   npm i -g vercel
   ```

2. **Deploy via Vercel Dashboard** (easiest method)
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your Git repository
   - Vercel will auto-detect the Vite framework
   - Click "Deploy"

3. **Configure Environment Variables**
   
   After deployment, add these environment variables in Vercel dashboard:
   - Go to your project → Settings → Environment Variables
   - Add the following variables (copy values from your `.env` file):
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_PUBLISHABLE_KEY`
     - `VITE_SUPABASE_PROJECT_ID`

4. **Redeploy**
   - After adding environment variables, trigger a new deployment
   - Go to Deployments → click "..." → Redeploy

#### Deploy via CLI

```sh
# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

When prompted, set environment variables or add them via the Vercel dashboard.

#### Post-Deployment Checklist

- [ ] Application loads without errors
- [ ] Login/logout functionality works
- [ ] All routes are accessible
- [ ] Map displays correctly
- [ ] Data loads from Supabase
- [ ] Images display properly
- [ ] Admin features work (for admin users)

### Deploy via Lovable

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my project?

Yes, you can!

### For Vercel Deployments
- Navigate to your Vercel project → Settings → Domains
- Click "Add Domain" and follow the instructions

### For Lovable Deployments
- Navigate to Project > Settings > Domains and click Connect Domain
- Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

