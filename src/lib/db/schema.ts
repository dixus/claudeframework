import {
  pgTable,
  uuid,
  varchar,
  decimal,
  jsonb,
  timestamp,
  text,
} from "drizzle-orm/pg-core";

export const assessments = pgTable("assessments", {
  id: uuid("id").defaultRandom().primaryKey(),
  hash: varchar("hash", { length: 21 }).unique().notNull(),
  email: varchar("email", { length: 255 }),
  companyName: varchar("company_name", { length: 255 }),
  overallScore: decimal("overall_score", { precision: 5, scale: 2 }).notNull(),
  dimensionScores: jsonb("dimension_scores").notNull(),
  capabilityScores: jsonb("capability_scores"),
  enablerScores: jsonb("enabler_scores"),
  growthEngine: varchar("growth_engine", { length: 10 }),
  resultSnapshot: jsonb("result_snapshot").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  userAgent: text("user_agent"),
  referrer: varchar("referrer", { length: 500 }),
});
