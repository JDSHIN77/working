/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Plus, 
  Users, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  MoreVertical, 
  X, 
  Clock, 
  Briefcase,
  LayoutDashboard,
  Settings,
  Menu,
  Search,
  Pencil,
  Trash2,
  RefreshCw,
  Wifi,
  WifiOff,
  GripVertical
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { Team, Employee, Task } from './types';
import { db } from './firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

// Initial Mock Data
const INITIAL_TEAMS: Team[] = [
  {
    id: 'team-1',
    name: '디자인 운영팀',
    employees: [
      {
        id: 'emp-1',
        name: '알렉스 리베라',
        position: '리드 디자이너',
        emoji: '👨‍🎨',
        tasks: [
          {
            id: 't1',
            title: '디자인 시스템 감사',
            description: '접근성 준수 여부를 확인하기 위해 모든 컴포넌트를 검토합니다.',
            startDate: '2026-03-05',
            endDate: '2026-03-12',
            category: '디자인',
            emoji: '🎨'
          },
          {
            id: 't2',
            title: '핸드오프 준비',
            description: '엔지니어링 팀을 위한 에셋을 준비합니다.',
            startDate: '2026-03-10',
            endDate: '2026-03-15',
            category: '프로세스',
            emoji: '📦'
          }
        ]
      },
      {
        id: 'emp-2',
        name: '사라 첸',
        position: 'UX 리서처',
        emoji: '👩‍🔬',
        tasks: [
          {
            id: 't3',
            title: '사용자 인터뷰',
            description: '파워 유저를 대상으로 5회의 심층 인터뷰를 진행합니다.',
            startDate: '2026-03-08',
            endDate: '2026-03-11',
            category: '리서치',
            emoji: '🔍'
          }
        ]
      }
    ]
  },
  {
    id: 'team-2',
    name: '코어 엔지니어링',
    employees: [
      {
        id: 'emp-3',
        name: '마커스 쏜',
        position: '시니어 엔지니어',
        emoji: '👨‍💻',
        tasks: [
          {
            id: 't4',
            title: 'API 리팩토링',
            description: '속도 향상을 위해 데이터 페칭 레이어를 최적화합니다.',
            startDate: '2026-03-06',
            endDate: '2026-03-14',
            category: '개발',
            emoji: '⚡'
          }
        ]
      }
    ]
  }
];

const EMPLOYEE_EMOJIS = ['👨‍🎨', '👩‍🔬', '👨‍💻', '👩‍💼', '👨‍🔧', '👩‍🏫', '👨‍⚕️', '👩‍🍳', '👨‍🌾', '👩‍🚀', '👤', '🦊', '🦁', '🐼', '🐨', '🐯', '🐸', '🤖', '👾', '👻'];

const recommendEmoji = (title: string, description: string): string => {
  const text = (title + ' ' + description).toLowerCase();
  if (text.includes('디자인') || text.includes('design') || text.includes('그림') || text.includes('ui') || text.includes('ux')) return '🎨';
  if (text.includes('개발') || text.includes('dev') || text.includes('코드') || text.includes('api') || text.includes('코딩')) return '💻';
  if (text.includes('리서치') || text.includes('research') || text.includes('조사') || text.includes('분석')) return '🔍';
  if (text.includes('회의') || text.includes('meeting') || text.includes('미팅') || text.includes('발표')) return '🤝';
  if (text.includes('문서') || text.includes('doc') || text.includes('기록') || text.includes('작성')) return '📄';
  if (text.includes('버그') || text.includes('bug') || text.includes('수정') || text.includes('에러')) return '🐛';
  if (text.includes('배포') || text.includes('deploy') || text.includes('출시') || text.includes('서버')) return '🚀';
  if (text.includes('테스트') || text.includes('test') || text.includes('검증')) return '🧪';
  if (text.includes('데이터') || text.includes('data') || text.includes('통계')) return '📊';
  if (text.includes('보안') || text.includes('security') || text.includes('인증')) return '🔒';
  if (text.includes('학습') || text.includes('study') || text.includes('공부') || text.includes('교육')) return '📚';
  if (text.includes('이벤트') || text.includes('event') || text.includes('행사') || text.includes('축하')) return '🎉';
  if (text.includes('전화') || text.includes('call') || text.includes('연락')) return '📞';
  if (text.includes('메일') || text.includes('mail') || text.includes('이메일')) return '📧';
  if (text.includes('일정') || text.includes('schedule') || text.includes('계획')) return '📅';
  return '📝';
};

// Helper to parse YYYY-MM-DD as local date
const parseDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// Helper to get dates for the timeline
const getTimelineDates = (startDate: Date, days: number) => {
  const dates = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    dates.push(date);
  }
  return dates;
};

interface EmployeeRowProps {
  employee: Employee;
  teamId: string;
  timelineDates: Date[];
  cellWidth: number;
  timelineStart: Date;
  onAddTask: () => void;
  onViewTask: (task: Task) => void;
}

const EmployeeRow: React.FC<EmployeeRowProps> = ({ 
  employee, 
  teamId,
  timelineDates, 
  cellWidth, 
  timelineStart,
  onAddTask,
  onViewTask
}) => {
  // Collision Logic: Group tasks by overlap
  const rows = useMemo(() => {
    const timelineEnd = new Date(timelineStart);
    timelineEnd.setDate(timelineStart.getDate() + timelineDates.length);

    // Filter tasks that are visible in the current timeline
    const visibleTasks = employee.tasks.filter(task => {
      const start = parseDate(task.startDate);
      const end = parseDate(task.endDate);
      end.setDate(end.getDate() + 1); // Inclusive end date
      return end > timelineStart && start < timelineEnd;
    });

    const sortedTasks = [...visibleTasks].sort((a, b) => parseDate(a.startDate).getTime() - parseDate(b.startDate).getTime());
    const result: Task[][] = [];
    
    sortedTasks.forEach(task => {
      let placed = false;
      for (const row of result) {
        const lastTask = row[row.length - 1];
        if (parseDate(task.startDate) > parseDate(lastTask.endDate)) {
          row.push(task);
          placed = true;
          break;
        }
      }
      if (!placed) {
        result.push([task]);
      }
    });
    
    return result.length > 0 ? result : [[]];
  }, [employee.tasks, timelineStart, timelineDates.length]);

  return (
    <div className="flex group/row">
      <div className="w-48 p-3 border-r border-slate-100 flex items-center gap-3 bg-white group-hover/row:bg-slate-50 transition-colors sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-lg flex-shrink-0">
          {employee.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-[11px] truncate text-slate-900">{employee.name}</h3>
          <p className="text-[11px] text-slate-400 truncate">{employee.position}</p>
        </div>
        <button 
          onClick={onAddTask}
          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/row:opacity-100 p-1 bg-indigo-accent text-white rounded-lg transition-all hover:scale-110 shadow-sm"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
      
      <div className="relative min-h-[50px]" style={{ height: rows.length * 30 + 10, width: timelineDates.length * cellWidth }}>
        {/* Grid Lines */}
        <div className="absolute inset-0 flex pointer-events-none">
          {timelineDates.map((date, i) => {
            const day = date.getDay();
            return (
              <div 
                key={i} 
                className={`flex-shrink-0 border-r border-slate-100 h-full ${day === 6 ? 'bg-blue-50/30' : day === 0 ? 'bg-red-50/30' : ''}`} 
                style={{ width: cellWidth }} 
              />
            );
          })}
        </div>

        {/* Tasks */}
        <div className="relative h-full pt-2">
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="relative h-6 mb-1">
              {row.map(task => {
                const start = parseDate(task.startDate);
                const end = parseDate(task.endDate);
                // Make end date inclusive by adding 1 day
                end.setDate(end.getDate() + 1);
                
                const timelineEnd = new Date(timelineStart);
                timelineEnd.setDate(timelineStart.getDate() + timelineDates.length);

                // Skip if task is completely outside the visible timeline
                if (end <= timelineStart || start >= timelineEnd) return null;

                // Clip to timeline boundaries for visual representation
                const displayStart = new Date(Math.max(start.getTime(), timelineStart.getTime()));
                const displayEnd = new Date(Math.min(end.getTime(), timelineEnd.getTime()));

                const diffStart = (displayStart.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24);
                const duration = (displayEnd.getTime() - displayStart.getTime()) / (1000 * 60 * 60 * 24);
                
                // Ensure duration is at least a tiny bit visible if it's within the day
                const visualDuration = Math.max(0.01, duration);

                return (
                  <motion.button
                    key={task.id}
                    layoutId={task.id}
                    onClick={() => onViewTask(task)}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.02, y: -1 }}
                    className="absolute h-6 glass-indigo rounded px-1.5 flex items-center gap-1 overflow-hidden whitespace-nowrap shadow-sm border border-indigo-200 z-0"
                    style={{ 
                      left: diffStart * cellWidth, 
                      width: visualDuration * cellWidth,
                      top: 0
                    }}
                  >
                    <span className="text-[11px]">{task.emoji}</span>
                    <span className="text-[11px] font-bold truncate text-indigo-700">{task.title}</span>
                  </motion.button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface ModalProps {
  children: React.ReactNode;
  onClose: () => void;
}

const Modal: React.FC<ModalProps> = ({ children, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden border border-slate-200"
      >
        {children}
      </motion.div>
    </div>
  );
}

export default function App() {
  const [teams, setTeams] = useState<Team[]>(INITIAL_TEAMS);
  const [isConnected, setIsConnected] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'teams' | 'employees'>('teams');
  
  // Firebase Sync
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'app', 'state'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && data.teams) {
          setTeams(data.teams);
        }
      } else {
        // Initialize Firestore with initial data if it doesn't exist
        setDoc(doc(db, 'app', 'state'), { teams: INITIAL_TEAMS });
      }
      setIsConnected(true);
    }, (error) => {
      console.error("Firebase sync error:", error);
      setIsConnected(false);
    });

    // Check online status
    const handleOnline = () => setIsConnected(true);
    const handleOffline = () => setIsConnected(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsub();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const saveToFirebase = async (newTeams: Team[]) => {
    try {
      await setDoc(doc(db, 'app', 'state'), { teams: newTeams });
    } catch (error) {
      console.error("Error saving to Firebase:", error);
    }
  };
  const [timelineStart, setTimelineStart] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task & { teamId: string, empId: string } | null>(null);
  const [isEditingTask, setIsEditingTask] = useState<boolean>(false);
  const [isAddingTask, setIsAddingTask] = useState<{ teamId: string, empId: string } | null>(null);
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee & { teamId: string } | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<{ empId: string, teamId: string, name: string } | null>(null);
  const [modalEmoji, setModalEmoji] = useState('👤');
  
  const timelineDates = useMemo(() => {
    const year = timelineStart.getFullYear();
    const month = timelineStart.getMonth();
    // Get total days in the current month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return getTimelineDates(timelineStart, daysInMonth);
  }, [timelineStart]);
  const cellWidth = 45; // Reduced from 100 to fit more days

  const handleAddTask = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isAddingTask) return;

    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    
    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      description,
      startDate: formData.get('startDate') as string,
      endDate: formData.get('endDate') as string,
      category: formData.get('category') as string,
      emoji: recommendEmoji(title, description)
    };

    const updatedTeams = teams.map(team => {
      if (team.id === isAddingTask.teamId) {
        return {
          ...team,
          employees: team.employees.map(emp => {
            if (emp.id === isAddingTask.empId) {
              return { ...emp, tasks: [...emp.tasks, newTask] };
            }
            return emp;
          })
        };
      }
      return team;
    });

    setTeams(updatedTeams);
    saveToFirebase(updatedTeams);
    setIsAddingTask(null);
    setIsEditingTask(false);
  };

  const handleDeleteTask = () => {
    if (!selectedTask) return;
    
    const updatedTeams = teams.map(team => {
      if (team.id === selectedTask.teamId) {
        return {
          ...team,
          employees: team.employees.map(emp => {
            if (emp.id === selectedTask.empId) {
              return { ...emp, tasks: emp.tasks.filter(t => t.id !== selectedTask.id) };
            }
            return emp;
          })
        };
      }
      return team;
    });

    setTeams(updatedTeams);
    saveToFirebase(updatedTeams);
    setSelectedTask(null);
  };

  const handleEditTask = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedTask) return;

    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    
    const updatedTask: Task = {
      ...selectedTask,
      title,
      description,
      startDate: formData.get('startDate') as string,
      endDate: formData.get('endDate') as string,
      category: formData.get('category') as string,
      emoji: recommendEmoji(title, description)
    };

    const updatedTeams = teams.map(team => {
      if (team.id === selectedTask.teamId) {
        return {
          ...team,
          employees: team.employees.map(emp => {
            if (emp.id === selectedTask.empId) {
              return { 
                ...emp, 
                tasks: emp.tasks.map(t => t.id === selectedTask.id ? updatedTask : t) 
              };
            }
            return emp;
          })
        };
      }
      return team;
    });

    setTeams(updatedTeams);
    saveToFirebase(updatedTeams);
    setSelectedTask(null);
    setIsEditingTask(false);
  };

  const handleAddEmployee = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const teamId = formData.get('teamId') as string;
    const newEmployee: Employee = {
      id: Math.random().toString(36).substr(2, 9),
      name: formData.get('name') as string,
      position: formData.get('position') as string,
      emoji: modalEmoji,
      tasks: []
    };

    const updatedTeams = teams.map(team => {
      if (team.id === teamId) {
        return {
          ...team,
          employees: [...team.employees, newEmployee]
        };
      }
      return team;
    });

    setTeams(updatedTeams);
    saveToFirebase(updatedTeams);
    setIsAddingEmployee(false);
  };

  const handleEditEmployee = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingEmployee) return;

    const formData = new FormData(e.currentTarget);
    const teamId = formData.get('teamId') as string;
    const updatedEmployee: Employee = {
      ...editingEmployee,
      name: formData.get('name') as string,
      position: formData.get('position') as string,
      emoji: modalEmoji,
    };

    const updatedTeams = teams.map(team => {
      // Remove from old team if changed
      if (team.id === editingEmployee.teamId && team.id !== teamId) {
        return {
          ...team,
          employees: team.employees.filter(emp => emp.id !== editingEmployee.id)
        };
      }
      // Add to new team if changed
      if (team.id === teamId && team.id !== editingEmployee.teamId) {
        return {
          ...team,
          employees: [...team.employees, updatedEmployee]
        };
      }
      // Update in same team
      if (team.id === teamId) {
        return {
          ...team,
          employees: team.employees.map(emp => emp.id === editingEmployee.id ? updatedEmployee : emp)
        };
      }
      return team;
    });

    setTeams(updatedTeams);
    saveToFirebase(updatedTeams);
    setEditingEmployee(null);
  };

  const handleDeleteEmployee = () => {
    if (!deletingEmployee) return;
    
    const { empId, teamId } = deletingEmployee;
    const updatedTeams = teams.map(team => {
      if (team.id === teamId) {
        return {
          ...team,
          employees: team.employees.filter(emp => emp.id !== empId)
        };
      }
      return team;
    });

    setTeams(updatedTeams);
    saveToFirebase(updatedTeams);
    setDeletingEmployee(null);
  };

  const updateTeamName = (teamId: string, newName: string) => {
    const updatedTeams = teams.map(t => t.id === teamId ? { ...t, name: newName } : t);
    setTeams(updatedTeams);
    saveToFirebase(updatedTeams);
  };

  const handleReorderEmployees = (teamId: string, newEmployees: Employee[]) => {
    const updatedTeams = teams.map(team => {
      if (team.id === teamId) {
        return { ...team, employees: newEmployees };
      }
      return team;
    });
    setTeams(updatedTeams);
    saveToFirebase(updatedTeams);
  };

  const stats = useMemo(() => {
    const totalEmployees = teams.reduce((acc, t) => acc + t.employees.length, 0);
    const totalTasks = teams.reduce((acc, t) => acc + t.employees.reduce((a, e) => a + e.tasks.length, 0), 0);
    return {
      teams: teams.length,
      employees: totalEmployees,
      tasks: totalTasks
    };
  }, [teams]);

  return (
    <div className="flex h-screen overflow-hidden bg-white font-sans text-slate-900">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 260 : 80 }}
        className="bg-white border-r border-slate-100 flex flex-col z-20"
      >
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-accent flex items-center justify-center shadow-lg shadow-indigo-accent/20">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            {isSidebarOpen && <span className="font-bold tracking-tight text-lg text-slate-900">Working</span>}
          </div>
          {isSidebarOpen && (
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${isConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              {isConnected ? '동기화됨' : '연결 끊김'}
            </div>
          )}
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: '대시보드' },
            { id: 'teams', icon: Users, label: '팀 일정' },
            { id: 'employees', icon: Briefcase, label: '직원 관리' },
          ].map((item) => (
            <button 
              key={item.id}
              onClick={() => ['dashboard', 'teams', 'employees'].includes(item.id) && setCurrentView(item.id as any)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${currentView === item.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <item.icon className="w-5 h-5" />
              {isSidebarOpen && <span className="font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-6 text-slate-300 hover:text-slate-900 transition-colors flex justify-center"
        >
          <Menu className="w-5 h-5" />
        </button>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative bg-white">
        {/* Header */}
        <header className="h-20 border-b border-slate-100 flex items-center justify-between px-8 bg-white/90 backdrop-blur-md z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-slate-900">
              {currentView === 'dashboard' && '대시보드'}
              {currentView === 'teams' && '팀 진행 상황'}
              {currentView === 'employees' && '직원 관리'}
            </h1>
            
            {currentView === 'teams' && (
              <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-1 border border-slate-100">
                <button 
                  onClick={() => {
                    const d = new Date(timelineStart);
                    d.setMonth(d.getMonth() - 1);
                    setTimelineStart(d);
                  }}
                  className="p-1.5 hover:bg-white rounded-md transition-colors text-slate-500"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-medium px-2 text-slate-700">
                  {timelineStart.toLocaleDateString('ko-KR', { month: 'long', year: 'numeric' })}
                </span>
                <button 
                  onClick={() => {
                    const d = new Date(timelineStart);
                    d.setMonth(d.getMonth() + 1);
                    setTimelineStart(d);
                  }}
                  className="p-1.5 hover:bg-white rounded-md transition-colors text-slate-500"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {currentView === 'employees' && (
              <button 
                onClick={() => {
                  setModalEmoji('👤');
                  setIsAddingEmployee(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-accent text-white rounded-xl font-bold text-[11px] transition-all hover:bg-indigo-accent/90 shadow-lg shadow-indigo-accent/20"
              >
                <Plus className="w-4 h-4" />
                직원 등록
              </button>
            )}
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {currentView === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { label: '전체 팀', value: stats.teams, icon: Users, color: 'text-blue-400' },
                    { label: '전체 직원', value: stats.employees, icon: Briefcase, color: 'text-indigo-400' },
                    { label: '진행 중인 작업', value: stats.tasks, icon: Clock, color: 'text-emerald-400' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-3xl space-y-4 shadow-sm border border-slate-100">
                      <div className="flex items-center justify-between">
                        <div className={`p-3 rounded-2xl bg-slate-50 ${stat.color}`}>
                          <stat.icon className="w-6 h-6" />
                        </div>
                        <span className="text-[11px] font-bold tracking-tight text-slate-900">{stat.value}</span>
                      </div>
                      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">{stat.label}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white p-8 rounded-[32px] space-y-6 shadow-sm border border-slate-100">
                    <h3 className="text-xl font-bold text-slate-900">팀별 인원 현황</h3>
                    <div className="space-y-4">
                      {teams.map(team => (
                        <div key={team.id} className="space-y-2">
                          <div className="flex justify-between text-[11px]">
                            <span className="font-medium text-slate-700">{team.name}</span>
                            <span className="text-slate-400">{team.employees.length}명</span>
                          </div>
                          <div className="h-2 bg-slate-50 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(team.employees.length / stats.employees) * 100}%` }}
                              className="h-full bg-indigo-accent"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-[32px] space-y-6 shadow-sm border border-slate-100">
                    <h3 className="text-xl font-bold text-slate-900">최근 작업 요약</h3>
                    <div className="space-y-4">
                      {teams.flatMap(t => t.employees.flatMap(e => e.tasks)).slice(0, 5).map(task => (
                        <div key={task.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-100">
                          <span className="text-2xl">{task.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold truncate text-slate-900">{task.title}</p>
                            <p className="text-[11px] text-slate-400 truncate">{task.category}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[11px] font-medium text-indigo-700">{parseDate(task.endDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</p>
                            <p className="text-[11px] text-slate-300 uppercase font-bold">마감일</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {currentView === 'teams' && (
              <motion.div 
                key="teams"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-12"
              >
                {teams.map(team => (
                  <section key={team.id} className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 group">
                        <input 
                          type="text"
                          value={team.name}
                          onChange={(e) => updateTeamName(team.id, e.target.value)}
                          className="bg-transparent border-none focus:ring-0 text-[18px] font-bold tracking-tight p-0 w-auto min-w-[100px]"
                        />
                      </div>
                    </div>

                    <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100">
                      <div className="overflow-x-auto timeline-scroll">
                        <div className="min-w-max">
                          {/* Timeline Header */}
                          <div className="flex flex-col border-b border-slate-100 bg-slate-50/50">
                            {/* Month Row */}
                            <div className="flex border-b border-slate-100/50">
                              <div className="w-48 sticky left-0 bg-slate-50 z-30 border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]"></div>
                              <div className="flex">
                                {timelineDates.map((date, i) => {
                                  const isFirstDayOfMonth = date.getDate() === 1;
                                  const isFirstDayOfTimeline = i === 0;
                                  
                                  if (isFirstDayOfMonth || isFirstDayOfTimeline) {
                                    return (
                                      <div 
                                        key={`month-${i}`}
                                        className="flex-shrink-0 px-2 py-1 text-[10px] font-bold text-indigo-600 bg-indigo-50/30 border-r border-slate-100/50"
                                        style={{ 
                                          minWidth: cellWidth,
                                          // We don't know the exact width until the next month starts, 
                                          // but we can just show it at the start of each month.
                                        }}
                                      >
                                        {date.toLocaleDateString('ko-KR', { month: 'long' })}
                                      </div>
                                    );
                                  }
                                  return (
                                    <div 
                                      key={`month-empty-${i}`} 
                                      className="flex-shrink-0 border-r border-slate-100/10" 
                                      style={{ width: cellWidth }}
                                    ></div>
                                  );
                                })}
                              </div>
                            </div>
                            
                            {/* Days Row */}
                            <div className="flex">
                              <div className="w-48 p-3 font-bold text-[11px] uppercase tracking-widest text-slate-400 border-r border-slate-100 sticky left-0 bg-slate-50 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                구성원
                              </div>
                              <div className="flex">
                                {timelineDates.map((date, i) => {
                                  const day = date.getDay();
                                  return (
                                    <div 
                                      key={i} 
                                      className={`flex-shrink-0 border-r border-slate-100 flex flex-col items-center justify-center py-1.5 ${day === 6 ? 'bg-blue-50/50' : day === 0 ? 'bg-red-50/50' : ''}`}
                                      style={{ width: cellWidth }}
                                    >
                                      <span className={`text-[11px] font-bold uppercase ${day === 6 ? 'text-blue-400' : day === 0 ? 'text-red-400' : 'text-slate-300'}`}>
                                        {date.toLocaleDateString('ko-KR', { weekday: 'narrow' })}
                                      </span>
                                      <span className={`text-[11px] font-bold ${date.toDateString() === new Date().toDateString() ? 'text-indigo-600' : day === 6 ? 'text-blue-600' : day === 0 ? 'text-red-600' : 'text-slate-600'}`}>
                                        {date.getDate()}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          {/* Employee Rows */}
                          <div className="divide-y divide-slate-100">
                            {team.employees.map(emp => (
                              <EmployeeRow 
                                key={emp.id}
                                employee={emp}
                                teamId={team.id}
                                timelineDates={timelineDates}
                                cellWidth={cellWidth}
                                timelineStart={timelineStart}
                                onAddTask={() => setIsAddingTask({ teamId: team.id, empId: emp.id })}
                                onViewTask={(task) => setSelectedTask({ ...task, teamId: team.id, empId: emp.id })}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                ))}
              </motion.div>
            )}

            {currentView === 'employees' && (
              <motion.div 
                key="employees"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-16 pb-20"
              >
                {teams.map(team => (
                  <div key={team.id} className="flex flex-col lg:flex-row gap-8">
                    {/* Team Info - Left Side */}
                    <div className="lg:w-48 shrink-0 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-indigo-accent rounded-full" />
                        <h2 className="text-lg font-bold text-slate-900">{team.name}</h2>
                      </div>
                      <div className="px-3 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <span>구성원</span>
                          <span className="text-indigo-600">{team.employees.length}명</span>
                        </div>
                      </div>
                    </div>

                    {/* Employees Grid - Right Side */}
                    <div className="flex-1">
                      <Reorder.Group 
                        axis="y" 
                        values={team.employees} 
                        onReorder={(newOrder) => handleReorderEmployees(team.id, newOrder)}
                        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3"
                      >
                        {team.employees.map(emp => (
                          <Reorder.Item 
                            key={emp.id} 
                            value={emp}
                            className="bg-white p-3 rounded-2xl flex flex-col group hover:shadow-md transition-all duration-300 border border-slate-100 relative cursor-grab active:cursor-grabbing"
                          >
                            <div className="flex items-center gap-3 mb-3">
                              <div className="text-slate-200 group-hover:text-slate-300 transition-colors shrink-0">
                                <GripVertical className="w-4 h-4" />
                              </div>
                              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xl shrink-0">
                                {emp.emoji}
                              </div>
                              <div className="min-w-0">
                                <h3 className="font-bold text-[11px] text-slate-900 truncate">{emp.name}</h3>
                                <p className="text-[10px] text-slate-400 truncate">{emp.position}</p>
                              </div>
                            </div>

                            <div className="mt-auto pt-3 border-t border-slate-50 flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{emp.tasks.length}</span>
                              </div>

                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setModalEmoji(emp.emoji);
                                    setEditingEmployee({ ...emp, teamId: team.id });
                                  }}
                                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeletingEmployee({ empId: emp.id, teamId: team.id, name: emp.name });
                                  }}
                                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </Reorder.Item>
                        ))}
                      </Reorder.Group>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {selectedTask && !isEditingTask && (
          <Modal onClose={() => setSelectedTask(null)}>
            <div className="p-8 space-y-6 bg-white">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl">{selectedTask.emoji}</span>
                    <h2 className="text-2xl font-bold text-slate-900">{selectedTask.title}</h2>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                    <Briefcase className="w-4 h-4" />
                    <span>{selectedTask.category}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsEditingTask(true)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-indigo-600"
                  >
                    <Pencil className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={handleDeleteTask}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setSelectedTask(null)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-50 space-y-1">
                  <span className="text-[11px] font-bold uppercase text-slate-300">시작일</span>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    <span className="font-medium text-slate-700">{parseDate(selectedTask.startDate).toLocaleDateString('ko-KR')}</span>
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-50 space-y-1">
                  <span className="text-[11px] font-bold uppercase text-slate-300">종료일</span>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    <span className="font-medium text-slate-700">{parseDate(selectedTask.endDate).toLocaleDateString('ko-KR')}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase text-slate-300">설명</span>
                <p className="text-slate-500 leading-relaxed">
                  {selectedTask.description}
                </p>
              </div>

              <button 
                onClick={() => setSelectedTask(null)}
                className="w-full py-4 bg-indigo-accent text-white hover:bg-indigo-accent/90 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-accent/20"
              >
                닫기
              </button>
            </div>
          </Modal>
        )}

        {isEditingTask && selectedTask && (
          <Modal onClose={() => setIsEditingTask(false)}>
            <form onSubmit={handleEditTask} className="p-8 space-y-6 bg-white">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900">작업 수정</h2>
                <button 
                  type="button"
                  onClick={() => setIsEditingTask(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase text-slate-300">작업 제목</label>
                  <input 
                    name="title"
                    required
                    defaultValue={selectedTask.title}
                    placeholder="예: 디자인 리뷰"
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 focus:ring-2 focus:ring-indigo-accent outline-none transition-all text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase text-slate-300">시작일</label>
                    <input 
                      name="startDate"
                      type="date"
                      required
                      defaultValue={selectedTask.startDate}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 focus:ring-2 focus:ring-indigo-accent outline-none transition-all text-slate-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase text-slate-300">종료일</label>
                    <input 
                      name="endDate"
                      type="date"
                      required
                      defaultValue={selectedTask.endDate}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 focus:ring-2 focus:ring-indigo-accent outline-none transition-all text-slate-900"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase text-slate-300">카테고리</label>
                  <input 
                    name="category"
                    required
                    defaultValue={selectedTask.category}
                    placeholder="예: 매점 관리, 프로모션, 마케팅 등"
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 focus:ring-2 focus:ring-indigo-accent outline-none transition-all text-slate-900"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase text-slate-300">설명</label>
                  <textarea 
                    name="description"
                    rows={3}
                    defaultValue={selectedTask.description}
                    placeholder="예: 가정의 달 프로모션 패키지 구성 및 홍보물 배치 확인"
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 focus:ring-2 focus:ring-indigo-accent outline-none transition-all text-slate-900"
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-4 bg-indigo-accent text-white hover:bg-indigo-accent/90 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-accent/20"
              >
                작업 업데이트
              </button>
            </form>
          </Modal>
        )}

        {isAddingTask && (
          <Modal onClose={() => setIsAddingTask(null)}>
            <form onSubmit={handleAddTask} className="p-8 space-y-6 bg-white">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900">새 작업 추가</h2>
                <button 
                  type="button"
                  onClick={() => setIsAddingTask(null)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase text-slate-300">작업 제목</label>
                  <input 
                    name="title"
                    required
                    placeholder="예: 매점 재고 확인 및 발주"
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 focus:ring-2 focus:ring-indigo-accent outline-none transition-all text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase text-slate-300">시작일</label>
                    <input 
                      name="startDate"
                      type="date"
                      required
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 focus:ring-2 focus:ring-indigo-accent outline-none transition-all text-slate-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase text-slate-300">종료일</label>
                    <input 
                      name="endDate"
                      type="date"
                      required
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 focus:ring-2 focus:ring-indigo-accent outline-none transition-all text-slate-900"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase text-slate-300">카테고리</label>
                  <input 
                    name="category"
                    required
                    placeholder="예: 매점 관리, 프로모션, 마케팅 등"
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 focus:ring-2 focus:ring-indigo-accent outline-none transition-all text-slate-900"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase text-slate-300">설명</label>
                  <textarea 
                    name="description"
                    rows={3}
                    placeholder="예: 가정의 달 프로모션 패키지 구성 및 홍보물 배치 확인"
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 focus:ring-2 focus:ring-indigo-accent outline-none transition-all text-slate-900"
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-4 bg-indigo-accent text-white hover:bg-indigo-accent/90 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-accent/20"
              >
                작업 생성
              </button>
            </form>
          </Modal>
        )}

        {isAddingEmployee && (
          <Modal onClose={() => setIsAddingEmployee(false)}>
            <form onSubmit={handleAddEmployee} className="p-8 space-y-6 bg-white">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900">직원 등록</h2>
                <button 
                  type="button"
                  onClick={() => setIsAddingEmployee(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase text-slate-300">이름</label>
                  <input 
                    name="name"
                    required
                    placeholder="이름을 입력하세요"
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 focus:ring-2 focus:ring-indigo-accent outline-none transition-all text-slate-900"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase text-slate-300">이모지 선택</label>
                  <div className="grid grid-cols-5 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    {EMPLOYEE_EMOJIS.map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setModalEmoji(emoji)}
                        className={`text-xl p-2 rounded-lg transition-all ${modalEmoji === emoji ? 'bg-white shadow-sm scale-110 border-indigo-200 border' : 'hover:bg-white/50'}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase text-slate-300">직책</label>
                  <input 
                    name="position"
                    required
                    placeholder="예: 시니어 디자이너"
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 focus:ring-2 focus:ring-indigo-accent outline-none transition-all text-slate-900"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase text-slate-300">소속 팀</label>
                  <select 
                    name="teamId"
                    required
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 focus:ring-2 focus:ring-indigo-accent outline-none transition-all appearance-none text-slate-900"
                  >
                    {teams.map(team => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-4 bg-indigo-accent text-white hover:bg-indigo-accent/90 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-accent/20"
              >
                등록 완료
              </button>
            </form>
          </Modal>
        )}

        {editingEmployee && (
          <Modal onClose={() => setEditingEmployee(null)}>
            <form onSubmit={handleEditEmployee} className="p-8 space-y-6 bg-white">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900">직원 정보 수정</h2>
                <button 
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase text-slate-300">이름</label>
                  <input 
                    name="name"
                    required
                    defaultValue={editingEmployee.name}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 focus:ring-2 focus:ring-indigo-accent outline-none transition-all text-slate-900"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase text-slate-300">이모지 선택</label>
                  <div className="grid grid-cols-5 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    {EMPLOYEE_EMOJIS.map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setModalEmoji(emoji)}
                        className={`text-xl p-2 rounded-lg transition-all ${modalEmoji === emoji ? 'bg-white shadow-sm scale-110 border-indigo-200 border' : 'hover:bg-white/50'}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase text-slate-300">직책</label>
                  <input 
                    name="position"
                    required
                    defaultValue={editingEmployee.position}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 focus:ring-2 focus:ring-indigo-accent outline-none transition-all text-slate-900"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase text-slate-300">소속 팀</label>
                  <select 
                    name="teamId"
                    required
                    defaultValue={editingEmployee.teamId}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 focus:ring-2 focus:ring-indigo-accent outline-none transition-all appearance-none text-slate-900"
                  >
                    {teams.map(team => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-4 bg-indigo-accent text-white hover:bg-indigo-accent/90 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-accent/20"
              >
                수정 완료
              </button>
            </form>
          </Modal>
        )}

        {deletingEmployee && (
          <Modal onClose={() => setDeletingEmployee(null)}>
            <div className="p-8 space-y-6 bg-white">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900">직원 삭제</h2>
                <button 
                  onClick={() => setDeletingEmployee(null)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-2">
                <p className="text-slate-600">
                  <span className="font-bold text-slate-900">{deletingEmployee.name}</span>님을 정말로 삭제하시겠습니까?
                </p>
                <p className="text-[11px] text-red-500 font-medium">이 작업은 되돌릴 수 없으며, 해당 직원의 모든 작업 데이터가 삭제됩니다.</p>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setDeletingEmployee(null)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-2xl font-bold transition-all"
                >
                  취소
                </button>
                <button 
                  onClick={handleDeleteEmployee}
                  className="flex-1 py-4 bg-red-500 text-white hover:bg-red-600 rounded-2xl font-bold transition-all shadow-lg shadow-red-500/20"
                >
                  삭제하기
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
