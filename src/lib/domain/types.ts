export type CategoryKind = "income" | "essential" | "discretionary" | "transfer" | "wealth";
export type AccountType =
  | "everyday"
  | "savings"
  | "credit_card"
  | "investment_cash"
  | "brokerage"
  | "superannuation"
  | "cash";

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  colour: string;
  icon: string;
  archived?: boolean;
  includeInReports: boolean;
}

export interface Account {
  id: string;
  name: string;
  institution: string;
  type: AccountType;
  maskedNumber: string;
  balanceCents: number;
  availableBalanceCents?: number;
  currency: string;
  connected: boolean;
  includeInNetWorth: boolean;
  includeInCashFlow: boolean;
  hidden: boolean;
  archived: boolean;
  lastSyncedAt?: string;
  notes?: string;
}

export interface TransactionSplit {
  id: string;
  categoryId: string;
  amountCents: number;
}

export interface Transaction {
  id: string;
  accountId: string;
  providerId?: string;
  originalDescription: string;
  merchant: string;
  amountCents: number;
  currency: string;
  transactionDate: string;
  postingDate: string;
  categoryId: string;
  notes: string;
  tags: string[];
  status: "pending" | "posted";
  source: "demo-bank" | "csv" | "manual";
  recurring: boolean;
  transfer: boolean;
  reimbursement: boolean;
  refund: boolean;
  excludedFromReports: boolean;
  excludedFromCashFlow: boolean;
  needsReview: boolean;
  manuallyCategorised: boolean;
  ruleId?: string;
  linkedTransferId?: string;
  splits: TransactionSplit[];
  updatedAt: string;
}

export interface CategorisationRule {
  id: string;
  name: string;
  field: "merchant" | "description";
  operator: "contains" | "equals";
  value: string;
  categoryId: string;
  priority: number;
  enabled: boolean;
}

export interface SavingsGoal {
  id: string;
  name: string;
  description: string;
  targetCents: number;
  currentCents: number;
  targetDate: string;
  priority: "high" | "medium" | "low";
  linkedAccountId?: string;
  allocatedCents?: number;
  contributionFrequency: "weekly" | "fortnightly" | "monthly";
  plannedContributionCents: number;
  notes: string;
  status: "active" | "paused" | "completed" | "archived";
  createdAt: string;
  completedAt?: string;
}

export interface InvestmentHolding {
  id: string;
  name: string;
  ticker: string;
  exchange: string;
  assetClass: string;
  units: number;
  averagePriceCents: number;
  currentPriceCents: number;
  platform: string;
  currency: string;
  notes: string;
  lastPriceUpdate: string;
  archived: boolean;
}

export interface Liability {
  id: string;
  name: string;
  type: "credit_card" | "hecs_help" | "personal_loan" | "car_loan" | "bnpl" | "other";
  balanceCents: number;
  interestRate?: number;
  minimumRepaymentCents?: number;
  repaymentFrequency?: string;
  dueDate?: string;
  includeInNetWorth: boolean;
  notes: string;
  updatedAt: string;
}

export interface ManualAsset {
  id: string;
  name: string;
  type: string;
  valueCents: number;
  includeInNetWorth: boolean;
  liquid: boolean;
  notes: string;
  updatedAt: string;
}

export interface SpendingPlanCategory {
  categoryId: string;
  targetCents: number;
  rollover: boolean;
}

export interface SpendingPlan {
  month: string;
  overallTargetCents: number;
  intendedSavingsRate: number;
  intendedSavingsCents: number;
  intendedInvestmentCents: number;
  categories: SpendingPlanCategory[];
}

export interface RecurringTransaction {
  id: string;
  merchant: string;
  expectedCents: number;
  minCents: number;
  maxCents: number;
  frequency: "weekly" | "fortnightly" | "monthly" | "quarterly" | "annual" | "custom";
  nextExpectedDate: string;
  categoryId: string;
  accountId: string;
  active: boolean;
  confidence: number;
  lastObservedDate: string;
}

export interface Subscription {
  id: string;
  merchant: string;
  amountCents: number;
  frequency: "monthly" | "quarterly" | "annual";
  nextChargeDate: string;
  accountId: string;
  categoryId: string;
  previousAmountCents?: number;
  lastObservedDate: string;
  cancelled: boolean;
  notes: string;
}

export type PayFrequency = "weekly" | "fortnightly" | "monthly";

export interface PayAllocationGoalSplit {
  goalId: string;
  cents: number;
}

export interface PayAllocation {
  id: string;
  payDate: string;
  payCents: number;
  cadence: PayFrequency;
  billsCents: number;
  investmentsCents: number;
  savingsCents: number;
  discretionaryCents: number;
  goalSplits: PayAllocationGoalSplit[];
  applied: boolean;
  appliedAt?: string;
  createdAt: string;
}

export interface NetWorthSnapshot {
  date: string;
  assetsCents: number;
  liabilitiesCents: number;
  netWorthCents: number;
}

export interface MonthlyReview {
  month: string;
  reflection: string;
  unusualSpendingExplanation: string;
  nextMonthPriorities: string;
  plannedChanges: string;
  incomeNotes: string;
  completedAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  level: "info" | "review" | "success";
  createdAt: string;
  dismissed: boolean;
  href?: string;
}

export interface UserPreferences {
  currency: string;
  dateFormat: string;
  financialYearStartsInJuly: boolean;
  theme: "light" | "dark" | "system";
  notifications: Record<string, boolean>;
}

export interface FinanceState {
  fictional: true;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  rules: CategorisationRule[];
  goals: SavingsGoal[];
  holdings: InvestmentHolding[];
  liabilities: Liability[];
  assets: ManualAsset[];
  plans: SpendingPlan[];
  recurring: RecurringTransaction[];
  subscriptions: Subscription[];
  netWorthSnapshots: NetWorthSnapshot[];
  payAllocations: PayAllocation[];
  reviews: MonthlyReview[];
  notifications: AppNotification[];
  preferences: UserPreferences;
  bankConnection: {
    id: string;
    institution: string;
    status: "connected" | "expired" | "disconnected";
    lastSyncedAt: string;
    environment: "synthetic-demo";
  };
}
