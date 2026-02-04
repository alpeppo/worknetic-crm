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
    { id: 'new', name: 'Neu', color: '#86868b' },
    { id: 'contacted', name: 'Kontaktiert', color: '#007AFF' },
    { id: 'qualified', name: 'Qualifiziert', color: '#AF52DE' },
    { id: 'discovery_call', name: 'Discovery', color: '#FF9500' },
    { id: 'proposal_sent', name: 'Proposal', color: '#FF9500' },
    { id: 'won', name: 'Gewonnen', color: '#34C759' },
  ];

  const stageCounts = stages.map(stage => ({
    ...stage,
    count: leads.filter(l => l.stage === stage.id).length
  }));

  const getScoreColor = (score: number) => {
    if (score >= 7) return '#34C759'
    if (score >= 5) return '#FF9500'
    return '#86868b'
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <div className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <span className="stat-label">Pipeline</span>
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(0, 122, 255, 0.1)' }}>
                <TrendingUp size={20} style={{ color: '#007AFF' }} />
              </div>
            </div>
            <div className="stat-value">€{pipelineValue > 0 ? (pipelineValue / 1000).toFixed(0) + 'k' : '0'}</div>
            <p className="text-sm text-muted mt-2">{totalDeals} aktive Deals</p>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <span className="stat-label">Gewonnen</span>
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(52, 199, 89, 0.1)' }}>
                <DollarSign size={20} style={{ color: '#34C759' }} />
              </div>
            </div>
            <div className="stat-value" style={{ color: '#34C759' }}>€{wonValue > 0 ? (wonValue / 1000).toFixed(0) + 'k' : '0'}</div>
            <p className="text-sm text-muted mt-2">{wonDeals.length} abgeschlossen</p>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <span className="stat-label">Leads</span>
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(175, 82, 222, 0.1)' }}>
                <Users size={20} style={{ color: '#AF52DE' }} />
              </div>
            </div>
            <div className="stat-value">{totalLeads}</div>
            <p className="text-sm mt-2" style={{ color: '#34C759' }}>{qualifiedLeads} qualifiziert</p>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <span className="stat-label">Conversion</span>
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255, 149, 0, 0.1)' }}>
                <Target size={20} style={{ color: '#FF9500' }} />
              </div>
            </div>
            <div className="stat-value">{totalLeads > 0 ? ((qualifiedLeads / totalLeads) * 100).toFixed(0) : 0}%</div>
            <p className="text-sm text-muted mt-2">Lead → Qualified</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="xl:col-span-2 space-y-6">
            {/* Today's Tasks */}
            <div
              style={{
                background: 'var(--color-bg)',
                borderRadius: '20px',
                border: '1px solid var(--color-border)',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}
            >
              <div
                style={{
                  padding: '24px',
                  borderBottom: '1px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '16px',
                      background: 'rgba(0, 122, 255, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Clock size={24} style={{ color: '#007AFF' }} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '4px' }}>Heute</h2>
                    <p style={{ fontSize: '13px', color: 'var(--color-text-tertiary)' }}>{followUps.length} Aufgaben</p>
                  </div>
                </div>
                <Link
                  href="/leads"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 16px',
                    background: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--color-text-secondary)',
                    textDecoration: 'none'
                  }}
                >
                  Alle anzeigen
                </Link>
              </div>
              <div>
                {followUps.length > 0 ? (
                  <div>
                    {followUps.map((lead, index) => {
                      const isOverdue = lead.next_follow_up_at && new Date(lead.next_follow_up_at) < today;
                      const isToday = lead.next_follow_up_at && new Date(lead.next_follow_up_at).toDateString() === today.toDateString();

                      return (
                        <Link
                          key={lead.id}
                          href={`/leads/${lead.id}`}
                          className="hover:bg-[var(--color-bg-secondary)]"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            padding: '20px 24px',
                            borderBottom: index < followUps.length - 1 ? '1px solid var(--color-border)' : 'none',
                            textDecoration: 'none',
                            transition: 'background 0.2s'
                          }}
                        >
                          <div
                            style={{
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              flexShrink: 0,
                              background: isOverdue ? '#FF3B30' : isToday ? '#FF9500' : '#34C759'
                            }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontWeight: 500, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.name}</p>
                            <p style={{ fontSize: '14px', color: 'var(--color-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.company || '–'}</p>
                          </div>
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: 500,
                              padding: '6px 12px',
                              borderRadius: '100px',
                              background: isOverdue ? 'rgba(255, 59, 48, 0.1)' : isToday ? 'rgba(255, 149, 0, 0.1)' : 'rgba(52, 199, 89, 0.1)',
                              color: isOverdue ? '#FF3B30' : isToday ? '#FF9500' : '#34C759'
                            }}
                          >
                            {isOverdue ? 'Überfällig' : isToday ? 'Heute' : new Date(lead.next_follow_up_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
                          </span>
                          <ArrowRight size={18} style={{ color: 'var(--color-text-tertiary)' }} />
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                    <div
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '20px',
                        margin: '0 auto 16px',
                        background: 'rgba(52, 199, 89, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <CheckCircle2 size={28} style={{ color: '#34C759' }} />
                    </div>
                    <p style={{ fontWeight: 600, color: 'var(--color-text)', marginBottom: '4px' }}>Alles erledigt</p>
                    <p style={{ fontSize: '14px', color: 'var(--color-text-tertiary)' }}>Keine Aufgaben für heute</p>
                  </div>
                )}
              </div>
            </div>

            {/* Pipeline */}
            <div
              style={{
                background: 'var(--color-bg)',
                borderRadius: '20px',
                border: '1px solid var(--color-border)',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}
            >
              <div
                style={{
                  padding: '24px',
                  borderBottom: '1px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '16px',
                      background: 'rgba(175, 82, 222, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Zap size={24} style={{ color: '#AF52DE' }} />
                  </div>
                  <h2 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--color-text)' }}>Pipeline</h2>
                </div>
                <Link
                  href="/leads"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 16px',
                    background: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--color-text-secondary)',
                    textDecoration: 'none'
                  }}
                >
                  Details
                </Link>
              </div>
              <div style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', height: '160px' }}>
                  {stageCounts.map((stage) => {
                    const maxCount = Math.max(...stageCounts.map(s => s.count), 1);
                    const height = (stage.count / maxCount) * 100;

                    return (
                      <div key={stage.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px', color: stage.color }}>
                          {stage.count}
                        </span>
                        <div
                          style={{
                            width: '100%',
                            borderRadius: '10px',
                            transition: 'all 0.5s ease',
                            height: `${Math.max(height, 8)}%`,
                            background: stage.color,
                            minHeight: '8px',
                          }}
                        />
                        <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '12px', textAlign: 'center' }}>
                          {stage.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Top Leads */}
            <div
              style={{
                background: 'var(--color-bg)',
                borderRadius: '20px',
                border: '1px solid var(--color-border)',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}
            >
              <div
                style={{
                  padding: '24px',
                  borderBottom: '1px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '16px',
                      background: 'rgba(255, 59, 48, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <TrendingUp size={24} style={{ color: '#FF3B30' }} />
                  </div>
                  <h2 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--color-text)' }}>Top Leads</h2>
                </div>
                <Link
                  href="/leads"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 16px',
                    background: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--color-text-secondary)',
                    textDecoration: 'none'
                  }}
                >
                  Alle
                </Link>
              </div>
              <div>
                {topLeads.length > 0 ? (
                  <div>
                    {topLeads.map((lead, index) => {
                      const score = lead.lead_score || 0;
                      const scoreColor = getScoreColor(score);
                      const initials = lead.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

                      return (
                        <Link
                          key={lead.id}
                          href={`/leads/${lead.id}`}
                          className="hover:bg-[var(--color-bg-secondary)]"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            padding: '20px 24px',
                            borderBottom: index < topLeads.length - 1 ? '1px solid var(--color-border)' : 'none',
                            textDecoration: 'none',
                            transition: 'background 0.2s'
                          }}
                        >
                          <div
                            style={{
                              width: '48px',
                              height: '48px',
                              borderRadius: '14px',
                              background: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontWeight: 600,
                              fontSize: '15px'
                            }}
                          >
                            {initials}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontWeight: 500, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.name}</p>
                            <p style={{ fontSize: '14px', color: 'var(--color-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.company || '–'}</p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '17px', fontWeight: 600, color: scoreColor }}>
                                {score.toFixed(1)}
                              </span>
                              <div style={{ width: '48px', height: '6px', borderRadius: '3px', background: 'var(--color-bg-tertiary)', overflow: 'hidden' }}>
                                <div
                                  style={{ height: '100%', borderRadius: '3px', width: `${(score / 10) * 100}%`, background: scoreColor }}
                                />
                              </div>
                            </div>
                            {lead.linkedin_url && (
                              <a
                                href={lead.linkedin_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  padding: '8px',
                                  borderRadius: '10px',
                                  color: 'var(--color-text-tertiary)',
                                  transition: 'all 0.2s'
                                }}
                                className="hover:bg-[var(--color-bg-secondary)] hover:text-[#0A66C2]"
                              >
                                <Linkedin size={18} />
                              </a>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                    <p style={{ color: 'var(--color-text-tertiary)' }}>Keine Leads</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Side Column */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div
              style={{
                background: 'var(--color-bg)',
                borderRadius: '20px',
                border: '1px solid var(--color-border)',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}
            >
              <div style={{ padding: '24px', borderBottom: '1px solid var(--color-border)' }}>
                <h2 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--color-text)' }}>Schnellzugriff</h2>
              </div>
              <div style={{ padding: '16px' }}>
                <Link
                  href="/leads"
                  className="hover:bg-[var(--color-bg-secondary)] group"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px',
                    borderRadius: '14px',
                    textDecoration: 'none',
                    transition: 'background 0.2s'
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '14px',
                      background: 'rgba(0, 122, 255, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Users size={22} style={{ color: '#007AFF' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 500, color: 'var(--color-text)', marginBottom: '2px' }}>Lead hinzufügen</p>
                    <p style={{ fontSize: '13px', color: 'var(--color-text-tertiary)' }}>Manuell oder Import</p>
                  </div>
                  <ChevronRight size={18} style={{ color: 'var(--color-text-tertiary)', opacity: 0 }} className="group-hover:opacity-100" />
                </Link>
                <Link
                  href="/deals"
                  className="hover:bg-[var(--color-bg-secondary)] group"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px',
                    borderRadius: '14px',
                    textDecoration: 'none',
                    transition: 'background 0.2s'
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '14px',
                      background: 'rgba(52, 199, 89, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <DollarSign size={22} style={{ color: '#34C759' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 500, color: 'var(--color-text)', marginBottom: '2px' }}>Deal erstellen</p>
                    <p style={{ fontSize: '13px', color: 'var(--color-text-tertiary)' }}>Aus qualifiziertem Lead</p>
                  </div>
                  <ChevronRight size={18} style={{ color: 'var(--color-text-tertiary)', opacity: 0 }} className="group-hover:opacity-100" />
                </Link>
                <Link
                  href="/activities"
                  className="hover:bg-[var(--color-bg-secondary)] group"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px',
                    borderRadius: '14px',
                    textDecoration: 'none',
                    transition: 'background 0.2s'
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '14px',
                      background: 'rgba(255, 149, 0, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Calendar size={22} style={{ color: '#FF9500' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 500, color: 'var(--color-text)', marginBottom: '2px' }}>Aktivität planen</p>
                    <p style={{ fontSize: '13px', color: 'var(--color-text-tertiary)' }}>Call, Meeting, E-Mail</p>
                  </div>
                  <ChevronRight size={18} style={{ color: 'var(--color-text-tertiary)', opacity: 0 }} className="group-hover:opacity-100" />
                </Link>
              </div>
            </div>

            {/* To-Do */}
            <div
              style={{
                background: 'var(--color-bg)',
                borderRadius: '20px',
                border: '1px solid var(--color-border)',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}
            >
              <div
                style={{
                  padding: '24px',
                  borderBottom: '1px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      background: 'rgba(88, 86, 214, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <ListTodo size={20} style={{ color: '#5856D6' }} />
                  </div>
                  <h2 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--color-text)' }}>To-Do</h2>
                </div>
                <span style={{ fontSize: '13px', color: 'var(--color-text-tertiary)' }}>
                  {todos.filter(t => !t.completed).length} offen
                </span>
              </div>
              <div style={{ padding: '20px 24px' }}>
                <TodosClient todos={todos} />
              </div>
            </div>

            {/* Activity */}
            <div
              style={{
                background: 'var(--color-bg)',
                borderRadius: '20px',
                border: '1px solid var(--color-border)',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}
            >
              <div
                style={{
                  padding: '24px',
                  borderBottom: '1px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <h2 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--color-text)' }}>Aktivitäten</h2>
                <Link
                  href="/activities"
                  style={{
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '10px',
                    color: 'var(--color-text-tertiary)'
                  }}
                  className="hover:bg-[var(--color-bg-secondary)]"
                >
                  <ChevronRight size={18} />
                </Link>
              </div>
              <div style={{ padding: '20px 24px' }}>
                {activities.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {activities.slice(0, 5).map((activity) => (
                      <div key={activity.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: 'var(--color-bg-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--color-text-tertiary)',
                            flexShrink: 0
                          }}
                        >
                          {activity.type === 'call' ? <Phone size={16} /> :
                           activity.type === 'email_sent' ? <Mail size={16} /> :
                           activity.type === 'linkedin_message' ? <Linkedin size={16} /> :
                           <Circle size={16} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activity.subject || activity.type}</p>
                          <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>
                            {new Date(activity.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-text-tertiary)', fontSize: '14px' }}>
                    Keine Aktivitäten
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
