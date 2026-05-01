-- Add CIMCO motif
ALTER TYPE ticket_motif ADD VALUE IF NOT EXISTS 'cimco';

-- Add CIMCO contract type
ALTER TYPE contract_type ADD VALUE IF NOT EXISTS 'cimco';

-- Purge existing client/contact/contract data (keeping schema and tickets)
DELETE FROM public.client_contacts;
DELETE FROM public.clients;