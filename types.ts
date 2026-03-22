export enum SampleStatus {
  HOLD = 'Hold',
  TAREK = 'Tarek',
  CD = 'CD',
  PAYMENT = 'Payment',
  SAVING = 'Saving Sample',
  SETUP = 'Setup',
  FINISHED = 'Finished',
  DELETED = 'Deleted'
}

export enum HoldFileStatus {
  FOLLOWUP = 'FollowUp Mr TAREK',
  SETUP = 'Setup',
  PAYMENT = 'Payment',
  SAVING = 'Saving Sample',
  WAITING = 'Waiting Results',
  WES_CD = 'WES CD',
  PGTM_CD = 'PGTM CD',
  ANOTHER_CYCLE = 'Another Cycle',
  FINISHED = 'Finished'
}

export enum TubeType {
  SERUM = 'Serum',
  EDTA = 'EDTA',
  AMNIO = 'Amnio',
  TISSUE = 'Tissue',
  CVS = 'CVS',
  NIPT = 'NIPT',
  HEPARIN = 'Heparin'
}

export enum UserRole {
  ADMIN = 'Admin',
  USER = 'User'
}

export type CommitmentGrade = 'Good' | 'Average' | 'Poor' | 'Unrated';

export type View =
  | 'home'
  | 'sample-registration'
  | 'dashboard'
  | 'inventory'
  | 'hold-cases'
  | 'register-pending-cases'
  | 'hold-dashboard'
  | 'staff-evaluation'
  | 'settings'
  | 'updates';

export interface User {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: UserRole;
  permissions: View[];
  createdAt: string;
  email?: string;
  phone?: string;
}

export interface Fridge {
  id: string;
  name: string;
  capacity: number;
  location?: string;
}

export interface Evaluation {
  id: string;
  staffId: string;
  staffName: string;
  rating: number;
  adminId: string;
  month: string;
  createdAt: string;
}

export interface InventorySchedule {
  id: string;
  staff_id: string;
  staff_name: string;
  staff_phone?: string;
  staff_email?: string;
  date: string;
  time: string;
  status: 'pending' | 'sent';
  type: 'WhatsApp' | 'Email' | 'Both';
  message: string;
  commitment_grade?: CommitmentGrade;
  send_advance_reminder: boolean;
  send_same_day_reminder: boolean;
}

export interface NotificationSettings {
  inventory_day: number;
  whatsapp_enabled: boolean;
  email_enabled: boolean;
}

export interface Sample {
  id: string;
  patient_name: string;
  patient_id: string;
  tube_type: TubeType;
  count: number;
  status: SampleStatus;
  notes: string;
  created_at: string;
  finished_at?: string;
  finished_by?: string;
  created_by: string;
  storage_id?: string;
  barcode?: string;
}

export interface HoldCase {
  id: string;
  patient_name: string;
  patient_id: string;
  test_type: string;
  center_name: string;
  comment: string;
  status: HoldFileStatus;
  is_finished: boolean;
  created_at: string;
  finished_at?: string;
  finished_by?: string;
  created_by: string;
}