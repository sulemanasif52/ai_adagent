import React from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts'
import { Eye, MousePointerClick, Target, DollarSign, TrendingUp } from 'lucide-react'
import StatCard from '../components/StatCard'

const chartData = [
  { name: 'Mon', clicks: 240, conversions: 24 },
  { name: 'Tue', clicks: 390, conversions: 38 },
  { name: 'Wed', clicks: 320, conversions: 32 },
  { name: 'Thu', clicks: 580, conversions: 65 },
  { name: 'Fri', clicks: 490, conversions: 52 },
  { name: 'Sat', clicks: 680, conversions: 78 },
  { name: 'Sun', clicks: 810, conversions: 90 },
]

const locationData = [
    { location: 'United States', spend: '$450', conversions: 42, cpa: '$10.71' },
    { location: 'United Kingdom', spend: '$210', conversions: 18, cpa: '$11.66' },
    { location: 'Canada', spend: '$120', conversions: 14, cpa: '$8.57' },
    { location: 'Australia', spend: '$80', conversions: 6, cpa: '$13.33' },
]

const Analytics = () => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ marginBottom: '1rem' }}>
                <h1 style={{ fontSize: '1.875rem', marginBottom: '0.5rem' }}>Analytics Overview</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Track your automated campaign performance.</p>
            </div>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                <StatCard title="Impressions" value="124.5K" trend="up" trendValue="+14%" icon={Eye} />
                <StatCard title="Total Clicks" value="3,510" trend="up" trendValue="+22%" icon={MousePointerClick} />
                <StatCard title="Conversions" value="340" trend="up" trendValue="+18%" icon={Target} />
                <StatCard title="Total Spend" value="$860.00" trend="down" trendValue="-4%" icon={DollarSign} />
                <StatCard title="ROI" value="3.2x" trend="up" trendValue="+8%" icon={TrendingUp} />
            </div>

            {/* Chart */}
            <div className="card" style={{ padding: '2rem', height: '400px', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Performance Metrics</h3>
                <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                            <XAxis dataKey="name" stroke="var(--text-tertiary)" tickLine={false} axisLine={false} dy={10} fontSize={12} />
                            <YAxis stroke="var(--text-tertiary)" tickLine={false} axisLine={false} fontSize={12} />
                            <RechartsTooltip 
                                contentStyle={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)', padding: '12px' }}
                            />
                            <Area type="monotone" dataKey="clicks" stroke="var(--accent-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorClicks)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Table */}
            <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                    <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Performance by Location</h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '500px' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-primary)' }}>
                                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.875rem' }}>Location</th>
                                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.875rem' }}>Spend</th>
                                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.875rem' }}>Conversions</th>
                                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.875rem' }}>CPA</th>
                            </tr>
                        </thead>
                        <tbody>
                            {locationData.map((row, i) => (
                                <tr key={i} style={{ borderTop: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '1.25rem 1.5rem', fontWeight: 500 }}>{row.location}</td>
                                    <td style={{ padding: '1.25rem 1.5rem', color: 'var(--text-secondary)' }}>{row.spend}</td>
                                    <td style={{ padding: '1.25rem 1.5rem', color: 'var(--text-secondary)' }}>{row.conversions}</td>
                                    <td style={{ padding: '1.25rem 1.5rem', color: 'var(--text-secondary)' }}>{row.cpa}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

export default Analytics
