# BudgetCat

BudgetCat is a personal budget tracker built as a private project for simple, manual money tracking.

It is designed for everyday budgeting without bank connections, complicated finance dashboards, or public sharing. The goal is to make it easy to track income, expenses, bills, savings goals, and reports in one cozy, mobile-friendly app.

BudgetCat uses a warm visual style with cat-themed guidance, simple data entry, offline-first support, and sync between devices.

---

## What This Project Is

BudgetCat is a personal-use budgeting app for tracking:

- Salary and income
- Daily expenses
- Bills and due dates
- Savings goals
- Monthly and yearly reports
- Net amount, total outflow, and category spending

This project was created as a private personal finance tool, not as a public financial product or bank-connected app.

There is no bank integration. All data is entered manually by the user.

---

## Project Purpose

The purpose of BudgetCat is to solve a very practical personal problem:

> “I want a simple app where I can manually track my money, bills, savings, and spending without relying on spreadsheets or bank connections.”

The app is built to be:

- Simple enough for daily use
- Mobile-friendly
- Offline-capable
- Private
- Easy to understand
- Focused on personal budgeting habits

---

## Key Features

### Dashboard

The dashboard gives a quick overview of current budget activity, including:

- Income summary
- Expense summary
- Upcoming unpaid bills
- Savings goals
- Budget reminders
- Sync status

---

### Transactions

BudgetCat supports manual transaction tracking for:

- Salary / income
- Expenses
- Savings-related entries
- Category-based spending
- Payment method tracking

The app uses keyword/category logic so expenses can be grouped into readable reports.

---

### Bills and Due Dates

The bills section helps track upcoming and overdue payments.

Supported bill features include:

- Bill title
- Amount
- Due date
- Paid / unpaid status
- Overdue detection
- Reminder-style display
- Emoji/icon matching based on bill keywords

Examples:

- Electricity bills show an electric-style icon
- Water bills show a water-style icon
- Internet bills show a web-style icon
- Mortgage or rent shows a home-style icon

---

### Goals

BudgetCat includes savings goal tracking for personal targets such as:

- Emergency savings
- Travel goals
- Things to buy
- Other custom goals

Goals can show progress and remaining amount.

---

### Reports

The reports section gives written and visual summaries of local BudgetCat data.

Reports include:

- Salary / income total
- Expenses total
- Bills total
- Savings total
- Total outflow
- Net amount
- Highest expense category
- Highest bill
- Spending by category
- Year-based report selection
- Month or yearly filtering

The report logic starts from 2026 onward because this app was built as a new personal project.

---

### Offline-First Support

BudgetCat is designed to work as an offline-first PWA.

The app stores local data first, then syncs when online.

The goal is to allow the user to:

- Open the app after installation
- Add expenses while offline
- Continue tracking bills and goals
- Sync changes later when back online

---

### Sync Support

BudgetCat uses local storage and Supabase sync so the same account can access data across devices.

The intended sync flow is:

1. Save data locally first
2. Mark records as pending sync
3. Sync to Supabase when online
4. Pull updated records from Supabase on another device
5. Keep mobile and desktop data aligned

---

## Tech Stack

BudgetCat is built with:

- React
- TypeScript
- Vite
- Tailwind CSS
- Supabase Auth
- Supabase Postgres
- Dexie / IndexedDB
- PWA / Service Worker support
- Lucide icons

---

## Design Direction

BudgetCat uses a cozy finance tracker style instead of a generic fintech look.

The visual direction includes:

- Warm cream backgrounds
- Sage green primary actions
- Ginger-gold accents
- Soft card borders
- No heavy shadows
- Mobile-first layout
- Simple iconography
- Friendly cat mascot guidance

The design is meant to feel calm, personal, and easy to use.

---

## Privacy Notes

BudgetCat is a personal project.

Important privacy decisions:

- No bank connection
- No financial institution access
- No public user system
- Manual entry only
- Intended for private personal use
- Data is stored locally and synced only through the configured Supabase project

This app is not financial advice software.

---

## Local Development

### 1. Install dependencies

```bash
npm install
