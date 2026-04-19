-- SnapGuide schema for Azure PostgreSQL
-- Run this once against your snapguide database.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS apps (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  description   text,
  url           text,
  icon_url      text,
  auto_redact   boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS process_recordings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id        uuid NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  tour_id       uuid,
  title         text NOT NULL DEFAULT 'Untitled recording',
  description   text,
  status        text NOT NULL DEFAULT 'draft',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recordings_app_id
  ON process_recordings(app_id);

CREATE TABLE IF NOT EXISTS process_recording_steps (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id    uuid NOT NULL REFERENCES process_recordings(id) ON DELETE CASCADE,
  sort_order      integer NOT NULL DEFAULT 0,
  action_type     text NOT NULL DEFAULT 'click',
  instruction     text NOT NULL DEFAULT '',
  notes           text,
  selector        text,
  target_url      text,
  screenshot_url  text,
  element_text    text,
  element_tag     text,
  input_value     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_steps_recording_id
  ON process_recording_steps(recording_id);
