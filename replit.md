# Property Management Dashboard - Stanton Management LLC

## Project Architecture
An institutional-grade property management dashboard with Excel processing, GL account review, and professional financial reporting capabilities.

### Core Technology Stack
- Frontend: React + Vite + TypeScript
- Backend: Express.js + Node.js  
- Styling: Tailwind CSS + shadcn/ui
- Data Processing: SheetJS (xlsx) for Excel files
- State Management: TanStack Query + React hooks
- Storage: In-memory (MemStorage) initially

### Visual Design Requirements
- **CRITICAL**: Institutional financial software appearance (Bloomberg Terminal style)
- **NO consumer app styling**: No colored cards, rounded corners, or playful elements
- **Typography**: Inter font, 18px minimum for screen sharing, monospace for data
- **Color Scheme**: Professional grays/whites only (#1a1d21, #374151, #ffffff)
- **Layout**: Table-based data presentation, not card-based

## User Preferences
- **Primary Goal**: Accounting verification with GL categorization and note-taking
- **Secondary Goals**: Lender export packages, operational monitoring
- **Screen Sharing Optimized**: Large fonts, clear click feedback, professional appearance
- **Full Portfolio Coverage**: Expanded from single Hartford 1 to complete multi-property system
- **Property Portfolio**: 6 properties total across 5 distinct portfolio groups with real financial data

## Recent Changes
- Initial project setup with attached requirements and visual specifications
- Detailed institutional styling guidelines provided
- Excel data structure analyzed (>>Balance, >>LastMnth, >>T12 sheets)
- Cash Flow Detail tab implemented with all non-zero GL line items
- Improved table styling with alternating row colors and compact rows
- Added interactive note-taking and action item flagging system
- **Complete three-tier commenting system implemented**:
  - Accounting comments (yellow highlighting, internal audit)
  - Property Management comments (blue highlighting, operations)
  - External/Lender comments (numbered badges, footnotes)
- **Property-specific numbering**: S0010-001, S0010-002 format for multi-portfolio scaling
- **Dedicated dashboards**: Accounting Notes (/accounting-notes) and Property Management (/property-management-notes)
- **Navigation system**: Back buttons and header navigation between all dashboards
- **Comment completion workflow**: Mark completed with detailed completion notes
- **MAJOR EXPANSION**: Full portfolio system implemented with:
  - 6 properties across 5 portfolios (Hartford 1, Consolidated, South End, North End, 90 Park)
  - Dynamic property selection UI with comprehensive GL account data for each property
  - Multi-property data management with portfolio-level aggregation
  - Property-specific KPI display and financial metrics
  - Individual balance sheet accounts for each property (Assets, Liabilities, Equity)
  - Property-specific Excel templates with separate P&L and balance sheet tabs
  - Dynamic switching between properties with real-time data updates

## Advanced Features Required
- **Balance Sheet Analysis**: Asset tracking, debt analysis, equity positions, DSCR calculations
- **T12 Performance**: Trailing 12-month trends, YoY growth, seasonal patterns, volatility analysis  
- **Month-over-Month**: Current performance, variance analysis, expense breakdowns, trend indicators
- **Advanced Statistics**: Revenue volatility, risk-adjusted returns, correlation analysis, predictive forecasting
- **Smart Features**: Automated alerts, color-coded indicators, interactive charts, executive reporting

## Data Structure
### Full Portfolio Data
**Hartford 1**: S0010 - 228 Maple (6 units, $6,800 NOI), S0011 - 315 Elm Street (8 units, $9,200 NOI) - Portfolio: 14 units total, 12.0% Cap Rate
**South End**: S0020 - 150 Union Street (24 units, $18,500 NOI), S0021 - 425 Broadway (27 units, $19,200 NOI)
**North End**: N0030 - 88 Salem Street (18 units, $14,800 NOI), N0031 - 205 Hanover Street (22 units, $17,600 NOI)
**90 Park**: P0040 - 90 Park Street (12 units, $9,800 NOI, 8.9% Cap Rate)
**Consolidated**: All properties aggregated (115 total units, $95.9K monthly NOI, 11.1% average Cap Rate)

- Key GL Accounts: 4105 (Rent Income), 6105 (Property Management), 6110 (Maintenance), Balance Sheet accounts
- Balance Sheet: Assets ($3M+ including cash, property value), Liabilities ($1.85M mortgage), Equity ($595K+)

## Implementation Priority
1. Professional institutional styling (table-based layout)
2. Hartford 1 data tables with GL account detail
3. Note-taking system for accounting review
4. Click highlighting for screen sharing
5. Export functionality for lender packages