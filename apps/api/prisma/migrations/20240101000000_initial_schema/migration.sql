-- Migration: Initial schema
-- Created: 2024-01-01

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "CEFR_LEVEL" AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');
CREATE TYPE "ACCOUNT_STATUS" AS ENUM ('active', 'suspended', 'deleted');
CREATE TYPE "SCENARIO_CATEGORY" AS ENUM ('daily_conversation', 'business', 'travel', 'social', 'interview', 'academic');

CREATE TABLE "users" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "avatar_url" VARCHAR(500),
    "native_language" VARCHAR(10) NOT NULL DEFAULT 'zh-CN',
    "current_proficiency" "CEFR_LEVEL" NOT NULL DEFAULT 'A1',
    "account_status" "ACCOUNT_STATUS" NOT NULL DEFAULT 'active',
    "email_verified" BOOLEAN NOT NULL DEFAULT FALSE,
    "last_active_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "valid_email" CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX "idx_users_email" ON "users"("email");
CREATE INDEX "idx_users_native_language" ON "users"("native_language");
CREATE INDEX "idx_users_proficiency" ON "users"("current_proficiency");
CREATE INDEX "idx_users_last_active" ON "users"("last_active_at" DESC);

CREATE TABLE "user_learning_profiles" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
    "preferred_session_duration" INTEGER NOT NULL DEFAULT 15,
    "daily_goal_minutes" INTEGER NOT NULL DEFAULT 15,
    "notification_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
    "reminder_time" VARCHAR(5),
    "learning_goals" JSONB NOT NULL DEFAULT '[]',
    "target_proficiency" "CEFR_LEVEL",
    "target_achievement_date" DATE,
    "accessibility_preferences" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "scenarios" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "category" "SCENARIO_CATEGORY" NOT NULL,
    "difficulty" "CEFR_LEVEL" NOT NULL,
    "locale" VARCHAR(10) NOT NULL DEFAULT 'en-US',
    "thumbnail_url" VARCHAR(500),
    "estimated_minutes" INTEGER NOT NULL DEFAULT 10,
    "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_scenarios_category" ON "scenarios"("category");
CREATE INDEX "idx_scenarios_difficulty" ON "scenarios"("difficulty");
CREATE INDEX "idx_scenarios_locale" ON "scenarios"("locale");
CREATE INDEX "idx_scenarios_active" ON "scenarios"("is_active") WHERE "is_active" = TRUE;

CREATE TABLE "dialogues" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "scenario_id" UUID NOT NULL REFERENCES "scenarios"("id") ON DELETE CASCADE,
    "title" VARCHAR(255) NOT NULL,
    "display_order" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_dialogues_scenario" ON "dialogues"("scenario_id");
CREATE INDEX "idx_dialogues_order" ON "dialogues"("scenario_id", "display_order");

CREATE TABLE "characters" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "role" VARCHAR(50) NOT NULL,
    "avatar_url" VARCHAR(500),
    "voice_id" VARCHAR(100),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "dialogue_turns" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "dialogue_id" UUID NOT NULL REFERENCES "dialogues"("id") ON DELETE CASCADE,
    "turn_order" INTEGER NOT NULL,
    "speaker_type" VARCHAR(20) NOT NULL,
    "character_id" UUID REFERENCES "characters"("id"),
    "content" TEXT NOT NULL,
    "content_type" VARCHAR(20) NOT NULL DEFAULT 'text',
    "audio_url" VARCHAR(500),
    "hints" JSONB NOT NULL DEFAULT '[]',
    "ideal_response" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_turns_dialogue" ON "dialogue_turns"("dialogue_id");
CREATE INDEX "idx_turns_order" ON "dialogue_turns"("dialogue_id", "turn_order");

CREATE TABLE "vocabulary" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "scenario_id" UUID NOT NULL REFERENCES "scenarios"("id") ON DELETE CASCADE,
    "word" VARCHAR(255) NOT NULL,
    "phonetic" VARCHAR(255),
    "translation" TEXT NOT NULL,
    "audio_url" VARCHAR(500),
    "difficulty" "CEFR_LEVEL" NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_vocabulary_scenario" ON "vocabulary"("scenario_id");
CREATE INDEX "idx_vocabulary_difficulty" ON "vocabulary"("difficulty");

CREATE TABLE "user_progress" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "scenario_id" UUID NOT NULL REFERENCES "scenarios"("id") ON DELETE CASCADE,
    "completed_dialogues" INTEGER NOT NULL DEFAULT 0,
    "total_dialogues" INTEGER NOT NULL,
    "best_score" INTEGER,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_practiced_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE("user_id", "scenario_id")
);

CREATE INDEX "idx_progress_user" ON "user_progress"("user_id");
CREATE INDEX "idx_progress_scenario" ON "user_progress"("scenario_id");
CREATE INDEX "idx_progress_user_scenario" ON "user_progress"("user_id", "scenario_id");

CREATE TABLE "voice_recordings" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "session_id" UUID,
    "turn_id" UUID,
    "audio_url" VARCHAR(500) NOT NULL,
    "duration_ms" INTEGER NOT NULL,
    "score" INTEGER,
    "transcript" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_recordings_user" ON "voice_recordings"("user_id");
CREATE INDEX "idx_recordings_session" ON "voice_recordings"("session_id");
CREATE INDEX "idx_recordings_created" ON "voice_recordings"("created_at" DESC);

CREATE TABLE "learning_sessions" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "scenario_id" UUID REFERENCES "scenarios"("id"),
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "completed_at" TIMESTAMPTZ,
    "duration_sec" INTEGER,
    "turns_count" INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX "idx_sessions_user" ON "learning_sessions"("user_id");
CREATE INDEX "idx_sessions_scenario" ON "learning_sessions"("scenario_id");
CREATE INDEX "idx_sessions_started" ON "learning_sessions"("started_at" DESC);
CREATE INDEX "idx_sessions_completed" ON "learning_sessions"("completed_at" DESC) WHERE "completed_at" IS NOT NULL;

CREATE TABLE "achievements" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) UNIQUE NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "icon_url" VARCHAR(500),
    "points" INTEGER NOT NULL DEFAULT 0,
    "criteria" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "user_achievements" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "achievement_id" UUID NOT NULL REFERENCES "achievements"("id"),
    "earned_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE("user_id", "achievement_id")
);

CREATE INDEX "idx_user_achievements_user" ON "user_achievements"("user_id");
CREATE INDEX "idx_user_achievements_earned" ON "user_achievements"("earned_at" DESC);

CREATE TABLE "subscriptions" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
    "tier" VARCHAR(20) NOT NULL DEFAULT 'free',
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "current_period_start" TIMESTAMPTZ NOT NULL,
    "current_period_end" TIMESTAMPTZ NOT NULL,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT FALSE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "password_reset_tokens" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "token" VARCHAR(255) UNIQUE NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "used_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_password_reset_token" ON "password_reset_tokens"("token");
CREATE INDEX "idx_password_reset_user" ON "password_reset_tokens"("user_id");
CREATE INDEX "idx_password_reset_expires" ON "password_reset_tokens"("expires_at");

CREATE TABLE "email_verification_tokens" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
    "token" VARCHAR(255) UNIQUE NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_email_verification_token" ON "email_verification_tokens"("token");

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_learning_profiles_updated_at
    BEFORE UPDATE ON user_learning_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scenarios_updated_at
    BEFORE UPDATE ON scenarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_progress_updated_at
    BEFORE UPDATE ON user_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
