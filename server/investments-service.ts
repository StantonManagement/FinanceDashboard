// Investment Properties Service
// Integrates with Supabase investments table

export interface InvestmentProperty {
  id: number;
  asset_id: string;
  asset_id_plus_name: string;
  portfolio_name: string;
  name_reduced: string;
  name_chfa?: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  address_full: string;
  unit_total?: number;
  units?: number;
  comm_units?: number;
  beds?: number;
  baths?: number;
  half_baths?: number;
  rooms?: number;
  property_type: string;
  scope_of_work?: string;
  new_construction?: boolean;
  section_8_units?: boolean;
  pbv?: string;
  leasing_status: string;
  owner_llc: string;
  manager: string;
  owner_llc_co?: string;
  ein?: string;
  parcel_id?: string;
  census_tract?: string;
  poverty_pct_below?: number;
  qualified_census_tract?: string;
  walkscore?: number;
  proforma_revenue?: number;
  egi?: number;
  noi?: number;
  going_in_noi?: number;
  going_in_cap_rate?: number;
  proforma_operating_expenses?: number;
  exp_tax_prop?: number;
  exp_prop_ins?: number;
  exp_utilities?: number;
  exp_rm?: number;
  exp_payroll?: number;
  exp_garbage?: number;
  exp_pm_fee_admin?: number;
  purchase_price?: number;
  down_payment?: number;
  appraised_value?: number;
  date_of_last_appraisal?: string;
  appraisal_firm?: string;
  assessed_value?: number;
  assessment_date?: string;
  debt1_initial?: number;
  debt1_int_rate?: number;
  maturity_date?: string;
  ltv_ratio?: number;
  dsv_ratio?: number;
  debt_service?: number;
  mortgage_holder?: string;
  built?: number;
  renovated_last?: number;
  building_sf?: number;
  building_sf_finished?: number;
  unit_sf_avg?: number;
  land_sf?: number;
  stories?: number;
  roof_type?: string;
  roof_cover?: string;
  heat_fuel?: string;
  heat_type?: string;
  heat_sys_count?: number;
  cooking_fuel?: string;
  ac_type?: string;
  ac_included?: boolean;
  parking_spots_count?: number;
  br_0?: number;
  br_1?: number;
  br_2?: number;
  br_3?: number;
  br_4?: number;
  electric_utility_company?: string;
  electric_account?: string;
  gas_utility_company?: string;
  gas_account?: string;
  created_at: string;
  updated_at: string;
}

export interface InvestmentSummary {
  total_properties: number;
  total_units: number;
  total_noi: number;
  total_revenue: number;
  avg_cap_rate: number;
  portfolios: {
    name: string;
    property_count: number;
    total_units: number;
    total_noi: number;
  }[];
}

// SQL queries for investments data
export const INVESTMENT_QUERIES = {
  GET_ALL_PROPERTIES: `
    SELECT * FROM public.investments 
    ORDER BY asset_id
  `,
  
  GET_PROPERTY_BY_ID: (assetId: string) => `
    SELECT * FROM public.investments 
    WHERE asset_id = '${assetId}'
  `,
  
  GET_PROPERTIES_BY_PORTFOLIO: (portfolio: string) => `
    SELECT * FROM public.investments 
    WHERE portfolio_name ILIKE '%${portfolio}%'
    ORDER BY asset_id
  `,
  
  GET_PORTFOLIO_SUMMARY: `
    SELECT 
      COUNT(*) as total_properties,
      SUM(units) as total_units,
      SUM(noi) as total_noi,
      SUM(proforma_revenue) as total_revenue,
      AVG(going_in_cap_rate) as avg_cap_rate
    FROM public.investments
    WHERE units IS NOT NULL
  `,
  
  GET_PORTFOLIO_BREAKDOWN: `
    SELECT 
      portfolio_name as name,
      COUNT(*) as property_count,
      SUM(COALESCE(units, 0)) as total_units,
      SUM(COALESCE(noi, 0)) as total_noi
    FROM public.investments
    GROUP BY portfolio_name
    ORDER BY total_noi DESC
  `,
  
  GET_FINANCIAL_SUMMARY: (assetId: string) => `
    SELECT 
      asset_id,
      asset_id_plus_name,
      noi,
      proforma_revenue,
      proforma_operating_expenses,
      going_in_cap_rate,
      debt_service,
      ltv_ratio,
      dsv_ratio,
      debt1_int_rate
    FROM public.investments 
    WHERE asset_id = '${assetId}'
  `,
  
  SEARCH_PROPERTIES: (searchTerm: string) => `
    SELECT asset_id, asset_id_plus_name, portfolio_name, property_type, city, noi, units
    FROM public.investments 
    WHERE 
      asset_id_plus_name ILIKE '%${searchTerm}%' OR
      address ILIKE '%${searchTerm}%' OR
      portfolio_name ILIKE '%${searchTerm}%' OR
      property_type ILIKE '%${searchTerm}%'
    ORDER BY asset_id
    LIMIT 20
  `
};

export const SUPABASE_PROJECT_ID = 'wkwmxxlfheywwbgdbzxe'; // Invoices project