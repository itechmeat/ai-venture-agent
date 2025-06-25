export interface Startup {
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
  public_snapshot: StartupSnapshot;
  new_snapshot: StartupSnapshot;
  role: string | null;
}

export interface StartupSnapshot {
  id: string;
  created_at: string;
  updated_at: string;
  project_id: string;
  version: number;
  name: string | null;
  slogan: string | null;
  description: string | null;
  status: 'idea' | 'concept' | 'prototype' | 'mvp' | 'growth' | 'scale';
  country: string | null;
  city: string | null;
  repository_urls: string[] | null;
  website_urls: string[] | null;
  logo_url: string | null;
  banner_url: string | null;
  video_urls: string[] | null;
  author_id: StartupAuthor | null;
  is_locked: boolean;
  team_members: string[] | null;
  contents: string[] | null;
  scoring_id: string;
  scoring: StartupScoring | null;
}

export interface StartupAuthor {
  id: string;
  user_profiles: {
    id: string;
    full_name: string | null;
    nickname: string | null;
    avatar_url: string | null;
  } | null;
}

export interface StartupScoring {
  id: string;
  created_at: string;
  updated_at: string;
  snapshot_id: string;
  status: 'completed' | 'pending' | 'failed';
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

export interface StartupListResponse {
  success: boolean;
  data: {
    projects: Startup[];
  };
}
