-- Add ulpin column to parcels table
ALTER TABLE parcels
ADD COLUMN ulpin TEXT UNIQUE;
