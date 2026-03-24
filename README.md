# WalkThru — Guided Business Process Tours

## Project Info

WalkThru helps you create interactive guided tours for any web application. Auto-generate or manually create step-by-step walkthroughs for end-user training and on-screen help.

## How can I edit this code?

**Use VS Code**

Clone this repo and open it in VS Code. Push changes to deploy via the CI/CD pipeline.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

```sh
# Step 1: Clone the repository
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory
cd walkthru

# Step 3: Install dependencies
npm i

# Step 4: Start the development server
npm run dev
```

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Azure Functions (backend API)
- Azure PostgreSQL (database)
- Azure Blob Storage (file storage)

## How can I deploy this project?

The project is deployed via GitHub Actions to Azure Static Web Apps. Push to the `main` branch to trigger a deployment.

Azure Functions are deployed separately:

```bash
cd azure-functions
npm run build
func azure functionapp publish walkthru-api
```
