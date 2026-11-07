-- ============================================================
-- SCHÉMA SUPABASE — Portail Admin NeoChat
-- Généré pour Supabase SQL Editor
-- ============================================================

-- 1. TYPES ENUM
-- ============================================================

CREATE TYPE admin_role AS ENUM ('SUPER_COORDINATEUR', 'COORDINATEUR', 'COORDINATEUR');
CREATE TYPE entity_status AS ENUM ('ACTIVE', 'ARCHIVED');

-- 2. TABLE : admin_users
-- ============================================================

CREATE TABLE admin_users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20)  NOT NULL UNIQUE,
  role         admin_role   NOT NULL DEFAULT 'COORDINATEUR',
  name         VARCHAR(100),
  otp_code     VARCHAR(4),
  otp_expiry   TIMESTAMPTZ,
  status       entity_status NOT NULL DEFAULT 'ACTIVE',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Index pour les recherches par téléphone (login)
CREATE INDEX idx_admin_users_phone ON admin_users (phone_number);
-- Index pour les OTP actifs
CREATE INDEX idx_admin_users_otp ON admin_users (otp_code);
-- Index pour filtrer les admins actifs
CREATE INDEX idx_admin_users_status ON admin_users (status);

-- 3. TABLE : knowledge_documents
-- ============================================================

CREATE TABLE knowledge_documents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            VARCHAR(255) NOT NULL,
  content_markdown TEXT,
  uploaded_by      UUID         NOT NULL REFERENCES admin_users(id) ON DELETE RESTRICT,
  status           entity_status NOT NULL DEFAULT 'ACTIVE',
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Index pour les filtres courants
CREATE INDEX idx_knowledge_documents_uploaded_by ON knowledge_documents (uploaded_by);
CREATE INDEX idx_knowledge_documents_status ON knowledge_documents (status);
CREATE INDEX idx_knowledge_documents_created_at ON knowledge_documents (created_at DESC);

-- 4. TABLE : annonces_express
-- ============================================================

CREATE TABLE annonces_express (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message     TEXT         NOT NULL,
  created_by  UUID         NOT NULL REFERENCES admin_users(id) ON DELETE RESTRICT,
  expires_at  TIMESTAMPTZ  NOT NULL,
  status      entity_status NOT NULL DEFAULT 'ACTIVE',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Index pour les annonces actives et non expirées (requête la plus fréquente)
CREATE INDEX idx_annonces_express_active ON annonces_express (status, expires_at)
  WHERE status = 'ACTIVE';
CREATE INDEX idx_annonces_express_created_by ON annonces_express (created_by);
CREATE INDEX idx_annonces_express_created_at ON annonces_express (created_at DESC);

-- Contrainte CHECK : une annonce doit avoir une date d'expiration future
-- (Optionnel, appliqué au niveau application également)
-- ALTER TABLE annonces_express ADD CONSTRAINT chk_expires_future CHECK (expires_at > created_at);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Activer RLS sur toutes les tables
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE annonces_express ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------
-- POLICIES admin_users
-- ----------------------------------------------------------

-- Lecture : tout admin authentifié peut voir la liste des admins
CREATE POLICY "Les admins peuvent voir les autres admins"
  ON admin_users
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' IS NOT NULL
  );

-- Création/modification/suppression : seulement SUPER_COORDINATEUR
CREATE POLICY "Seuls les SUPER_COORDINATEUR peuvent créer des admins"
  ON admin_users
  FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'role' = 'SUPER_COORDINATEUR'
  );

CREATE POLICY "Seuls les SUPER_COORDINATEUR peuvent modifier des admins"
  ON admin_users
  FOR UPDATE
  USING (
    auth.jwt() ->> 'role' = 'SUPER_COORDINATEUR'
  );

CREATE POLICY "Seuls les SUPER_COORDINATEUR peuvent archiver des admins"
  ON admin_users
  FOR DELETE
  USING (
    auth.jwt() ->> 'role' = 'SUPER_COORDINATEUR'
  );

-- ----------------------------------------------------------
-- POLICIES knowledge_documents
-- ----------------------------------------------------------

-- Lecture : tout admin peut voir les documents actifs
CREATE POLICY "Tout admin peut voir les documents actifs"
  ON knowledge_documents
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' IS NOT NULL
    AND status = 'ACTIVE'
  );

-- Création : tout admin peut créer un document
CREATE POLICY "Tout admin peut créer un document"
  ON knowledge_documents
  FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'role' IS NOT NULL
    AND uploaded_by = (auth.jwt() ->> 'admin_id')::UUID
  );

-- Modification : tout admin peut modifier (le middleware backend gère les permissions fines)
CREATE POLICY "Tout admin peut modifier un document"
  ON knowledge_documents
  FOR UPDATE
  USING (
    auth.jwt() ->> 'role' IS NOT NULL
  );

-- Suppression (archivage) : tout admin peut archiver
CREATE POLICY "Tout admin peut archiver un document"
  ON knowledge_documents
  FOR DELETE
  USING (
    auth.jwt() ->> 'role' IS NOT NULL
  );

-- ----------------------------------------------------------
-- POLICIES annonces_express
-- ----------------------------------------------------------

-- Lecture : tout admin peut voir les annonces actives et non expirées
CREATE POLICY "Tout admin peut voir les annonces actives"
  ON annonces_express
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' IS NOT NULL
    AND status = 'ACTIVE'
  );

-- Création : tout admin peut créer une annonce
CREATE POLICY "Tout admin peut créer une annonce"
  ON annonces_express
  FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'role' IS NOT NULL
    AND created_by = (auth.jwt() ->> 'admin_id')::UUID
  );

-- Modification : tout admin peut modifier
CREATE POLICY "Tout admin peut modifier une annonce"
  ON annonces_express
  FOR UPDATE
  USING (
    auth.jwt() ->> 'role' IS NOT NULL
  );

-- Suppression (archivage) : tout admin peut archiver
CREATE POLICY "Tout admin peut archiver une annonce"
  ON annonces_express
  FOR DELETE
  USING (
    auth.jwt() ->> 'role' IS NOT NULL
  );

-- ============================================================
-- NOTES D'UTILISATION
-- ============================================================
--
-- 1. Ces policies RLS fonctionnent avec le JWT custom de NeoChat.
--    Le JWT doit contenir les claims : admin_id, phone, role
--
-- 2. Pour que Supabase reconnaisse le JWT custom, il faut :
--    - Aller dans Settings > API > JWT Secret
--    - Y coller la même valeur que JWT_SECRET dans le .env du backend
--
-- 3. Les policies RLS sont une couche de défense supplémentaire.
--    Le contrôle d'accès principal reste dans le middleware backend.
--
-- 4. Pour insérer le premier SUPER_COORDINATEUR (via Supabase SQL Editor) :
--    INSERT INTO admin_users (phone_number, role, name)
--    VALUES ('+226XXXXXXXX', 'SUPER_COORDINATEUR', 'Admin Name');
--
-- ============================================================