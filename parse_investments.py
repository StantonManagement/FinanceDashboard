import pandas as pd
import re
from datetime import datetime

def clean_currency(value):
    """Convert currency strings to decimal values"""
    if pd.isna(value) or value == '':
        return None
    if isinstance(value, str):
        # Remove $ and commas, handle parentheses for negative values
        cleaned = re.sub(r'[,$\s]', '', str(value))
        if '(' in cleaned and ')' in cleaned:
            cleaned = cleaned.replace('(', '-').replace(')', '')
        try:
            return float(cleaned)
        except (ValueError, TypeError):
            return None
    return value

def clean_percentage(value):
    """Convert percentage strings to decimal values"""
    if pd.isna(value) or value == '':
        return None
    if isinstance(value, str) and '%' in str(value):
        try:
            return float(str(value).replace('%', ''))
        except (ValueError, TypeError):
            return None
    return value

def clean_date(value):
    """Convert date strings to proper format"""
    if pd.isna(value) or value == '':
        return None
    if isinstance(value, str):
        # Try different date formats
        for fmt in ['%m/%d/%Y', '%m/%d/%y', '%Y-%m-%d']:
            try:
                return datetime.strptime(value, fmt).date()
            except ValueError:
                continue
    return None

def clean_boolean(value):
    """Convert Yes/No to boolean"""
    if pd.isna(value) or value == '':
        return None
    if isinstance(value, str):
        val = str(value).lower().strip()
        if val in ['yes', 'true', '1']:
            return True
        elif val in ['no', 'false', '0']:
            return False
    return None

def clean_integer(value):
    """Convert strings to integers"""
    if pd.isna(value) or value == '':
        return None
    try:
        return int(float(str(value)))
    except (ValueError, TypeError):
        return None

def clean_decimal(value):
    """Convert strings to decimals"""
    if pd.isna(value) or value == '':
        return None
    try:
        return float(str(value))
    except (ValueError, TypeError):
        return None

# Read and process the CSV
df = pd.read_csv(r'd:\WORK Files\Stanton\investments.csv', encoding='utf-8-sig')
headers = df.iloc[1].fillna('').values
data = df.iloc[2:].values
clean_df = pd.DataFrame(data, columns=headers)

# Filter out empty rows and rows without Asset ID
clean_df = clean_df.dropna(how='all')
clean_df = clean_df[clean_df['Asset ID'].notna() & (clean_df['Asset ID'] != '')]

print(f"Processing {len(clean_df)} properties...")

# Create column mapping for SQL insert
column_mapping = {
    'Asset ID + Name': 'asset_id_plus_name',
    'Asset ID': 'asset_id',
    'Portfolio Name': 'portfolio_name',
    'Name - Reducd': 'name_reduced',
    'Name - CHFA': 'name_chfa',
    'Address': 'address',
    'City': 'city',
    'State': 'state',
    'ZIP Code': 'zip_code',
    'Address - Full': 'address_full',
    'Unit Total': 'unit_total',
    'Units': 'units',
    'Comm Units': 'comm_units',
    'Beds': 'beds',
    'Baths': 'baths',
    'Half Baths': 'half_baths',
    'Rooms': 'rooms',
    'Property Type': 'property_type',
    'Scope of Work - Orig': 'scope_of_work',
    'New Const?': 'new_construction',
    'Sect 8 Units?': 'section_8_units',
    'PBV': 'pbv',
    'Leasing Status - Initial': 'leasing_status',
    'Owner LLC': 'owner_llc',
    'Manager': 'manager',
    'Owner LLC co': 'owner_llc_co',
    'EIN': 'ein',
    'Parcel ID': 'parcel_id',
    'Census Tract': 'census_tract',
    'Poverty - % Below': 'poverty_pct_below',
    'Qualified Census Tract': 'qualified_census_tract',
    'Walkscore': 'walkscore',
    'Proforma Revenue': 'proforma_revenue',
    'EGI': 'egi',
    'NOI': 'noi',
    'Going-in NOI': 'going_in_noi',
    'Going-In Cap Rate': 'going_in_cap_rate',
    'Proforma Operating Expenses': 'proforma_operating_expenses',
    'Exp - Tax - Prop': 'exp_tax_prop',
    'Exp - Prop Ins.': 'exp_prop_ins',
    'Exp - Utilities': 'exp_utilities',
    'Exp - R&M': 'exp_rm',
    'Exp - Payroll': 'exp_payroll',
    'Exp - Garbage': 'exp_garbage',
    'Exp - PM Fee + Admin': 'exp_pm_fee_admin',
    'Purchase Price': 'purchase_price',
    'Down Payment': 'down_payment',
    'APPRAISED VALUE': 'appraised_value',
    'Date Of Last Appraisal': 'date_of_last_appraisal',
    'Appraisal Firm': 'appraisal_firm',
    'Assessed Value': 'assessed_value',
    'Assessment Date': 'assessment_date',
    'Debt1 - Initial': 'debt1_initial',
    'Debt1 - Int Rate': 'debt1_int_rate',
    'Maturity Date': 'maturity_date',
    'LTV Ratio': 'ltv_ratio',
    'DSV Ratio': 'dsv_ratio',
    'Debt Service': 'debt_service',
    'Mortgage Holder': 'mortgage_holder',
    'Built': 'built',
    'Renovated - Last': 'renovated_last',
    'Building SF': 'building_sf',
    'Building SF - Finished': 'building_sf_finished',
    'Unit SF - Avg': 'unit_sf_avg',
    'Land SF': 'land_sf',
    'Stories': 'stories',
    'Roof Type': 'roof_type',
    'Roof Cover': 'roof_cover',
    'Heat Fuel': 'heat_fuel',
    'Heat Type': 'heat_type',
    'Heat Sys Count': 'heat_sys_count',
    'Cooking Fuel': 'cooking_fuel',
    'AC Type - Marketing': 'ac_type',
    'AC Included': 'ac_included',
    'Parking Spots Count': 'parking_spots_count',
    'BR - 0': 'br_0',
    'BR - 1': 'br_1',
    'BR - 2': 'br_2',
    'BR - 3': 'br_3',
    'BR - 4': 'br_4',
    'Electric - Utility Company': 'electric_utility_company',
    'Elect Account': 'electric_account',
    'Gas - Utility Company': 'gas_utility_company',
    'Gas Account': 'gas_account'
}

# Generate SQL insert statements
with open('insert_investments.sql', 'w', encoding='utf-8') as f:
    f.write("-- Insert statements for investments table\n\n")
    
    for idx, row in clean_df.iterrows():
        if pd.isna(row['Asset ID']) or row['Asset ID'] == '':
            continue
            
        # Build the insert statement
        columns = []
        values = []
        
        for excel_col, sql_col in column_mapping.items():
            if excel_col in clean_df.columns:
                value = row[excel_col]
                
                if pd.isna(value) or value == '':
                    values.append('NULL')
                else:
                    # Clean the value based on column type
                    if sql_col in ['proforma_revenue', 'egi', 'noi', 'going_in_noi', 'proforma_operating_expenses', 
                                   'exp_tax_prop', 'exp_prop_ins', 'exp_utilities', 'exp_rm', 'exp_payroll', 
                                   'exp_garbage', 'exp_pm_fee_admin', 'purchase_price', 'down_payment', 
                                   'appraised_value', 'assessed_value', 'debt1_initial', 'debt_service']:
                        cleaned_val = clean_currency(value)
                        values.append(str(cleaned_val) if cleaned_val is not None else 'NULL')
                    
                    elif sql_col in ['going_in_cap_rate', 'debt1_int_rate', 'ltv_ratio', 'dsv_ratio', 'poverty_pct_below']:
                        cleaned_val = clean_percentage(value)
                        values.append(str(cleaned_val) if cleaned_val is not None else 'NULL')
                    
                    elif sql_col in ['date_of_last_appraisal', 'assessment_date', 'maturity_date']:
                        cleaned_val = clean_date(value)
                        values.append(f"'{cleaned_val}'" if cleaned_val is not None else 'NULL')
                    
                    elif sql_col in ['new_construction', 'section_8_units', 'ac_included']:
                        cleaned_val = clean_boolean(value)
                        values.append(str(cleaned_val).upper() if cleaned_val is not None else 'NULL')
                    
                    elif sql_col in ['unit_total', 'units', 'comm_units', 'beds', 'half_baths', 'walkscore', 
                                     'built', 'renovated_last', 'building_sf', 'building_sf_finished', 
                                     'unit_sf_avg', 'land_sf', 'stories', 'heat_sys_count', 'br_0', 'br_1', 'br_2', 'br_3', 'br_4']:
                        cleaned_val = clean_integer(value)
                        values.append(str(cleaned_val) if cleaned_val is not None else 'NULL')
                    
                    elif sql_col in ['baths', 'rooms', 'parking_spots_count']:
                        cleaned_val = clean_decimal(value)
                        values.append(str(cleaned_val) if cleaned_val is not None else 'NULL')
                    
                    else:
                        # Text fields - escape single quotes
                        cleaned_val = str(value).replace("'", "''")
                        values.append(f"'{cleaned_val}'")
                
                columns.append(sql_col)
        
        if columns:
            columns_str = ', '.join(columns)
            values_str = ', '.join(values)
            
            f.write(f"INSERT INTO public.investments ({columns_str}) VALUES ({values_str});\n")
    
    f.write("\n-- Update timestamps\n")
    f.write("UPDATE public.investments SET updated_at = NOW();\n")

print("SQL insert file created: insert_investments.sql")
print(f"Processed {len(clean_df)} properties")