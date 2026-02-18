# Phase 7 — Receipt OCR (Premium)

Upload receipt photos, auto-extract items and amounts, suggest categories.

## Status: Not Started

## Scope

Receipt image upload, OCR processing via AI, auto-populate expense form.

## Architecture
- Frontend uploads receipt image to Supabase Storage (or S3)
- Backend processes via OpenAI Vision API (or AWS Textract)
- Returns extracted items with suggested categories
- User reviews and confirms before expenses are created

## Backend
- `POST /v1/receipts/scan` — upload image, return extracted data
- Receipt processing service (OpenAI Vision or Textract)
- Map extracted merchant names to categories using fuzzy matching
- Store OCR results in `receipts` table

## Frontend
- Camera/file upload component
- Review screen showing extracted items with editable fields
- Bulk create expenses from confirmed items

## Infrastructure
- Supabase Storage bucket for receipt images (or S3)
- OpenAI API key or AWS Textract configuration

## Definition of Done
- Can upload receipt photo
- Items and amounts extracted automatically
- Categories suggested based on vendor/item names
- User can review, edit, and confirm before creating expenses
