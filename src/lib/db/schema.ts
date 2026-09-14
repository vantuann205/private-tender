import { sql } from "drizzle-orm";
import {
  check,
  pgTable,
  varchar,
  timestamp,
  text,
  primaryKey,
  foreignKey,
  unique,
} from "drizzle-orm/pg-core";

export const workspaces = pgTable("pt_workspaces", {
  tokenHash: varchar("token_hash", { length: 64 }).primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const tenders = pgTable(
  "pt_tenders",
  {
    workspaceHash: varchar("workspace_hash", { length: 64 })
      .notNull()
      .references(() => workspaces.tokenHash, { onDelete: "cascade" }),
    id: varchar("id", { length: 64 }).notNull(),
    title: varchar("title", { length: 120 }).notNull(),
    description: text("description").notNull(),
    requirements: text("requirements").array().notNull(),
    deadline: timestamp("deadline", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    winnerRule: varchar("winner_rule", { length: 80 }).notNull(),
    status: varchar("status", { length: 10 }).notNull(),
    organization: varchar("organization", { length: 120 }).notNull(),
    category: varchar("category", { length: 80 }).notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceHash, table.id] }),
    check(
      "pt_tenders_status",
      sql`${table.status} IN ('Draft', 'Open', 'Closed')`,
    ),
    check(
      "pt_tenders_title",
      sql`length(trim(${table.title})) BETWEEN 1 AND 120`,
    ),
    check(
      "pt_tenders_description",
      sql`length(trim(${table.description})) BETWEEN 1 AND 3000`,
    ),
    check(
      "pt_tenders_requirements",
      sql`cardinality(${table.requirements}) BETWEEN 1 AND 1500 AND length(array_to_string(${table.requirements}, E'\n')) <= 3000`,
    ),
    check(
      "pt_tenders_winner_rule",
      sql`${table.winnerRule} IN ('Lowest eligible bid', 'Manual review (future)')`,
    ),
  ],
);

export const bidCommitments = pgTable(
  "pt_bid_commitments",
  {
    workspaceHash: varchar("workspace_hash", { length: 64 })
      .notNull()
      .references(() => workspaces.tokenHash, { onDelete: "cascade" }),
    tenderId: varchar("tender_id", { length: 64 }).notNull(),
    id: varchar("id", { length: 64 }).notNull(),
    commitment: varchar("commitment", { length: 64 }).notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceHash, table.id] }),
    foreignKey({
      columns: [table.workspaceHash, table.tenderId],
      foreignColumns: [tenders.workspaceHash, tenders.id],
    }).onDelete("cascade"),
    unique("pt_bid_commitments_value").on(
      table.workspaceHash,
      table.tenderId,
      table.commitment,
    ),
    check(
      "pt_bid_commitments_hex",
      sql`${table.commitment} ~ '^[a-f0-9]{64}$'`,
    ),
  ],
);
