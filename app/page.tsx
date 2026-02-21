import Link from "next/link";
import { supabase } from '@/lib/supabase';
import { Header } from '@/components/Header';
import { TodosClient } from '@/components/TodosClient';
import {
  TrendingUp,
  Users,
  DollarSign,
  Target,
  ArrowRight,
  Plus,
  ChevronRight,
  Calendar,
  Linkedin,
  Phone,
  Mail,
  CheckCircle2,
  Circle,
  Clock,
  Zap,
  ListTodo
} from 'lucide-react';

export default async function Dashboard() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [leadsResult, dealsResult, activitiesResult, followUpsResult, todosResult] = await Promise.all([
    supabase.from('leads').select('id, name, company, qualified, lead_score, stage, created_at, linkedin_url, next_follow_up_at, outreach_priority', { count: 'exact' }).is('deleted_at', null).order('lead_score', { ascending: false }).limit(10),
    supabase.from('deals').select('id, name, stage, value, probability, lead_id', { count: 'exact' }),
    supabase.from('activities').select('id, type, subject, created_at, lead_id, created_by').order('created_at', { ascending: false }).limit(8),
    supabase.from('leads').select('id, name, company, lead_score, next_follow_up_at, stage').is('deleted_at', null).not('next_follow_up_at', 'is', null).order('next_follow_up_at', { ascending: true }).limit(5),
    supabase.from('todos').select('*').order('created_at', { ascending: false })
  ]);

  const totalLeads = leadsResult.count || 0;
  const leads = leadsResult.data || [];
  const topLeads = leads.slice(0, 5);
  const qualifiedLeads = leads.filter(l => l.qualified).length;
  const hotLeads = leads.filter(l => l.outreach_priority === 'hot').length;

  const deals = dealsResult.data || [];
  const totalDeals = dealsResult.count || 0;
  const pipelineValue = deals.reduce((sum, deal) => sum + (deal.value || 0), 0);
  const wonDeals = deals.filter(d => d.stage === 'won');
  const wonValue = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0);

  const activities = activitiesResult.data || [];
  const followUps = followUpsResult.data || [];
  const todos = todosResult.data || [];

  const stages = [
    { id: 'new', name: 'Neu', color: '#64748B' },
    { id: 'contacted', name: 'Kontaktiert', color: '#4F46E5' },
    { id: 'qualified', name: 'Qualifiziert', color: '#818CF8' },
    { id: 'discovery_call', name: 'Discovery', color: '#F59E0B' },
    { id: 'proposal_sent', name: 'Proposal', color: '#F59E0B' },
    { id: 'won', name: 'Gewonnen', color: '#10B981' },
  ];

  const stageCounts = stages.map(stage => ({
    ...stage,
    count: leads.filter(l => l.stage === stage.id).length
  }));

  const getScoreColor = (score: number) => {
    if (score >= 7) return '#10B981'
    if (score >= 5) return '#F59E0B'
    return '#64748B'
  }

  return (
    <>
      <Header
        title="Dashboard"
        subtitle={new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
        actions={
          <div className="flex items-center gap-3">
            <Link href="/leads" className="btn btn-secondary btn-sm">
              <Users size={16} />
              Leads
            </Link>
            <Link href="/leads" className="btn btn-primary btn-sm">
              <Plus size={16} />
              Neu
            </Link>
          </div>
        }
      />

      <div className="page-content">
        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card" style={{ '--stat-accent': 'var(--color-blue)' } as React.CSSProperties}>
            <div className="stat-card-header">
              <span className="stat-label">Pipeline</span>
              <div className="stat-icon stat-icon-blue"><TrendingUp size={20} /></div>
            </div>
            <div className="stat-value">€{pipelineValue > 0 ? (pipelineValue / 1000).toFixed(0) + 'k' : '0'}</div>
            <p className="stat-subtitle">{totalDeals} aktive Deals</p>
          </div>

          <div className="stat-card" style={{ '--stat-accent': 'var(--color-green)' } as React.CSSProperties}>
            <div className="stat-card-header">
              <span className="stat-label">Gewonnen</span>
              <div className="stat-icon stat-icon-green"><DollarSign size={20} /></div>
            </div>
            <div className="stat-value" style={{ color: 'var(--color-green)' }}>€{wonValue > 0 ? (wonValue / 1000).toFixed(0) + 'k' : '0'}</div>
            <p className="stat-subtitle">{wonDeals.length} abgeschlossen</p>
          </div>

          <div className="stat-card" style={{ '--stat-accent': 'var(--color-purple)' } as React.CSSProperties}>
            <div className="stat-card-header">
              <span className="stat-label">Leads</span>
              <div className="stat-icon stat-icon-purple"><Users size={20} /></div>
            </div>
            <div className="stat-value">{totalLeads}</div>
            <p className="stat-subtitle" style={{ color: 'var(--color-green)' }}>{qualifiedLeads} qualifiziert</p>
          </div>

          <div className="stat-card" style={{ '--stat-accent': 'var(--color-orange)' } as React.CSSProperties}>
            <div className="stat-card-header">
              <span className="stat-label">Conversion</span>
              <div className="stat-icon stat-icon-orange"><Target size={20} /></div>
            </div>
            <div className="stat-value">{totalLeads > 0 ? ((qualifiedLeads / totalLeads) * 100).toFixed(0) : 0}%</div>
            <p className="stat-subtitle">Lead → Qualified</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3" style={{ gap: '48px' }}>
          {/* Main Column */}
          <div className="xl:col-span-2" style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
            {/* Today's Tasks */}
            <div className="section-card">
              <div className="section-card-header">
                <div className="section-card-header-left">
                  <div className="section-card-icon stat-icon-blue">
                    <Clock size={24} />
                  </div>
                  <div>
                    <h2 className="section-card-title">Heute</h2>
                    <p className="section-card-subtitle">{followUps.length} Aufgaben</p>
                  </div>
                </div>
                <Link href="/leads" className="btn btn-secondary btn-sm">
                  Alle anzeigen
                </Link>
              </div>
              <div>
                {followUps.length > 0 ? (
                  <div>
                    {followUps.map((lead) => {
                      const isOverdue = lead.next_follow_up_at && new Date(lead.next_follow_up_at) < today;
                      const isToday = lead.next_follow_up_at && new Date(lead.next_follow_up_at).toDateString() === today.toDateString();

                      return (
                        <Link key={lead.id} href={`/leads/${lead.id}`} className="list-item">
                          <div className={`status-dot ${isOverdue ? 'status-dot-overdue' : isToday ? 'status-dot-today' : 'status-dot-upcoming'}`} />
                          <div className="list-item-content">
                            <p className="list-item-title">{lead.name}</p>
                            <p className="list-item-subtitle">{lead.company || '–'}</p>
                          </div>
                          <span className={`badge ${isOverdue ? 'badge-danger' : isToday ? 'badge-warning' : 'badge-success'}`}>
                            {isOverdue ? 'Überfällig' : isToday ? 'Heute' : new Date(lead.next_follow_up_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
                          </span>
                          <ArrowRight size={18} className="text-muted" />
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-state" style={{ padding: '48px 24px' }}>
                    <div className="empty-state-icon" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                      <CheckCircle2 size={28} style={{ color: 'var(--color-green)' }} />
                    </div>
                    <div className="empty-state-title">Alles erledigt</div>
                    <div className="empty-state-description">Keine Aufgaben für heute</div>
                  </div>
                )}
              </div>
            </div>

            {/* Pipeline */}
            <div className="section-card">
              <div className="section-card-header">
                <div className="section-card-header-left">
                  <div className="section-card-icon stat-icon-purple">
                    <Zap size={24} />
                  </div>
                  <h2 className="section-card-title">Pipeline</h2>
                </div>
                <Link href="/leads" className="btn btn-secondary btn-sm">Details</Link>
              </div>
              <div className="section-card-body">
                <div className="pipeline-chart">
                  {stageCounts.map((stage) => {
                    const maxCount = Math.max(...stageCounts.map(s => s.count), 1);
                    const height = (stage.count / maxCount) * 100;

                    return (
                      <div key={stage.id} className="pipeline-bar-group">
                        <span className="pipeline-bar-value" style={{ color: stage.color }}>
                          {stage.count}
                        </span>
                        <div
                          className="pipeline-bar"
                          style={{
                            height: `${Math.max(height, 8)}%`,
                            background: stage.color,
                          }}
                        />
                        <span className="pipeline-bar-label">{stage.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Top Leads */}
            <div className="section-card">
              <div className="section-card-header">
                <div className="section-card-header-left">
                  <div className="section-card-icon stat-icon-red">
                    <TrendingUp size={24} />
                  </div>
                  <h2 className="section-card-title">Top Leads</h2>
                </div>
                <Link href="/leads" className="btn btn-secondary btn-sm">Alle</Link>
              </div>
              <div>
                {topLeads.length > 0 ? (
                  <div>
                    {topLeads.map((lead) => {
                      const score = lead.lead_score || 0;
                      const scoreColor = getScoreColor(score);
                      const initials = lead.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

                      return (
                        <Link key={lead.id} href={`/leads/${lead.id}`} className="list-item">
                          <div className="list-item-avatar">{initials}</div>
                          <div className="list-item-content">
                            <p className="list-item-title">{lead.name}</p>
                            <p className="list-item-subtitle">{lead.company || '–'}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="score-indicator">
                              <span className="score-value" style={{ color: scoreColor, fontSize: '17px' }}>
                                {score.toFixed(1)}
                              </span>
                              <div className="score-bar">
                                <div className={`score-fill ${score >= 7 ? 'high' : score >= 5 ? 'medium' : 'low'}`} style={{ width: `${(score / 10) * 100}%` }} />
                              </div>
                            </div>
                            {lead.linkedin_url && (
                              <span className="p-2 rounded-lg text-[#0A66C2]">
                                <Linkedin size={18} />
                              </span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-state" style={{ padding: '48px 24px' }}>
                    <div className="empty-state-description">Keine Leads</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Side Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
            {/* Quick Actions */}
            <div className="section-card">
              <div className="section-card-header">
                <h2 className="section-card-title">Schnellzugriff</h2>
              </div>
              <div className="section-card-body-compact">
                <Link href="/leads" className="quick-action-item group">
                  <div className="quick-action-icon stat-icon-blue"><Users size={22} /></div>
                  <div className="quick-action-content">
                    <p className="quick-action-title">Lead hinzufügen</p>
                    <p className="quick-action-desc">Manuell oder Import</p>
                  </div>
                  <ChevronRight size={18} className="text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
                <Link href="/deals" className="quick-action-item group">
                  <div className="quick-action-icon stat-icon-green"><DollarSign size={22} /></div>
                  <div className="quick-action-content">
                    <p className="quick-action-title">Deal erstellen</p>
                    <p className="quick-action-desc">Aus qualifiziertem Lead</p>
                  </div>
                  <ChevronRight size={18} className="text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
                <Link href="/activities" className="quick-action-item group">
                  <div className="quick-action-icon stat-icon-orange"><Calendar size={22} /></div>
                  <div className="quick-action-content">
                    <p className="quick-action-title">Aktivität planen</p>
                    <p className="quick-action-desc">Call, Meeting, E-Mail</p>
                  </div>
                  <ChevronRight size={18} className="text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </div>
            </div>

            {/* To-Do */}
            <div className="section-card">
              <div className="section-card-header">
                <div className="section-card-header-left">
                  <div className="stat-icon stat-icon-indigo" style={{ width: '40px', height: '40px', borderRadius: '12px' }}>
                    <ListTodo size={20} />
                  </div>
                  <h2 className="section-card-title">To-Do</h2>
                </div>
                <span className="text-muted" style={{ fontSize: '13px' }}>
                  {todos.filter(t => !t.completed).length} offen
                </span>
              </div>
              <div className="section-card-body">
                <TodosClient todos={todos} />
              </div>
            </div>

            {/* Activity */}
            <div className="section-card">
              <div className="section-card-header">
                <h2 className="section-card-title">Aktivitäten</h2>
                <Link href="/activities" className="btn btn-ghost btn-sm">
                  <ChevronRight size={18} />
                </Link>
              </div>
              <div className="section-card-body">
                {activities.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {activities.slice(0, 5).map((activity) => (
                      <div key={activity.id} className="activity-item">
                        <div className="activity-icon">
                          {activity.type === 'call' ? <Phone size={16} /> :
                           activity.type === 'email_sent' ? <Mail size={16} /> :
                           activity.type === 'linkedin_message' ? <Linkedin size={16} /> :
                           <Circle size={16} />}
                        </div>
                        <div className="activity-content">
                          <p className="activity-title">{activity.subject || activity.type}</p>
                          <p className="activity-time">
                            {new Date(activity.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state" style={{ padding: '32px 0' }}>
                    <div className="empty-state-description">Keine Aktivitäten</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
