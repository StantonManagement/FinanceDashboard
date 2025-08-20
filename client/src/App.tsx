import React, { useState, useEffect } from 'react';

const PropertyDashboard = () => {
  // State management
  const [selectedPortfolio, setSelectedPortfolio] = useState('hartford1');
  const [activeTab, setActiveTab] = useState('performance');
  const [cellNotes, setCellNotes] = useState({});
  const [actionItems, setActionItems] = useState([]);
  const [clickedElement, setClickedElement] = useState(null);

  // Sample Hartford 1 data
  const hartford1Data = {
    "S0010": {
      propertyName: "228 Maple",
      portfolio: "Hartford 1",
      units: 6,
      marketRent: 12600,
      sqft: 8320,
      currentRevenue: 10500,
      currentExpenses: 3700,
      currentNOI: 6800,
      noiMargin: 64.8,
      t12NOI: 81600,
      capRate: 12.2,
      dscr: 2.15,
      occupancy: 94.5,
      glAccounts: {
        "4105": { description: "Rent Income", amount: 10200, type: "revenue" },
        "4110": { description: "Section 8 Rent", amount: 300, type: "revenue" },
        "6105": { description: "Property Management", amount: 630, type: "expense" },
        "6110": { description: "Maintenance & Repairs", amount: 1850, type: "expense" },
        "6120": { description: "Utilities", amount: 420, type: "expense" },
        "6130": { description: "Property Insurance", amount: 285, type: "expense" },
        "6140": { description: "Property Taxes", amount: 815, type: "expense" }
      }
    }
  };

  const portfolios = {
    all: { name: "Consolidated", units: 109, noi: 985000, cap: 9.6 },
    southend: { name: "South End", units: 51, noi: 450000, cap: 12.1 },
    northend: { name: "North End", units: 40, noi: 385000, cap: 11.8 },
    "90park": { name: "90 Park", units: 12, noi: 125000, cap: 8.9 },
    hartford1: { name: "Hartford 1", units: 6, noi: 85000, cap: 12.2 }
  };

  // Click highlighting function
  const handleClick = (elementId) => {
    setClickedElement(elementId);
    setTimeout(() => setClickedElement(null), 5000);
  };

  // Note management
  const addNote = (cellId, note) => {
    setCellNotes(prev => ({
      ...prev,
      [cellId]: {
        text: note,
        timestamp: new Date().toISOString(),
        author: "User"
      }
    }));
  };

  // Action item management
  const addActionItem = (description, priority = "MEDIUM") => {
    const newItem = {
      id: `AI-${Date.now()}`,
      description,
      property: "S0010",
      priority,
      status: "OPEN",
      createdAt: new Date().toISOString()
    };
    setActionItems(prev => [...prev, newItem]);
  };

  // Export functions
  const exportToExcel = () => {
    alert('Exporting to Excel with all notes and action items...');
    console.log('Notes:', cellNotes);
    console.log('Action Items:', actionItems);
  };

  const exportLenderPackage = () => {
    alert('Generating lender package for Hartford 1 portfolio...');
  };

  const refreshData = () => {
    alert('Refreshing API data from >> sheets...');
  };

  return (
    <div style={{ fontFamily: 'Inter, Segoe UI, Arial, sans-serif', fontSize: '18px', backgroundColor: '#fafbfc' }}>
      {/* Header */}
      <div style={{ 
        background: '#f8f9fa', 
        borderBottom: '3px solid #374151', 
        padding: '16px 0' 
      }}>
        <div style={{ 
          maxWidth: '1600px', 
          margin: '0 auto', 
          padding: '0 24px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <div>
            <div style={{ 
              fontSize: '24px', 
              fontWeight: '700', 
              color: '#1a1d21', 
              textTransform: 'uppercase', 
              letterSpacing: '1.5px' 
            }}>
              Stanton Management LLC
            </div>
            <div style={{ 
              fontSize: '14px', 
              color: '#404854', 
              textTransform: 'uppercase', 
              marginTop: '2px' 
            }}>
              Institutional Property Management Dashboard
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={exportLenderPackage}
              style={{ 
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)', 
                color: '#ffffff', 
                border: 'none', 
                padding: '12px 20px', 
                fontSize: '13px', 
                textTransform: 'uppercase', 
                letterSpacing: '0.5px',
                fontWeight: '700', 
                borderRadius: '6px',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)',
                transition: 'all 0.2s ease'
              }}
            >
              LENDER PACKAGE
            </button>
            <button 
              onClick={exportToExcel}
              style={{ 
                background: '#ffffff', 
                color: '#1a1d21', 
                border: '2px solid #cbd5e1', 
                padding: '10px 18px', 
                fontSize: '13px', 
                textTransform: 'uppercase', 
                letterSpacing: '0.5px',
                fontWeight: '700', 
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              EXPORT EXCEL
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '24px' }}>
        {/* Portfolio Navigation */}
        <div style={{ 
          background: '#ffffff', 
          border: '2px solid #d1d5db', 
          borderRadius: '8px',
          marginBottom: '24px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden'
        }}>
          <div style={{ 
            background: 'linear-gradient(135deg, #374151, #4b5563)', 
            color: '#ffffff', 
            padding: '16px 24px', 
            fontWeight: '700', 
            fontSize: '14px', 
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            Portfolio Selection
          </div>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '2px',
            background: '#d1d5db'
          }}>
            {Object.entries(portfolios).map(([key, portfolio]) => (
              <button
                key={key}
                onClick={() => {
                  setSelectedPortfolio(key);
                  handleClick(`portfolio-${key}`);
                }}
                style={{
                  background: selectedPortfolio === key ? '#dbeafe' : '#ffffff',
                  border: 'none',
                  borderLeft: selectedPortfolio === key ? '4px solid #3b82f6' : 'none',
                  padding: '20px 24px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transform: clickedElement === `portfolio-${key}` ? 'scale(1.02)' : 'scale(1)',
                  backgroundColor: clickedElement === `portfolio-${key}` ? '#fef08a' : 
                    (selectedPortfolio === key ? '#dbeafe' : '#ffffff'),
                  boxShadow: clickedElement === `portfolio-${key}` ? '0 4px 12px rgba(245, 158, 11, 0.4)' : 'none',
                  border: clickedElement === `portfolio-${key}` ? '3px solid #f59e0b' : 'none',
                  position: 'relative',
                  zIndex: clickedElement === `portfolio-${key}` ? 10 : 1,
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ 
                  fontWeight: '700', 
                  fontSize: '16px', 
                  color: '#1a1d21', 
                  marginBottom: '8px', 
                  textTransform: 'uppercase' 
                }}>
                  {portfolio.name}
                </div>
                <table style={{ width: '100%', fontSize: '15px', color: '#404854' }}>
                  <tbody>
                    <tr>
                      <td style={{ paddingBottom: '4px' }}>{portfolio.units} Units</td>
                      <td style={{ textAlign: 'right', paddingBottom: '4px', fontFamily: 'JetBrains Mono, Courier New, monospace', fontWeight: '600' }}>
                        ${Math.round(portfolio.noi/1000)}K NOI
                      </td>
                    </tr>
                    <tr>
                      <td>Cap Rate</td>
                      <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, Courier New, monospace', fontWeight: '600' }}>
                        {portfolio.cap}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </button>
            ))}
          </div>
        </div>

        {/* KPI Section - Only show Hartford 1 data when selected */}
        {selectedPortfolio === 'hartford1' && (
          <div style={{ 
            background: '#ffffff', 
            border: '2px solid #d1d5db', 
            borderRadius: '8px',
            marginBottom: '24px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #374151, #4b5563)',
              color: '#ffffff',
              padding: '16px 24px',
              fontSize: '14px', 
              fontWeight: '700', 
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              Hartford 1 Portfolio Metrics
            </div>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '2px', 
              background: '#d1d5db',
              padding: '2px'
            }}>
              {[
                { label: "Monthly NOI", value: "$6,800", change: "+8.2% MoM" },
                { label: "NOI Margin", value: "64.8%", change: "+2.1pp YoY" },
                { label: "Occupancy", value: "94.5%", change: "+1.2pp MoM" },
                { label: "Revenue/Unit", value: "$1,750", change: "+3.8% MoM" },
                { label: "Cap Rate", value: "12.2%", change: "Above Market" },
                { label: "DSCR", value: "2.15x", change: "Strong" }
              ].map((kpi, index) => (
                <div
                  key={index}
                  onClick={() => handleClick(`kpi-${index}`)}
                  style={{
                    background: clickedElement === `kpi-${index}` ? '#fef08a' : '#ffffff',
                    padding: '20px 16px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transform: clickedElement === `kpi-${index}` ? 'scale(1.02)' : 'scale(1)',
                    boxShadow: clickedElement === `kpi-${index}` ? '0 4px 12px rgba(245, 158, 11, 0.4)' : 'none',
                    border: clickedElement === `kpi-${index}` ? '3px solid #f59e0b' : 'none',
                    position: 'relative',
                    zIndex: clickedElement === `kpi-${index}` ? 10 : 1,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ 
                    fontSize: '12px', 
                    textTransform: 'uppercase', 
                    color: '#6b7280', 
                    marginBottom: '8px', 
                    fontWeight: '700',
                    letterSpacing: '0.5px'
                  }}>
                    {kpi.label}
                  </div>
                  <div style={{ 
                    fontSize: '24px', 
                    fontWeight: '700', 
                    color: '#1a1d21', 
                    marginBottom: '6px', 
                    fontFamily: 'JetBrains Mono, Courier New, monospace'
                  }}>
                    {kpi.value}
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    fontWeight: '600', 
                    color: '#059669' 
                  }}>
                    {kpi.change}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div style={{ 
          background: '#ffffff', 
          border: '2px solid #d1d5db', 
          borderRadius: '8px',
          marginBottom: '24px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden'
        }}>
          <div style={{ 
            display: 'flex', 
            background: '#f8fafc', 
            borderBottom: '1px solid #d1d5db' 
          }}>
            {[
              { key: 'performance', label: 'Performance Analysis' },
              { key: 'operations', label: 'Operational Review' },
              { key: 'cashflow', label: 'Cash Flow Detail' },
              { key: 'notes', label: 'Notes & Actions' }
            ].map((tab, index) => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  handleClick(`tab-${tab.key}`);
                }}
                style={{
                  flex: 1,
                  background: activeTab === tab.key ? '#374151' : 'transparent',
                  color: activeTab === tab.key ? '#ffffff' : '#404854',
                  border: 'none',
                  borderRight: index < 3 ? '1px solid #d1d5db' : 'none',
                  padding: '16px 20px',
                  fontWeight: '700',
                  fontSize: '13px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  cursor: 'pointer',
                  transform: clickedElement === `tab-${tab.key}` ? 'scale(1.02)' : 'scale(1)',
                  backgroundColor: clickedElement === `tab-${tab.key}` ? '#fef08a' : 
                    (activeTab === tab.key ? '#374151' : 'transparent'),
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ padding: '24px' }}>
            {/* Performance Tab */}
            {activeTab === 'performance' && selectedPortfolio === 'hartford1' && (
              <div>
                <h3 style={{ 
                  fontSize: '18px', 
                  fontWeight: '700', 
                  marginBottom: '16px', 
                  textTransform: 'uppercase', 
                  color: '#1a1d21',
                  letterSpacing: '0.5px'
                }}>
                  Hartford 1 - GL Account Detail
                </h3>
                
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'separate',
                  borderSpacing: '0',
                  border: '2px solid #d1d5db',
                  borderRadius: '8px',
                  background: '#ffffff',
                  overflow: 'hidden',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
                }}>
                  <thead>
                    <tr style={{ background: 'linear-gradient(135deg, #374151, #4b5563)' }}>
                      <th style={{ color: '#ffffff', padding: '16px 12px', fontSize: '13px', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '1px', textAlign: 'center', borderRight: '1px solid #4b5563' }}>GL Account</th>
                      <th style={{ color: '#ffffff', padding: '16px 12px', fontSize: '13px', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '1px', textAlign: 'left', borderRight: '1px solid #4b5563' }}>Description</th>
                      <th style={{ color: '#ffffff', padding: '16px 12px', fontSize: '13px', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '1px', textAlign: 'right', borderRight: '1px solid #4b5563' }}>Amount</th>
                      <th style={{ color: '#ffffff', padding: '16px 12px', fontSize: '13px', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '1px', textAlign: 'center', borderRight: '1px solid #4b5563' }}>Notes</th>
                      <th style={{ color: '#ffffff', padding: '16px 12px', fontSize: '13px', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '1px', textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(hartford1Data.S0010.glAccounts).map(([accountNum, account], index) => {
                      const cellId = `gl-${accountNum}-amount`;
                      return (
                        <tr key={accountNum} style={{ borderBottom: '1px solid #d1d5db' }}>
                          <td 
                            onClick={() => handleClick(`gl-${accountNum}-num`)}
                            style={{ 
                              padding: '14px 12px', 
                              fontFamily: 'JetBrains Mono, Courier New, monospace', 
                              fontWeight: '600', 
                              fontSize: '17px',
                              borderRight: '1px solid #d1d5db',
                              textAlign: 'center',
                              cursor: 'pointer',
                              background: clickedElement === `gl-${accountNum}-num` ? '#fef08a' : '#ffffff',
                              transform: clickedElement === `gl-${accountNum}-num` ? 'scale(1.02)' : 'scale(1)',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {accountNum}
                          </td>
                          <td 
                            onClick={() => handleClick(`gl-${accountNum}-desc`)}
                            style={{ 
                              padding: '14px 12px', 
                              fontSize: '17px',
                              borderRight: '1px solid #d1d5db',
                              cursor: 'pointer',
                              background: clickedElement === `gl-${accountNum}-desc` ? '#fef08a' : '#ffffff',
                              transform: clickedElement === `gl-${accountNum}-desc` ? 'scale(1.02)' : 'scale(1)',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {account.description}
                          </td>
                          <td 
                            onClick={() => handleClick(cellId)}
                            style={{ 
                              padding: '14px 12px', 
                              fontFamily: 'JetBrains Mono, Courier New, monospace', 
                              fontSize: '17px',
                              fontWeight: '600',
                              color: account.type === 'revenue' ? '#059669' : '#dc2626', 
                              borderRight: '1px solid #d1d5db',
                              textAlign: 'right',
                              cursor: 'pointer',
                              background: clickedElement === cellId ? '#fef08a' : '#ffffff',
                              transform: clickedElement === cellId ? 'scale(1.02)' : 'scale(1)',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {account.type === 'revenue' ? '+' : '-'}${Math.abs(account.amount).toLocaleString()}
                            {cellNotes[cellId] && (
                              <span style={{
                                background: '#8b5cf6',
                                color: '#ffffff',
                                fontSize: '11px',
                                fontWeight: '700',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                marginLeft: '8px',
                                textTransform: 'uppercase',
                                boxShadow: '0 2px 4px rgba(139, 92, 246, 0.3)'
                              }}>
                                📝 NOTE
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '14px 12px', borderRight: '1px solid #d1d5db', textAlign: 'center' }}>
                            <input 
                              type="text" 
                              placeholder="Add note..." 
                              onBlur={(e) => {
                                if (e.target.value.trim()) {
                                  addNote(cellId, e.target.value);
                                  e.target.value = '';
                                }
                              }}
                              style={{ 
                                border: '1px solid #d1d5db', 
                                padding: '8px 12px', 
                                width: '180px',
                                fontSize: '14px',
                                borderRadius: '4px'
                              }} 
                            />
                          </td>
                          <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                            <button 
                              onClick={() => addActionItem(`Review GL ${accountNum} - ${account.description}: $${account.amount}`, 'MEDIUM')}
                              style={{ 
                                background: '#d97706', 
                                color: '#ffffff', 
                                border: 'none', 
                                padding: '8px 16px', 
                                fontSize: '11px', 
                                textTransform: 'uppercase', 
                                fontWeight: '700',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                            >
                              FLAG
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Other tab contents */}
            {activeTab === 'operations' && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: '#1a1d21' }}>
                  OPERATIONAL REVIEW
                </h3>
                <p>Operational variance analysis and maintenance tracking coming soon...</p>
              </div>
            )}

            {activeTab === 'cashflow' && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: '#1a1d21' }}>
                  CASH FLOW DETAIL
                </h3>
                <p>Detailed cash flow analysis and projections coming soon...</p>
              </div>
            )}

            {activeTab === 'notes' && (
              <div>
                <h3 style={{ 
                  fontSize: '18px', 
                  fontWeight: '700', 
                  marginBottom: '16px', 
                  textTransform: 'uppercase', 
                  color: '#1a1d21' 
                }}>
                  Notes & Action Items
                </h3>
                
                {/* Notes Section */}
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px', color: '#404854' }}>
                    Cell Notes ({Object.keys(cellNotes).length})
                  </h4>
                  {Object.keys(cellNotes).length === 0 ? (
                    <p style={{ color: '#6b7280', fontStyle: 'italic' }}>No notes added yet. Click on any data cell to add notes.</p>
                  ) : (
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                      {Object.entries(cellNotes).map(([cellId, note]) => (
                        <div key={cellId} style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                            {cellId}: {note.text}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                            Added by {note.author} at {new Date(note.timestamp).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Items Section */}
                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px', color: '#404854' }}>
                    Action Items ({actionItems.length})
                  </h4>
                  {actionItems.length === 0 ? (
                    <p style={{ color: '#6b7280', fontStyle: 'italic' }}>No action items created yet. Use the FLAG button on GL accounts to create action items.</p>
                  ) : (
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                      {actionItems.map((item) => (
                        <div key={item.id} style={{ 
                          marginBottom: '12px', 
                          paddingBottom: '12px', 
                          borderBottom: '1px solid #e2e8f0',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                              {item.description}
                            </div>
                            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                              {item.property} | Priority: {item.priority} | Status: {item.status}
                            </div>
                          </div>
                          <div style={{
                            background: item.priority === 'HIGH' ? '#ef4444' : item.priority === 'MEDIUM' ? '#f59e0b' : '#6b7280',
                            color: '#ffffff',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '700'
                          }}>
                            {item.priority}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDashboard;