import {
  CareerGoal,
  City,
  Direction,
  EmployerBudgetRange,
  EmployerContactKind,
  EmployerTaskType,
  EmploymentType,
  GrowthSpeed,
  JobWorkFormat,
  Level,
  SpecialistWorkFormat,
  TeamSize,
  WorkLanguage,
} from '@/shared/model';
import type { CreateJobPayload, Job } from '@/features/jobs/model';

export interface Company {
  _id: string;
  name: string;
  logo?: string | null;
  workFormat: JobWorkFormat;
  valuesTags: string[];
  growthSpeed: GrowthSpeed;
  teamSize: TeamSize;
  languages: WorkLanguage[];
  description: string;
}

export type CompanyPayload = Omit<Company, '_id'>;

export type EmployerJobPayload = Omit<
  CreateJobPayload,
  'company' | 'companyId' | 'companyCulture'
>;

export type CreateEmployerJobPayload = Omit<EmployerJobPayload, 'isActive'>;

export interface EmployerJobsResponse {
  jobs: Job[];
  total: number;
}

export interface EmployerProfile {
  id: string;
  name: string;
  description: string;
  industry: Direction;
  taskType: EmployerTaskType;
  budgetRange?: EmployerBudgetRange | null;
}

export type EmployerProfilePayload = {
  name: string;
  description: string;
  industry: Direction;
  taskType: EmployerTaskType;
  budgetRange?: EmployerBudgetRange | null;
};

export interface SpecialistExperienceProject {
  name: string;
  role: string;
  result: string;
  link?: string;
}

export interface SpecialistWorkplace {
  company: string;
  position: string;
  period: string;
  achievement: string;
  projects?: SpecialistExperienceProject[];
}

export interface SpecialistCard {
  id: string;
  name: string;
  aboutMe?: string | null;
  avatar?: string | null;
  directions: Direction[];
  level: Level;
  skills: string[];
  careerGoal: CareerGoal | string;
  city: City | null;
  employmentType: EmploymentType | null;
  experience?: string | null;
  workplaces?: SpecialistWorkplace[];
  projects?: SpecialistExperienceProject[];
  careerStartDate?: string | Date | null;
  currentCompany?: string | null;
  currentPosition?: string | null;
  currentAchievement?: string | null;
  wantsRelocation?: boolean;
  relocationFromCity?: string | null;
  relocationToCountry?: string | null;
}

export interface SpecialistFilters {
  direction?: Direction;
  level?: Level;
  city?: City;
  format?: SpecialistWorkFormat;
}

export interface SpecialistsResponse {
  items: SpecialistCard[];
  total: number;
  page: number;
  limit: number;
}

export type ContactSpecialistPayload = {
  kind: EmployerContactKind;
  message?: string;
};
