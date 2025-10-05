# Deploy to Render

This repo contains a Node/Express app in `realtime-feedback/`. Use the Render Blueprint in `RENDER_DEPLOY/render.yaml` to deploy it from a subdirectory.

## Prerequisites
- A Git repository containing this project
- A Render account
- Values for the following environment variables:
  - `GROQ_API_KEY` (required)
  - `SUPABASE_URL` (optional; only if you use Supabase auth/storage)
  - `SUPABASE_ANON_KEY` (optional)

## One-click deploy using Blueprint
1. Push this project to your own GitHub/GitLab repo.
2. In Render, go to New -> Blueprint.
3. Provide your repository URL and select the branch.
4. Render will read `RENDER_DEPLOY/render.yaml` and create a `web` service:
   - Root directory: `realtime-feedback`
   - Build: `npm install`
   - Start: `npm start`
5. Add the required environment variables in the Render dashboard.
6. Deploy.

## Manual service configuration (without Blueprint)
1. Create a new Web Service in Render and connect your repo.
2. Set Root Directory to `realtime-feedback`.
3. Runtime: Node
4. Build Command: `npm install`
5. Start Command: `npm start`
6. Add environment variables noted above.
7. Deploy.

## Quick upload for this project
If you prefer a minimal repo to upload:
1. Create a new repository whose root contains ONLY the contents of `RENDER_DEPLOY/realtime-feedback/`.
2. Connect that repo to Render as a Web Service (no rootDir needed).
3. Build command: `npm install`, Start command: `npm start`.
4. Add `GROQ_API_KEY` (and optional Supabase vars), then deploy.

## Notes
- The server listens on `process.env.PORT` (Render sets this automatically).
- Static files are served from `realtime-feedback/public/`.
- Home path `/` serves `student.html`; `/console` serves `teacher.html`.
