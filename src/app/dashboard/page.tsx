'use client';
import { useEffect, useState } from 'react';
import { Users, CreditCard, TrendingUp, Receipt, DollarSign } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
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
    chartData: [] as any[]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/dashboard');
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
    fetchStats();
  }, []);

  const chartData = {
    labels: stats.chartData.map(d => d.label),
    datasets: [
      {
        label: 'Monthly Net Profit',
        data: stats.chartData.map(d => d.profit),
        borderColor: 'rgb(21, 128, 61)',
        backgroundColor: 'rgba(21, 128, 61, 0.5)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  const barData = {
    labels: stats.chartData.map(d => d.label),
    datasets: [
      {
        label: 'Total Income',
        data: stats.chartData.map(d => d.income),
        backgroundColor: 'rgba(21, 128, 61, 0.8)',
      },
      {
        label: 'Total Expenses',
        data: stats.chartData.map(d => d.expense),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
      }
    ]
  };

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div>
      <div className="stats-grid">
        <div className="card stat-card">
          <div className="stat-icon"><Users size={24} /></div>
          <div className="stat-info">
            <h3>Total Members</h3>
            <p>{stats.totalMembers}</p>
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon"><CreditCard size={24} /></div>
          <div className="stat-info">
            <h3>Total Fees Collected</h3>
            <p>৳ {stats.monthlyCollection}</p>
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon"><DollarSign size={24} /></div>
          <div className="stat-info">
            <h3>Fines Collected</h3>
            <p>৳ {stats.totalFines}</p>
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon"><TrendingUp size={24} /></div>
          <div className="stat-info">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              Total Investments
              {stats.activeInvestmentsCount > 0 && (
                <span style={{ fontSize: '0.65rem', background: '#ecfdf5', color: '#10b981', padding: '0.1rem 0.4rem', borderRadius: '10px', fontWeight: 600 }}>
                  {stats.activeInvestmentsCount} Active
                </span>
              )}
            </h3>
            <p>৳ {stats.totalInvestments}</p>
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon"><Receipt size={24} /></div>
          <div className="stat-info">
            <h3>Total Expenses</h3>
            <p>৳ {stats.totalExpenses}</p>
          </div>
        </div>
        <div className="card stat-card" style={{ background: '#ecfdf5', border: '1px solid #10b981' }}>
          <div className="stat-icon" style={{ background: '#10b981', color: 'white' }}><TrendingUp size={24} /></div>
          <div className="stat-info">
            <h3 style={{ color: '#047857' }}>Investment Profit</h3>
            <p style={{ color: '#047857' }}>৳ {stats.totalInvestmentProfit}</p>
          </div>
        </div>
        <div className="card stat-card" style={{ background: 'var(--primary)', color: 'white' }}>
          <div className="stat-icon" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}><DollarSign size={24} /></div>
          <div className="stat-info">
            <h3 style={{ color: 'rgba(255,255,255,0.8)' }}>Net Balance / Profit</h3>
            <p style={{ color: 'white' }}>৳ {stats.netProfit}</p>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.125rem' }}>Net Profit Overview</h3>
          <div style={{ height: '300px' }}>
            <Line options={{ responsive: true, maintainAspectRatio: false }} data={chartData} />
          </div>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.125rem' }}>Income vs Expenses</h3>
          <div style={{ height: '300px' }}>
            <Bar options={{ responsive: true, maintainAspectRatio: false }} data={barData} />
          </div>
        </div>
      </div>
    </div>
  );
}
