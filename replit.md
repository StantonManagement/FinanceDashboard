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
- **Focus Property**: Hartford 1 portfolio (6 units at 228 Maple) as primary example

## Recent Changes
- Initial project setup with attached requirements and visual specifications
- Detailed institutional styling guidelines provided
- Excel data structure analyzed (>>Balance, >>LastMnth, >>T12 sheets)

## Data Structure
### Hartford 1 Sample Data
- Property: S0010 - 228 Maple (6 units)
- Portfolio: Hartford 1
- Key GL Accounts: 4105 (Rent Income), 6110 (Maintenance), etc.
- Monthly NOI: ~$7,080
- Avg Rent/Unit: $1,700

## Implementation Priority
1. Professional institutional styling (table-based layout)
2. Hartford 1 data tables with GL account detail
3. Note-taking system for accounting review
4. Click highlighting for screen sharing
5. Export functionality for lender packages