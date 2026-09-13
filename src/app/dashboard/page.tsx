'use client';
import { useEffect, useState } from 'react';
import { Users, CreditCard, TrendingUp, Receipt, DollarSign, Activity, Calendar, BarChart3 } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalMembers: 0,
    monthlyCollection: 0,
    totalFines: 0,
    totalInvestments: 0,
    activeInvestmentsCount: 0,
    totalInvestmentProfit: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalAmount: 0,
    totalProfit: 0,
    chartData: [] as any[]
  });
  const [loading, setLoading] = useState(true);
  const [chartMode, setChartMode] = useState<'yearly' | 'overall'>('yearly');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const fetchStats = async () => {
    try {
      const res = await fetch(`/api/dashboard?mode=${chartMode}&year=${selectedYear}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [chartMode, selectedYear]);

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#fff',
        bodyColor: '#cbd5e1',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
      }
    },
    scales: {
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#94a3b8' }
      },
      x: {
        grid: { display: false },
        ticks: { color: '#94a3b8' }
      }
    }
  };

  const chartData = {
    labels: stats.chartData.map(d => d.label),
    datasets: [
      {
        label: 'Net Growth',
        data: stats.chartData.map(d => d.growth),
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#22c55e',
      }
    ]
  };

  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="card skeleton" style={{ height: '120px' }}></div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.65rem', fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 0.35rem 0' }}>Overview</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Financial summary and key activity metrics.</p>
      </div>

      <div className="stats-grid">
        <div className="card stat-card">
          <div className="stat-icon" style={{ color: '#38bdf8' }}>
            <Users size={20} />
          </div>
          <div className="stat-info">
            <h3>Total Members</h3>
            <p>{stats.totalMembers}</p>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon" style={{ color: '#34d399' }}>
            <CreditCard size={20} />
          </div>
          <div className="stat-info">
            <h3>Fees Collected</h3>
            <p>৳ {stats.monthlyCollection.toLocaleString()}</p>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon" style={{ color: '#fbbf24' }}>
            <Activity size={20} />
          </div>
          <div className="stat-info">
            <h3>Fines Collected</h3>
            <p>৳ {stats.totalFines.toLocaleString()}</p>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon" style={{ color: '#c084fc' }}>
            <TrendingUp size={20} />
          </div>
          <div className="stat-info">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Investments
              {stats.activeInvestmentsCount > 0 && (
                <span className="badge" style={{ background: 'rgba(192, 132, 252, 0.12)', color: '#d8b4fe', padding: '0.15rem 0.4rem', fontSize: '0.65rem' }}>
                  {stats.activeInvestmentsCount} Active
                </span>
              )}
            </h3>
            <p>৳ {stats.totalInvestments.toLocaleString()}</p>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon" style={{ color: '#f87171' }}>
            <Receipt size={20} />
          </div>
          <div className="stat-info">
            <h3>Total Expenses</h3>
            <p>৳ {stats.totalExpenses.toLocaleString()}</p>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon" style={{ color: '#818cf8' }}>
            <DollarSign size={20} />
          </div>
          <div className="stat-info">
            <h3>Net Balance (Cash)</h3>
            <p>৳ {stats.netProfit.toLocaleString()}</p>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon" style={{ color: '#34d399' }}>
            <TrendingUp size={20} />
          </div>
          <div className="stat-info">
            <h3>Federation Profit</h3>
            <p style={{ color: '#34d399' }}>+ ৳ {stats.totalProfit.toLocaleString()}</p>
          </div>
        </div>

        <div className="card stat-card" style={{ borderColor: 'rgba(16, 185, 129, 0.25)', background: 'rgba(16, 185, 129, 0.05)' }}>
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            <Activity size={20} />
          </div>
          <div className="stat-info">
            <h3 style={{ color: '#34d399' }}>Total Federation Amount</h3>
            <p style={{ color: 'var(--text-main)' }}>৳ {stats.totalAmount.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <BarChart3 size={18} style={{ color: 'var(--primary)' }} />
              Growth Analytics
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              {chartMode === 'overall' ? 'Overall yearly growth since inception' : `Performance breakdown for year ${selectedYear}`}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', background: 'var(--surface)', padding: '0.2rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <button 
                onClick={() => setChartMode('yearly')}
                style={{ 
                  padding: '0.35rem 0.85rem', 
                  borderRadius: '6px', 
                  fontSize: '0.8rem', 
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 500,
                  background: chartMode === 'yearly' ? 'var(--primary)' : 'transparent',
                  color: chartMode === 'yearly' ? '#0b0f19' : 'var(--text-muted)',
                  transition: 'all 0.15s ease'
                }}
              >
                Yearly
              </button>
              <button 
                onClick={() => setChartMode('overall')}
                style={{ 
                  padding: '0.35rem 0.85rem', 
                  borderRadius: '6px', 
                  fontSize: '0.8rem', 
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 500,
                  background: chartMode === 'overall' ? 'var(--primary)' : 'transparent',
                  color: chartMode === 'overall' ? '#0b0f19' : 'var(--text-muted)',
                  transition: 'all 0.15s ease'
                }}
              >
                Overall
              </button>
            </div>

            {chartMode === 'yearly' && (
              <select 
                className="input" 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                style={{ height: '36px', padding: '0 2rem 0 0.75rem', fontSize: '0.8rem', borderRadius: '8px' }}
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="card" style={{ height: '400px', padding: '1.5rem' }}>
          <Line options={chartOptions} data={chartData} />
        </div>
      </div>
    </div>
  );
}
