-- Create business_contacts table with exact column structure
CREATE TABLE business_contacts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  company_name TEXT,
  contact_person TEXT,
  contact_type TEXT NOT NULL CHECK (contact_type IN ('supplier', 'distributor', 'reseller')),
  position TEXT
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_business_contacts_contact_type ON business_contacts(contact_type);
CREATE INDEX IF NOT EXISTS idx_business_contacts_name ON business_contacts(name);

-- Disable RLS (using supabaseAdmin which bypasses RLS)
ALTER TABLE business_contacts DISABLE ROW LEVEL SECURITY;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_business_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER business_contacts_updated_at
BEFORE UPDATE ON business_contacts
FOR EACH ROW
EXECUTE FUNCTION update_business_contacts_updated_at();

-- Insert sample data
INSERT INTO business_contacts (id, name, email, phone, address, notes, company_name, contact_person, contact_type, position)
VALUES 
  ('CONTACT-1779810', 'WIHI Asia Market', 'jhukee1h1072@gmail.com', '09558979632', 'Montalban Rizal', NULL, 'Aizen Jhake Rivera', 'supplier', 'Purchaser'),
  ('CONTACT-1781828', 'Cango Marketing', 'pos@en---lumiere.com', '+639558979632', 'Sitio Sapang Buho', NULL, 'Marjake Rivera', 'supplier', 'Purchaser')
ON CONFLICT DO NOTHING;
