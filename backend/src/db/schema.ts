import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  numeric,
  integer,
  date,
  jsonb,
  pgEnum,
  unique,
} from "drizzle-orm/pg-core";

export const planEnum = pgEnum("plan", ["free", "pro", "premium"]);
export const categoryTypeEnum = pgEnum("category_type", ["expense", "income"]);
export const transactionTypeEnum = pgEnum("transaction_type", ["expense", "income"]);
export const transactionSourceEnum = pgEnum("transaction_source", ["whatsapp", "web", "recurring", "manual"]);
export const goalPeriodEnum = pgEnum("goal_period", ["monthly", "quarterly", "yearly"]);
export const goalKindEnum = pgEnum("goal_kind", ["limit", "saving"]);
export const recurringFrequencyEnum = pgEnum("recurring_frequency", ["weekly", "monthly", "yearly"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "canceled",
  "past_due",
  "trialing",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  phone: text("phone").unique(),
  plan: planEnum("plan").notNull().default("free"),
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userSettings = pgTable("user_settings", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  alertAt80: boolean("alert_at_80").notNull().default(true),
  alertAt100: boolean("alert_at_100").notNull().default(true),
  weeklyReport: boolean("weekly_report").notNull().default(false),
  themePreference: text("theme_preference").notNull().default("dark"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
  type: categoryTypeEnum("type").notNull(),
  color: text("color").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  type: transactionTypeEnum("type").notNull(),
  description: text("description"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  source: transactionSourceEnum("source").notNull().default("whatsapp"),
  rawMessage: text("raw_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const goals = pgTable("goals", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  color: text("color").notNull().default("#6366f1"),
  limitAmount: numeric("limit_amount", { precision: 12, scale: 2 }).notNull(),
  periodType: goalPeriodEnum("period_type").notNull().default("monthly"),
  goalType: goalKindEnum("goal_type").notNull().default("limit"),
  targetAmount: numeric("target_amount", { precision: 12, scale: 2 }),
  alertAt80: boolean("alert_at_80").notNull().default(true),
  alertAt100: boolean("alert_at_100").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const goalCheckpoints = pgTable(
  "goal_checkpoints",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    goalId: uuid("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    month: text("month").notNull(),
    spentAmount: numeric("spent_amount", { precision: 12, scale: 2 }).notNull(),
    limitSnapshot: numeric("limit_snapshot", { precision: 12, scale: 2 }).notNull(),
    percentage: numeric("percentage", { precision: 5, scale: 2 }).notNull(),
    exceeded: boolean("exceeded").notNull().default(false),
    alert80Sent: boolean("alert_80_sent").notNull().default(false),
    alert100Sent: boolean("alert_100_sent").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("goal_checkpoints_goal_month").on(t.goalId, t.month)],
);

export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    month: text("month").notNull(),
    totalIncomeExpected: numeric("total_income_expected", { precision: 12, scale: 2 }),
    totalExpenseLimit: numeric("total_expense_limit", { precision: 12, scale: 2 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("budgets_user_month").on(t.userId, t.month)],
);

export const recurringTransactions = pgTable("recurring_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  type: transactionTypeEnum("type").notNull(),
  frequency: recurringFrequencyEnum("frequency").notNull().default("monthly"),
  dayOfMonth: integer("day_of_month").notNull().default(1),
  nextDue: date("next_due").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const aiConversations = pgTable("ai_conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title"),
  messages: jsonb("messages").notNull().default([]),
  contextMonth: text("context_month"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const whatsappSessions = pgTable("whatsapp_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sessionData: jsonb("session_data").notNull().default({}),
  isActive: boolean("is_active").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  stripeSubId: text("stripe_sub_id").unique(),
  stripePriceId: text("stripe_price_id"),
  plan: planEnum("plan").notNull(),
  status: subscriptionStatusEnum("status").notNull().default("active"),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
