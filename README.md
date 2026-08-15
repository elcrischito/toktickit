# TokTickIT

TokTickIT is an IT service desk application for Account and Access, Hardware, Software, and Network requests.

This repository contains the Lab 1 full-stack vertical slice: a React frontend, an Express/TypeScript backend, and a PostgreSQL database managed with Prisma.

## Tech Stack

- **Frontend:** React + TypeScript + Vite + Bootstrap
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL + Prisma ORM
- **Testing:** Vitest (frontend) + Supertest (backend)

## Project Structure

    toktickit/
    ├── client/          # React frontend
    ├── server/          # Express backend + Prisma
    │   ├── prisma/      # Prisma schema, migrations, seed
    │   ├── src/         # Backend source code
    │   └── tests/       # Backend tests
    ├── docs/lab-01/     # Lab 1 documentation
    └── .gitignore

## Prerequisites

- Node.js (LTS)
- PostgreSQL running locally
- npm

## Setup

### 1. Clone the repository

    git clone https://github.com/elcrischito/toktickit.git
    cd toktickit

### 2. Backend setup

    cd server
    npm install
    cp .env.example .env
    npx prisma migrate dev
    npx prisma db seed
    npm run dev

The backend runs on `http://localhost:4000` by default.

### 3. Frontend setup

Open a new terminal:

    cd client
    npm install
    cp .env.example .env
    npm run dev

The frontend runs on `http://localhost:5173` by default (Vite default port).

## Running Tests

### Backend tests

    cd server
    npm test

### Frontend tests

    cd client
    npm test

## Usage

1. Start the backend server (`server/`)
2. Start the frontend dev server (`client/`)
3. Open the frontend in your browser
4. Click **Check System** to verify the backend health and view the supported request categories