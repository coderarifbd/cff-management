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
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 800, letterSpacing: '-0.025em', marginBottom: '0.5rem' }}>Welcome Back,</h1>
        <p style={{ color: 'var(--text-muted)' }}>Here's what's happening with the federation today.</p>
      </div>

      <div className="stats-grid">
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <Users size={24} />
          </div>
          <div className="stat-info">
            <h3>Total Members</h3>
            <p>{stats.totalMembers}</p>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
            <CreditCard size={24} />
          </div>
          <div className="stat-info">
            <h3>Fees Collected</h3>
            <p>৳ {stats.monthlyCollection.toLocaleString()}</p>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <Activity size={24} />
          </div>
          <div className="stat-info">
            <h3>Fines Collected</h3>
            <p>৳ {stats.totalFines.toLocaleString()}</p>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
            <TrendingUp size={24} />
          </div>
          <div className="stat-info">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Investments
              {stats.activeInvestmentsCount > 0 && (
                <span className="badge" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#d8b4fe', padding: '0.125rem 0.375rem', fontSize: '0.65rem' }}>
                  {stats.activeInvestmentsCount} Active
                </span>
              )}
            </h3>
            <p>৳ {stats.totalInvestments.toLocaleString()}</p>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            <Receipt size={24} />
          </div>
          <div className="stat-info">
            <h3>Total Expenses</h3>
            <p>৳ {stats.totalExpenses.toLocaleString()}</p>
          </div>
        </div>

        <div className="card stat-card" style={{ background: 'rgba(79, 70, 229, 0.05)', borderColor: 'rgba(79, 70, 229, 0.2)' }}>
          <div className="stat-icon" style={{ background: 'rgba(79, 70, 229, 0.1)', color: '#4f46e5' }}>
            <DollarSign size={24} />
          </div>
          <div className="stat-info">
            <h3>Net Balance (Cash)</h3>
            <p>৳ {stats.netProfit.toLocaleString()}</p>
          </div>
        </div>

        <div className="card stat-card" style={{ background: 'rgba(34, 197, 94, 0.05)', borderColor: 'rgba(34, 197, 94, 0.2)' }}>
          <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
            <TrendingUp size={24} />
          </div>
          <div className="stat-info">
            <h3>Total Federation Profit</h3>
            <p>৳ {stats.totalProfit.toLocaleString()}</p>
          </div>
        </div>

        <div className="card stat-card" style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', border: 'none' }}>
          <div className="stat-icon" style={{ background: 'rgba(255, 255, 255, 0.2)', color: 'white' }}>
            <Activity size={24} />
          </div>
          <div className="stat-info">
            <h3 style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Total Federation Amount</h3>
            <p style={{ color: 'white' }}>৳ {stats.totalAmount.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart3 size={20} style={{ color: 'var(--primary)' }} />
              Growth Analytics
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              {chartMode === 'overall' ? 'Overall yearly growth since start' : `Monthly performance breakdown for ${selectedYear}`}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', background: 'var(--surface)', padding: '0.25rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <button 
                onClick={() => setChartMode('yearly')}
                style={{ 
                  padding: '0.4rem 1rem', 
                  borderRadius: '8px', 
                  fontSize: '0.875rem', 
                  border: 'none',
                  cursor: 'pointer',
                  background: chartMode === 'yearly' ? 'var(--primary)' : 'transparent',
                  color: chartMode === 'yearly' ? 'white' : 'var(--text-muted)',
                  transition: 'all 0.2s'
                }}
              >
                Yearly
              </button>
              <button 
                onClick={() => setChartMode('overall')}
                style={{ 
                  padding: '0.4rem 1rem', 
                  borderRadius: '8px', 
                  fontSize: '0.875rem', 
                  border: 'none',
                  cursor: 'pointer',
                  background: chartMode === 'overall' ? 'var(--primary)' : 'transparent',
                  color: chartMode === 'overall' ? 'white' : 'var(--text-muted)',
                  transition: 'all 0.2s'
                }}
              >
                Overall
              </button>
            </div>

            {chartMode === 'yearly' && (
              <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                style={{ 
                  background: 'var(--surface)', 
                  border: '1px solid var(--border)', 
                  color: 'white', 
                  padding: '0.4rem 1rem', 
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
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
