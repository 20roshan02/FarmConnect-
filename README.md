# FarmConnect(BMC-BCA 8th Sem-Amit Bahadur Kandel and Roshan Gurung)

FarmConnect is a full-stack web platform that connects farmers and customers through a direct online marketplace. It supports product browsing, cart and orders, role-based dashboards (customer, farmer, admin), and integrated payment flows.

## Tech Stack
- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** Node.js + Express + MongoDB (Mongoose)

## Quick Start
1. Install dependencies:
   - `cd /home/runner/work/FarmConnect-/FarmConnect-/client && npm install`
   - `cd /home/runner/work/FarmConnect-/FarmConnect-/server && npm install`
2. Set environment variables:
   - `client/.env`: `VITE_API_URL`
   - `server/.env`: `PORT`, `MONGO_URI`, `JWT_SECRET`, `REFRESH_SECRET`, `FRONTEND_URL`, `CLOUDINARY_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `MAIL_USER`, `MAIL_PASS`
3. Start both apps:
   - Frontend: `cd /home/runner/work/FarmConnect-/FarmConnect-/client && npm run dev`
   - Backend: `cd /home/runner/work/FarmConnect-/FarmConnect-/server && npm run dev`

## API Base
- Backend runs on `http://localhost:3000`
- API routes are served under `/api/v1/*`
