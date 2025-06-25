export interface FullStartupProject {
  id: string;
  created_at: string;
  updated_at: string;
  slug: string;
  public_snapshot_id: string;
  new_snapshot_id: string;
  is_public: boolean;
  is_demo: boolean;
  is_archived: boolean;
  owner_id: string;
  name: string;
  slogan: string | null;
  description: string;
  status: string;
  country: string;
  city: string;
  repository_urls: string[];
  website_urls: string[];
  logo_url: string;
  banner_url: string;
  video_urls: string[];
}

export interface InvestmentExpectation {
  id: string;
  created_at: string;
  updated_at: string;
  project_id: string;
  milestone_id: string;
  amount: number;
  equity_percentage: number;
  currency_code: string;
  stage_title: string;
  min_investment: number;
  description: string;
  author_id: string;
  is_active: boolean;
}

export interface Scoring {
  id: string;
  created_at: string;
  updated_at: string;
  snapshot_id: string;
  status: string;
  investment_rating: number;
  market_potential: number;
  team_competency: number;
  tech_innovation: number;
  business_model: number;
  execution_risk: number;
  summary: string;
  research: string;
  score: number;
  ai_model_version: string;
  project_id: string | null;
}

export interface Content {
  id: string;
  created_at: string;
  updated_at: string;
  project_id: string;
  slug: string;
  title: string;
  content_type: string;
  content: string;
  file_urls: string[];
  author_id: string;
  is_public: boolean;
  deleted_at: string | null;
  description: string;
}

export interface Snapshot {
  id: string;
  created_at: string;
  updated_at: string;
  project_id: string;
  version: number;
  name: string;
  slogan: string | null;
  description: string;
  status: string;
  country: string;
  city: string;
  repository_urls: string[] | null;
  website_urls: string[];
  logo_url: string;
  banner_url: string;
  video_urls: string[] | null;
  author_id: string;
  is_locked: boolean;
  team_members: string[];
  contents: string[];
  scoring_id: string | null;
}

export interface UserProfile {
  id: string;
  created_at: string;
  updated_at: string;
  full_name: string;
  nickname: string;
  avatar_url: string;
  bio: string;
  professional_background: string | null;
  startup_ecosystem_role: string | null;
  country: string;
  city: string;
  website_url: string | null;
  x_username: string | null;
  linkedin_username: string | null;
  github_username: string | null;
  cover_url: string;
  telegram_username: string | null;
}

export interface SocialConnection {
  id: string;
  user_id: string;
  platform: string;
  platform_user_id: string;
  platform_username: string;
  platform_display_name: string;
  platform_avatar_url: string;
  platform_profile_url: string;
  is_active: boolean;
  last_synced_at: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  created_at: string;
  updated_at: string;
  project_id: string;
  user_id: string;
  joined_at: string | null;
  departed_at: string | null;
  departed_reason: string | null;
  is_founder: boolean;
  equity_percent: number | null;
  positions: string[];
  status: string;
  author_id: string;
  initial_data: unknown | null;
  user_profiles: UserProfile;
  social_connections: SocialConnection[];
}

export interface FundingRound {
  id: string;
  created_at: string;
  updated_at: string;
  project_id: string;
  snapshot_id: string | null;
  type: string;
  status: string;
  date: string;
  amount: number;
  investor_name: string;
  proof_urls: string[];
  description: string;
  valuation_pre: number | null;
  valuation_post: number | null;
  author_id: string;
  deleted_at: string | null;
}

export interface Checkpoint {
  id: string;
  created_at: string;
  updated_at: string;
  milestone_id: string;
  title: string;
  description: string;
  percentage: number;
  is_completed: boolean;
  completed_date: string | null;
  approved_date: string | null;
  approved_by_type: string | null;
  approved_by_id: string | null;
  author_id: string;
  order_index: number;
  is_planned: boolean;
  type: string;
  proof_urls: string[] | null;
}

export interface Milestone {
  id: string;
  created_at: string;
  updated_at: string;
  project_id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  status: string;
  target_completion_percentage: number;
  actual_completion_percentage: number;
  completion_date: string | null;
  approved_date: string | null;
  approved_by_type: string | null;
  approved_by_id: string | null;
  author_id: string;
  order_index: number;
  proof_urls: string[];
  project_milestone_checkpoints: Checkpoint[];
  project_investment_expectations: InvestmentExpectation[];
}

export interface ScoringWithSnapshot {
  id: string;
  created_at: string;
  updated_at: string;
  snapshot_id: string;
  status: string;
  investment_rating: number;
  market_potential: number;
  team_competency: number;
  tech_innovation: number;
  business_model: number;
  execution_risk: number;
  summary: string;
  research: string;
  score: number;
  ai_model_version: string;
  project_id: string | null;
  snapshot: {
    id: string;
    version: number;
    created_at: string;
  };
}

export interface FullStartupData {
  project: FullStartupProject;
  current_investment_expectation: InvestmentExpectation;
  current_scoring: Scoring;
  content: Content[];
  snapshots: Snapshot[];
  team_members: TeamMember[];
  funding_rounds: FundingRound[];
  milestones: Milestone[];
  all_scoring: ScoringWithSnapshot[];
}

export interface FullStartupAPIResponse {
  success: boolean;
  data: {
    success: boolean;
    data: FullStartupData;
  };
  metadata: {
    processingTime: number;
    projectId: string;
  };
}
