export interface Task {
  id: string;
  title: string;
  description: string;
  startDate: string; // ISO string
  endDate: string;   // ISO string
  category: string;
  emoji: string;
}

export interface Employee {
  id: string;
  name: string;
  position: string;
  emoji: string;
  tasks: Task[];
}

export interface Team {
  id: string;
  name: string;
  employees: Employee[];
}

export type ViewMode = 'day' | 'week' | 'month';
