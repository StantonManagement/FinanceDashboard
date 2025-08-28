-- Investment Properties Table
-- This table contains parsed data from investments.xlsx/csv

CREATE TABLE IF NOT EXISTS public.investments (
    id SERIAL PRIMARY KEY,
    
    -- Property Identification
    asset_id_plus_name TEXT,
    asset_id TEXT UNIQUE NOT NULL,
    portfolio_name TEXT,
    name_reduced TEXT,
    name_chfa TEXT,
    
    -- Property Details
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    address_full TEXT,
    
    -- Property Specifications
    unit_total INTEGER,
    units INTEGER,
    comm_units INTEGER,
    beds INTEGER,
    baths DECIMAL(3,2),
    half_baths INTEGER,
    rooms DECIMAL(4,2),
    property_type TEXT,
    scope_of_work TEXT,
    new_construction BOOLEAN,
    section_8_units BOOLEAN,
    pbv TEXT,
    leasing_status TEXT,
    
    -- Ownership & Management
    owner_llc TEXT,
    manager TEXT,
    owner_llc_co TEXT,
    ein TEXT,
    parcel_id TEXT,
    
    -- Location Data
    census_tract TEXT,
    poverty_pct_below DECIMAL(5,2),
    qualified_census_tract TEXT,
    walkscore INTEGER,
    
    -- Financial - Revenue
    proforma_revenue DECIMAL(12,2),
    egi DECIMAL(12,2),
    noi DECIMAL(12,2),
    going_in_noi DECIMAL(12,2),
    going_in_cap_rate DECIMAL(5,2),
    
    -- Financial - Expenses
    proforma_operating_expenses DECIMAL(12,2),
    exp_tax_prop DECIMAL(10,2),
    exp_prop_ins DECIMAL(10,2),
    exp_utilities DECIMAL(10,2),
    exp_rm DECIMAL(10,2),
    exp_payroll DECIMAL(10,2),
    exp_garbage DECIMAL(8,2),
    exp_pm_fee_admin DECIMAL(10,2),
    
    -- Purchase & Valuation
    purchase_price DECIMAL(12,2),
    down_payment DECIMAL(12,2),
    appraised_value DECIMAL(12,2),
    date_of_last_appraisal DATE,
    appraisal_firm TEXT,
    assessed_value DECIMAL(12,2),
    assessment_date DATE,
    
    -- Debt Information
    debt1_initial DECIMAL(12,2),
    debt1_int_rate DECIMAL(5,2),
    maturity_date DATE,
    ltv_ratio DECIMAL(5,2),
    dsv_ratio DECIMAL(5,2),
    debt_service DECIMAL(10,2),
    mortgage_holder TEXT,
    
    -- Property Characteristics
    built INTEGER,
    renovated_last INTEGER,
    building_sf INTEGER,
    building_sf_finished INTEGER,
    unit_sf_avg INTEGER,
    land_sf INTEGER,
    stories INTEGER,
    roof_type TEXT,
    roof_cover TEXT,
    
    -- Systems & Utilities
    heat_fuel TEXT,
    heat_type TEXT,
    heat_sys_count INTEGER,
    cooking_fuel TEXT,
    ac_type TEXT,
    ac_included BOOLEAN,
    parking_spots_count DECIMAL(4,2),
    
    -- Unit Mix
    br_0 INTEGER,
    br_1 INTEGER,
    br_2 INTEGER,
    br_3 INTEGER,
    br_4 INTEGER,
    
    -- Utilities
    electric_utility_company TEXT,
    electric_account TEXT,
    gas_utility_company TEXT,
    gas_account TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_investments_asset_id ON public.investments(asset_id);
CREATE INDEX IF NOT EXISTS idx_investments_portfolio ON public.investments(portfolio_name);
CREATE INDEX IF NOT EXISTS idx_investments_property_type ON public.investments(property_type);
CREATE INDEX IF NOT EXISTS idx_investments_city ON public.investments(city);

-- Enable RLS (Row Level Security) if needed
-- ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

-- Add comments for documentation
COMMENT ON TABLE public.investments IS 'Investment properties data parsed from Excel/CSV files';
COMMENT ON COLUMN public.investments.asset_id IS 'Unique property identifier (e.g., S0001, S0002)';
COMMENT ON COLUMN public.investments.noi IS 'Net Operating Income';
COMMENT ON COLUMN public.investments.going_in_cap_rate IS 'Going-in Capitalization Rate as percentage';
COMMENT ON COLUMN public.investments.ltv_ratio IS 'Loan-to-Value Ratio as percentage';
COMMENT ON COLUMN public.investments.dsv_ratio IS 'Debt Service Coverage Ratio';