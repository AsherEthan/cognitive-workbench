// Public installation templates, parsed with the same parser as the read-only API.
// Exact section and item matches only: edited personal content is preserved.
const TEMPLATE_SECTIONS = {
  "HEALTH/NUTRITION.md": [
    {
      "heading": "Dietary Approach",
      "body": "Sample dietary approach — replace this paragraph with your actual eating pattern. Examples to choose from: Mediterranean, low-carb, high-protein, plant-forward, time-restricted eating, no specific named diet. Note any guiding principle (whole foods, low ultra-processed, calorie targets, macro splits) and how strictly you follow it."
    },
    {
      "heading": "Meal Preparation",
      "body": "### How Meals Get Made (sample)\n\n- Sample method — for example, home cooking 5 nights per week, meal kit service, weekly batch prep, restaurant meals, chef service.\n- Replace with your actual approach so the DA understands how friction-free or friction-heavy your food access is.\n\n### Eating Out (sample)\n\n- Frequency: sample frequency — for example, 2 times per week.\n- Type: sample mix — for example, work lunches, social dinners, travel.\n- Replace with what is actually true for you."
    },
    {
      "heading": "Key Nutritional Considerations",
      "body": "### Goals\n\n- Sample goal — for example, hit 150 g protein per day.\n- Sample goal — for example, 30 g fiber per day.\n- Sample goal — for example, three servings of vegetables daily.\n\n### Lab-Informed Priorities (sample)\n\n- **Sample priority A:** Replace with a real priority driven by your labs — for example, raise omega-3 intake if your omega-3 level is low.\n- **Sample priority B:** Replace with another lab-driven priority — for example, reduce saturated fat if LDL is elevated.\n- **Sample priority C:** Replace with a metabolic priority — for example, maintain glucose stability if HbA1c is creeping up."
    },
    {
      "heading": "Hydration",
      "body": "- Target: sample target — for example, 3 L water per day.\n- Coffee or caffeine: sample pattern — for example, 2 cups in the morning, none after noon.\n- Replace with your actual hydration pattern."
    },
    {
      "heading": "Food Sensitivities and Allergies",
      "body": "- Sample entry — for example, lactose sensitivity, gluten avoidance, tree-nut allergy.\n- Replace with anything that is actually true for you, or write \"none documented.\""
    },
    {
      "heading": "Notes",
      "body": "- The DA uses this file to give context-aware nutrition advice. Vague placeholders produce vague advice. Specific real entries produce specific real advice.\n- If you track macros or calories, link the export so daily intake can flow into `METRICS.md`.\n\n*This is a sample template. Replace every value above with your real data via /interview or direct edit.*"
    }
  ],
  "HEALTH/FITNESS.md": [
    {
      "heading": "Current Routine",
      "body": "### Daily Activities\n\n- **Morning movement (sample):** 10 minutes of light activity after waking — for example a short walk for sunlight exposure. Replace with your actual morning routine.\n- **Evening movement (sample):** 20 minutes of walking or light cardio in the evening. Replace with your actual evening routine.\n\n### Strength Training (sample)\n\n- **Weights:** 30 minutes, 3 days per week (sample). Replace with your actual program.\n- **Other modalities:** Sample modality — yoga, martial arts, climbing, swimming. Replace with what you actually do."
    },
    {
      "heading": "Goals",
      "body": "### Primary Goal\n\n- Sample primary fitness goal — for example, lose 5 kg, run a 10K, hit a strength target. Replace with your real goal and target date.\n\n### Secondary Goals\n\n- Sample secondary goal A — for example, raise VO2 max above 35.\n- Sample secondary goal B — for example, hit 8000 steps per day on average.\n- Sample secondary goal C — for example, maintain lean mass during a cut."
    },
    {
      "heading": "Current Stats (sample)",
      "body": "| Metric | Value | Date | Notes |\n|--------|-------|------|-------|\n| Weight | 75 kg / 165 lbs (sample) | 2026-01-01 (sample) | Replace with current weight |\n| Height | 175 cm / 69 in (sample) | 2026-01-01 (sample) | Replace with actual height |\n| VO2 Max | 35 mL/kg/min (sample) | 2026-01-01 (sample) | Replace with latest reading |\n| HRV | 50 ms (sample) | 2026-01-01 (sample) | Replace with actual baseline |\n| Resting HR | 60 bpm (sample) | 2026-01-01 (sample) | Replace with actual baseline |\n| Steps (typical) | 8000 / day (sample) | 2026-01-01 (sample) | Replace with daily average |\n| Sleep Consistency | 70 % (sample) | 2026-01-01 (sample) | Replace with current score |"
    },
    {
      "heading": "Weight History (sample)",
      "body": "| Date | Weight |\n|------|--------|\n| 2026-01-01 (sample) | 75 kg / 165 lbs (sample) |\n| 2026-02-01 (sample) | 75 kg / 165 lbs (sample) |\n| 2026-03-01 (sample) | 74 kg / 163 lbs (sample) |\n| 2026-04-01 (sample) | 73 kg / 161 lbs (sample) |"
    },
    {
      "heading": "Notes",
      "body": "- Replace the routine block above with your actual weekly schedule (days, durations, modalities).\n- Track at least one weight or body composition data point per month so the DA can detect trends.\n- If you use a wearable, link its export so daily metrics flow into `METRICS.md` automatically.\n\n*This is a sample template. Replace every value above with your real data via /interview or direct edit.*"
    }
  ],
  "HEALTH/PROVIDERS.md": [
    {
      "heading": "Primary Care",
      "body": "### Sample Clinic\n\n- **Provider:** Dr. Sample Provider (sample)\n- **Practice:** Sample Clinic (sample)\n- **Location:** Sample City, Sample State (sample)\n- **Phone:** 555-0100 (sample)\n- **Patient Portal:** sample-portal.example.com (sample)\n- **Last Visit:** 2026-01-01 (sample)\n- **Next Visit:** 2026-07-01 (sample)"
    },
    {
      "heading": "Specialists",
      "body": "| Specialty | Provider | Practice | Last Visit |\n|-----------|----------|----------|------------|\n| Sample Specialty A | Dr. Sample Specialist A | Sample Specialty Clinic | 2026-01-01 (sample) |\n| Sample Specialty B | Dr. Sample Specialist B | Sample Specialty Clinic | 2026-01-01 (sample) |\n\n> If you do not see specialists, replace the rows above with: `_None._`"
    },
    {
      "heading": "Biomarker Testing",
      "body": "### Sample Lab\n\n- **Service:** Sample Lab (sample)\n- **Panel size:** 120 biomarkers (sample)\n- **Most recent panel:** 2026-01-01 (sample)\n- **Cadence:** every 6 months (sample)\n- **Notes:** Replace with the testing service you actually use — examples include any comprehensive biomarker service, your primary care lab, or a research-grade panel."
    },
    {
      "heading": "Pharmacy",
      "body": "- **Pharmacy:** Sample Pharmacy (sample)\n- **Location:** Sample City, Sample State (sample)\n- **Phone:** 555-0101 (sample)"
    },
    {
      "heading": "Pending Referrals",
      "body": "| Referral | Reason | Status |\n|----------|--------|--------|\n| Sample Referral A | Sample reason | Pending (sample) |\n| Sample Referral B | Sample reason | Scheduled 2026-01-01 (sample) |\n\n> If you have no pending referrals, replace the rows above with: `_None._`"
    },
    {
      "heading": "Insurance",
      "body": "- **Carrier:** Sample Carrier (sample)\n- **Plan:** Sample Plan Name (sample)\n- **Member ID:** 000000 (sample — never store real ID in plaintext if you can avoid it)\n- **Group:** 000 (sample)"
    },
    {
      "heading": "Notes",
      "body": "- Use generic placeholder names like \"Dr. Sample Provider\" until you replace them. The DA will not invent real providers.\n- For privacy: this file lives in a private zone, but consider whether you want full provider names and phone numbers in plaintext at all.\n\n*This is a sample template. Replace every value above with your real data via /interview or direct edit.*"
    }
  ],
  "HEALTH/CONDITIONS.md": [
    {
      "heading": "Active Conditions",
      "body": "### Sample Condition A\n\n- Sample marker: 100 mg/dL (sample)\n- Sample marker: 120 mg/dL (sample)\n- Sample status: in or out of range (sample)\n- Sample notes: replace this block with the actual condition, what is being measured, and the current trend.\n\n### Sample Condition B\n\n- Sample marker: 100 (sample units)\n- Sample status: improving / stable / worsening (sample)\n- Sample notes: replace with real description.\n\n> If you have no active conditions, replace the sections above with: `_None._`"
    },
    {
      "heading": "Allergies",
      "body": "### Medications\n\n- Sample medication allergy — for example, penicillin (sample). Replace with real allergies, or write `_None known._`\n\n### Environmental\n\n- Sample environmental allergy — for example, seasonal pollen (sample). Replace with real allergies, or write `_None._`\n\n### Food\n\n- Sample food allergy — for example, tree nuts (sample). Replace with real allergies, or write `_None._`"
    },
    {
      "heading": "Medical History",
      "body": "### Past Conditions\n\n| Condition | Period | Treatment | Status |\n|-----------|--------|-----------|--------|\n| Sample Past Condition | 2026-01-01 to 2026-02-01 (sample) | Sample treatment | Resolved (sample) |\n\n### Surgeries and Procedures\n\n| Procedure | Date | Notes |\n|-----------|------|-------|\n| Sample Procedure | 2026-01-01 (sample) | Sample notes |\n\n> If none, replace the rows above with: `_None._`\n\n### Family History\n\n- Sample family history entry — for example, parent had condition X at age 60 (sample).\n- Sample family history entry — for example, sibling has condition Y (sample).\n\n> Replace with real family history relevant to risk assessment, or write `_None documented._`"
    },
    {
      "heading": "Vitals Snapshot (sample)",
      "body": "| Vital | Value | Date |\n|-------|-------|------|\n| Blood Pressure | 120 / 80 mmHg (sample) | 2026-01-01 (sample) |\n| Resting Heart Rate | 60 bpm (sample) | 2026-01-01 (sample) |\n| O2 Saturation | 98 % (sample) | 2026-01-01 (sample) |\n| Temperature | 36.7 °C / 98.0 °F (sample) | 2026-01-01 (sample) |"
    },
    {
      "heading": "Blood Type",
      "body": "- ABO Group: O (sample)\n- Rhesus Factor: Rh(d) Positive (sample)"
    },
    {
      "heading": "Notes",
      "body": "- Keep this file accurate. Your DA uses it to flag risks when you ask about a new medication, supplement, or procedure.\n- For each active condition, link to the lab values in `METRICS.md` and the medications in `MEDICATIONS.md` so the DA can reason across files.\n\n*This is a sample template. Replace every value above with your real data via /interview or direct edit.*"
    }
  ],
  "HEALTH/MEDICATIONS.md": [
    {
      "heading": "Prescription Medications",
      "body": "| Medication | Dose | Purpose | Notes |\n|------------|------|---------|-------|\n| Sample Med A | 10 mg daily (sample) | Sample purpose | Replace with real prescription, or delete this row if none |\n| Sample Med B | 100 mg daily (sample) | Sample purpose | Replace with real prescription, or delete this row if none |\n\n> If you take no prescription medications, replace the rows above with: `_None._`"
    },
    {
      "heading": "Daily Supplements",
      "body": "| Supplement | Dose | Purpose |\n|------------|------|---------|\n| Sample Supplement A | 1000 IU daily (sample) | Sample purpose |\n| Sample Supplement B | 100 mg daily (sample) | Sample purpose |\n| Sample Supplement C | 1 capsule daily (sample) | Sample purpose |"
    },
    {
      "heading": "As-Needed (Not Every Day)",
      "body": "| Supplement | Timing | Purpose |\n|------------|--------|---------|\n| Sample As-Needed A | Morning (sample) | Sample purpose |\n| Sample As-Needed B | Evening (sample) | Sample purpose |"
    },
    {
      "heading": "Past Medications",
      "body": "| Medication | Period | Reason | Status |\n|------------|--------|--------|--------|\n| Sample Past Med | 2026-01-01 to 2026-02-01 (sample) | Sample reason | Completed (sample) |\n\n> If you have no relevant medication history, replace the row above with: `_None recorded._`"
    },
    {
      "heading": "Notes",
      "body": "- List every medication you take regularly, even over-the-counter ones, so the DA can flag interactions when you ask about a new prescription or supplement.\n- If a dose is being adjusted, note the current dose and the target dose with dates — for example, \"10 mg daily, titrating up to 20 mg over 4 weeks starting 2026-01-01 (sample).\"\n- Allergy and sensitivity entries belong in `CONDITIONS.md`, not here.\n\n*This is a sample template. Replace every value above with your real data via /interview or direct edit.*"
    }
  ],
  "HEALTH/README.md": [
    {
      "heading": "What Lives Here",
      "body": "This is where your DA stores everything it needs to reason about your health: metrics, fitness routine, nutrition pattern, medications, providers, and conditions. Pulse renders these files in the Health tab. The DA reads them when you ask questions like \"what should I focus on this quarter\" or \"summarize my last lab panel.\"\n\nThe files in this directory follow a flat layout — one Markdown file per topic — so the DA can scan them quickly and so a human editing by hand never has to navigate folders."
    },
    {
      "heading": "File Layout",
      "body": "| File | Purpose |\n|------|---------|\n| `HEALTH.md` | Top-level overview (age, height, weight, current focus, quick reference) |\n| `METRICS.md` | Lab values, biomarkers, vitals, daily activity numbers, trends |\n| `FITNESS.md` | Exercise routine, weight history, fitness goals |\n| `NUTRITION.md` | Diet pattern, meal prep approach, nutritional priorities |\n| `MEDICATIONS.md` | Prescriptions, daily supplements, as-needed items, past medications |\n| `PROVIDERS.md` | Primary care, specialists, testing services, pending referrals |\n| `CONDITIONS.md` | Active conditions, allergies, medical history |\n\nYou can also drop dated lab result files directly in this directory — for example `lab_results_2026-01.md` — and the DA will pick them up automatically."
    },
    {
      "heading": "How to Populate",
      "body": "You have three options, in increasing order of effort:\n\n1. **Run the Health interview** — `Skill(\"Interview\")` walks you through every field conversationally and writes the answers back into these files. Easiest path.\n2. **Edit these files directly** — replace the sample values with your real data. The structure of each file is the structure your DA expects.\n3. **Paste a lab PDF** — drop a lab result file (PDF or Markdown) in this directory and ask your DA to extract the values into `METRICS.md` and `CONDITIONS.md`."
    },
    {
      "heading": "Privacy",
      "body": "This directory is in a private zone. LifeOS release tooling refuses to publish anything under `USER/HEALTH/`. Treat the contents as you would your medical chart."
    },
    {
      "heading": "Sample Snippet",
      "body": "A real `METRICS.md` row looks like:\n\n```markdown\n| HDL-Cholesterol | 50 mg/dL (sample) | In range | Above 40 mg/dL |\n```\n\nThe number is a placeholder. Your real numbers will come from your real labs.\n\n*This is a sample template. Run /interview or edit the files directly to replace placeholder content with your own data.*"
    }
  ],
  "HEALTH/METRICS.md": [
    {
      "heading": "Key Numbers (Sample Panel — 2026-01-01)",
      "body": "| Metric | Value | Status | Target |\n|--------|-------|--------|--------|\n| Biological Age | sample | sample | Maintain or improve |\n| Weight | 75 kg / 165 lbs (sample) | sample | 70 kg (sample) |\n| Biomarkers in Range | 100 / 120 (sample) | sample | Improve out-of-range items |\n| ApoB | 100 mg/dL (sample) | sample | Below 90 mg/dL (sample) |\n| LDL-Cholesterol | 120 mg/dL (sample) | sample | Below 100 mg/dL (sample) |\n| LDL Pattern | sample (A or B) | sample | Pattern A |\n| HDL-Cholesterol | 50 mg/dL (sample) | sample | Above 40 mg/dL (sample) |\n| eGFR | 100 mL/min (sample) | sample | Above 90 mL/min |\n| Omega-3 Total | 5 % by wt (sample) | sample | Above 8 % (sample) |\n| Triglycerides | 100 mg/dL (sample) | sample | Below 150 mg/dL (sample) |\n| HbA1c | 5 % (sample) | sample | Below 5.7 % |\n| Glucose | 90 mg/dL (sample) | sample | 70–99 mg/dL |\n| Vitamin D, 25-OH | 50 ng/mL (sample) | sample | 40–80 ng/mL (sample) |\n| VO2 Max | 35 mL/kg/min (sample) | sample | Above 35 (sample) |\n| Blood Pressure | 120 / 80 mmHg (sample) | sample | Below 130 / 80 |\n| Resting HR | 60 bpm (sample) | sample | 50–70 bpm |"
    },
    {
      "heading": "Trends (Sample — Two Panels Compared)",
      "body": "| Metric | Prior Panel (sample) | Latest Panel (sample) | Direction |\n|--------|----------------------|------------------------|-----------|\n| HDL | 40 mg/dL (sample) | 50 mg/dL (sample) | Improving |\n| eGFR | 80 mL/min (sample) | 100 mL/min (sample) | Improving |\n| Triglycerides | 150 mg/dL (sample) | 100 mg/dL (sample) | Improving |\n| LDL | 130 mg/dL (sample) | 120 mg/dL (sample) | Slight improvement |\n| HbA1c | 5 % (sample) | 5 % (sample) | Stable |"
    },
    {
      "heading": "Daily Metrics (Sample — Wearable/App Snapshot)",
      "body": "| Metric | Value | Notes |\n|--------|-------|-------|\n| Calories Burned | 2000 cals (sample) | Replace with actual daily average |\n| Exercise Time | 30 min (sample) | Replace with actual daily average |\n| HRV | 50 ms (sample) | Replace with actual baseline |\n| Steps | 8000 (sample) | Replace with actual daily average |\n| Sleep Consistency | 70 % (sample) | Replace with actual score |\n| VO2 Max | 35 mL/kg/min (sample) | Replace with actual reading |"
    },
    {
      "heading": "Blood Type",
      "body": "- ABO Group: O (sample)\n- Rhesus Factor: Rh(d) Positive (sample)"
    },
    {
      "heading": "Lab Sources",
      "body": "| Provider | Last Panel | Biomarkers |\n|----------|-----------|------------|\n| Sample Lab | 2026-01-01 (sample) | 120 biomarkers (sample) |\n| Sample Clinic | 2026-01-01 (sample) | Standard metabolic + CBC (sample) |"
    },
    {
      "heading": "Notes",
      "body": "- All values above are placeholders. Replace each row with your real lab result before relying on the DA's analysis.\n- Drop dated lab files like `lab_results_2026-01.md` in this directory and your DA will incorporate them on the next read.\n- Numbers shown use round, obvious placeholder values (100, 120, 50) so it is clear at a glance that real data has not yet been entered.\n\n*This is a sample template. Replace every value above with your real data via /interview or direct edit.*"
    }
  ],
  "HEALTH/HEALTH.md": [
    {
      "heading": "Quick Reference",
      "body": "| Detail | Value |\n|--------|-------|\n| Age | 30 (born 1996-01-01, sample) |\n| Height | 175 cm / 69 in (sample) |\n| Weight | 75 kg / 165 lbs (sample) |\n| Blood Type | O Rh+ (sample) |\n| Biological Age | sample — populate after first biomarker panel |\n| Healthcare | Sample Clinic primary care + Sample Lab biomarker testing |\n\n| File | Purpose |\n|------|---------|\n| `CONDITIONS.md` | Active conditions and medical history (sample) |\n| `MEDICATIONS.md` | Current medications and supplements (sample) |\n| `PROVIDERS.md` | Healthcare providers and testing services (sample) |\n| `FITNESS.md` | Exercise routine and goals (sample) |\n| `NUTRITION.md` | Diet and eating patterns (sample) |\n| `METRICS.md` | Lab values, vitals, daily activity (sample) |"
    },
    {
      "heading": "Current Status",
      "body": "### Primary Concerns (Ranked)\n\n1. **Sample concern one** — short description of the top issue and what is being done about it. Replace with your real top concern.\n2. **Sample concern two** — second priority area and the metric you are tracking.\n3. **Sample concern three** — third priority area.\n\n### Positive Indicators\n\n- Sample positive marker A within target range\n- Sample positive marker B trending in the right direction\n- Sample positive marker C stable since last panel\n\n### Areas Needing Attention\n\n- Sample area A below target — needs intervention\n- Sample area B trending wrong direction\n- Sample area C borderline"
    },
    {
      "heading": "Current Focus",
      "body": "This is a one-paragraph summary of what the person is actively working on health-wise this quarter. Replace this paragraph with the actual focus — for example, weight management, sleep optimization, lipid panel improvement, recovery from an injury, or building a baseline. Keep it to three or four sentences so the DA can quote it back when asked \"what's the current health focus.\""
    },
    {
      "heading": "Recent Updates",
      "body": "- **2026-01-01 (sample):** Brief note about a recent lab result, appointment, or change in routine.\n- **2026-01-01 (sample):** Brief note about a medication start, stop, or dose change.\n- **2026-01-01 (sample):** Brief note about a new fitness milestone or setback.\n\n*This is a sample template. Replace every value above with your real data via /interview or direct edit.*"
    }
  ],
  "FINANCES/FINANCES.md": [
    {
      "heading": "Net Worth Snapshot",
      "body": "- **Total assets:** $X,XXX\n- **Total liabilities:** $X,XXX\n- **Net worth:** $X,XXX\n- **As of:** YYYY-MM-DD (sample)"
    },
    {
      "heading": "Monthly Cash Flow",
      "body": "- **Income (monthly):** $X,XXX\n- **Fixed expenses (monthly):** $X,XXX\n- **Variable expenses (monthly):** $X,XXX\n- **Net (monthly):** $X,XXX\n- **Savings rate:** X% (sample)"
    },
    {
      "heading": "Current Focus",
      "body": "- Sample focus area 1 — e.g., reducing recurring software costs\n- Sample focus area 2 — e.g., building emergency fund to $X,XXX\n- Sample focus area 3 — e.g., maximizing pre-tax retirement contributions"
    },
    {
      "heading": "Key Numbers To Track",
      "body": "| Metric | Current | Target | Notes |\n|--------|---------|--------|-------|\n| Emergency fund | $X,XXX | $X,XXX | Sample target = N months of expenses |\n| Retirement contributions YTD | $X,XXX | $X,XXX | Sample annual cap |\n| Discretionary spend (monthly avg) | $X | $X | Sample envelope |\n| Debt principal remaining | $X,XXX | $X | Sample payoff goal |"
    },
    {
      "heading": "Recent Changes",
      "body": "- YYYY-MM-DD — Sample event (e.g., closed Sample Bank Savings account)\n- YYYY-MM-DD — Sample event (e.g., opened Sample Brokerage IRA)\n- YYYY-MM-DD — Sample event (e.g., increased 401(k) contribution to X%)"
    },
    {
      "heading": "Linked Files",
      "body": "- Income detail → `INCOME.md`\n- Expense detail → `EXPENSES.md`\n- Account list → `ACCOUNTS.md`\n- Goals → `GOALS.md`\n- Investments → `INVESTMENTS.md`\n- Taxes → `TAXES.md`\n- Recurring bills → `obligations.yaml`\n- Vendors → `vendors.yaml`\n\n*This is a sample template. Replace every placeholder with your own data before relying on Pulse Finance views.*"
    }
  ],
  "FINANCES/TAXES.md": [
    {
      "heading": "Filing Profile",
      "body": "- **Filing status:** Sample (e.g., single / married filing jointly / head of household)\n- **State:** Sample State\n- **Tax year (current):** YYYY\n- **Preparer:** Sample CPA / self-prepared (sample)\n- **Tax software:** Sample Software (sample)"
    },
    {
      "heading": "Estimated Tax (Quarterly)",
      "body": "For 1099 / self-employment income.\n\n| Quarter | Due Date | Federal Estimate | State Estimate | Status |\n|---------|----------|------------------|----------------|--------|\n| Q1 | YYYY-04-15 | $X,XXX | $X | sample status |\n| Q2 | YYYY-06-15 | $X,XXX | $X | sample status |\n| Q3 | YYYY-09-15 | $X,XXX | $X | sample status |\n| Q4 | YYYY-01-15 (next year) | $X,XXX | $X | sample status |\n\n**Total estimated for year:** $X,XXX (federal) + $X (state) — sample"
    },
    {
      "heading": "YTD Withholding (W-2)",
      "body": "- **Federal withheld YTD:** $X,XXX\n- **State withheld YTD:** $X,XXX\n- **Social Security YTD:** $X,XXX\n- **Medicare YTD:** $X"
    },
    {
      "heading": "Deductions To Track",
      "body": "- **Home office** — sample square footage, sample method (simplified / actual)\n- **Business mileage** — Sample log, $X miles YTD\n- **Health insurance premiums (self-employed)** — $X YTD\n- **Retirement contributions (deductible)** — $X YTD to Sample Account\n- **HSA contributions** — $X YTD\n- **Charitable giving** — $X YTD across Sample Charity 1, Sample Charity 2\n- **Sample state-specific deduction** — sample notes"
    },
    {
      "heading": "Credits To Watch",
      "body": "- Sample credit 1 (e.g., child / dependent) — sample notes\n- Sample credit 2 (e.g., energy / EV) — sample notes"
    },
    {
      "heading": "Carry-Forward Items",
      "body": "- **Capital loss carry-forward:** $X (sample)\n- **Charitable contribution carry-forward:** $X (sample)"
    },
    {
      "heading": "Last Year (For Reference)",
      "body": "- **Total tax:** $X,XXX (sample)\n- **Refund / owed:** $X owed (sample)\n- **Effective rate:** X% (sample)"
    },
    {
      "heading": "Open Questions / Notes",
      "body": "- Sample tax question — e.g., entity restructure timing\n- Sample tax question — e.g., backdoor Roth eligibility\n- Sample tax question — e.g., state residency edge case\n\n*This is a sample template. Replace every placeholder with your own data before relying on Pulse Finance views.*"
    }
  ],
  "FINANCES/README.md": [
    {
      "heading": "What lives here",
      "body": "- `FINANCES.md` — top-level overview (net worth snapshot, monthly cash flow, current focus)\n- `INCOME.md` — income sources, frequencies, expected amounts\n- `EXPENSES.md` — recurring expense categories with budgets\n- `INVESTMENTS.md` — investment accounts and allocations\n- `ACCOUNTS.md` — bank, credit, and brokerage accounts (no real account numbers — use last-4 only)\n- `GOALS.md` — financial goals with target amounts and dates\n- `TAXES.md` — tax overview, estimated quarterlies, deductions to track\n- `obligations.yaml` — recurring bills (subscriptions, insurance, loans)\n- `vendors.yaml` — known vendors you pay or get paid by\n- `schema.yaml` — schema definitions for finances data (structural reference)"
    },
    {
      "heading": "How to populate",
      "body": "Two paths:\n\n1. **Run the Finances interview** — `/interview finances` walks you through each file conversationally and writes the results back here.\n2. **Edit directly** — open each file, replace every `$X`, `Sample Bank`, and `Sample Vendor` placeholder with your real values. Keep the structure; Pulse depends on the field names."
    },
    {
      "heading": "Privacy",
      "body": "This directory is part of your private USER tree. It is never bundled into public LifeOS releases. Treat it like your password manager: real numbers go here, but it stays on your machine."
    },
    {
      "heading": "Sample placeholder conventions",
      "body": "- `$X` — any dollar amount\n- `$X,XXX` — larger dollar amount\n- `$X.XX` — precise dollar amount\n- `Sample Bank` / `Sample Vendor` / `Sample Account` — replace with the real entity name\n- `XXXX` — last four digits of an account or card\n\n*This is a sample template. Replace every placeholder with your own data before relying on Pulse Finance views.*"
    }
  ],
  "FINANCES/INVESTMENTS.md": [
    {
      "heading": "Total Invested",
      "body": "- **Total invested (all accounts):** $X,XXX\n- **As of:** YYYY-MM-DD (sample)\n- **YTD return (estimate):** X% (sample)"
    },
    {
      "heading": "Accounts",
      "body": "### Sample Brokerage 1 — Taxable\n\n- **Custodian:** Sample Brokerage\n- **Account type:** taxable individual (sample)\n- **Balance:** $X,XXX\n- **Last 4 of account:** XXXX\n- **Strategy:** sample strategy (e.g., broad-market index)\n- **Cost basis (approx):** $X,XXX\n- **Notes:** Sample notes.\n\n### Sample Brokerage 2 — Roth IRA\n\n- **Custodian:** Sample Brokerage\n- **Account type:** Roth IRA (sample)\n- **Balance:** $X,XXX\n- **Last 4 of account:** XXXX\n- **YTD contributions:** $X (annual cap: $X,XXX sample)\n- **Strategy:** sample strategy\n- **Notes:** Sample notes.\n\n### Sample Brokerage 3 — Traditional 401(k)\n\n- **Custodian:** Sample 401(k) Provider\n- **Account type:** Traditional 401(k) (sample)\n- **Balance:** $X,XXX\n- **Last 4 of account:** XXXX\n- **Contribution rate:** X% of paycheck (sample)\n- **Employer match:** X% up to Y% (sample)\n- **YTD contributions:** $X\n- **Strategy:** sample strategy\n- **Notes:** Sample notes.\n\n### Sample Crypto Wallet\n\n- **Custodian / Wallet:** Sample Custodian\n- **Balance (USD equivalent):** $X\n- **Notes:** Sample notes (e.g., self-custody vs. exchange split)."
    },
    {
      "heading": "Allocation (Approximate)",
      "body": "| Asset Class | % | $ Value (sample) |\n|-------------|----|------------------|\n| US equities | X% | $X,XXX |\n| International equities | X% | $X,XXX |\n| Bonds / fixed income | X% | $X,XXX |\n| Cash / equivalents | X% | $X,XXX |\n| Alternatives / crypto | X% | $X,XXX |\n| **Total** | 100% | $X,XXX |"
    },
    {
      "heading": "Strategy Notes",
      "body": "- Sample strategy note 1 — e.g., target allocation X/Y/Z\n- Sample strategy note 2 — e.g., rebalance threshold ±X%\n- Sample strategy note 3 — e.g., contribution priority order"
    },
    {
      "heading": "Open Questions / Decisions Pending",
      "body": "- Sample question — e.g., consolidate Sample Brokerage 1 and 2?\n- Sample question — e.g., increase international allocation?\n\n*This is a sample template. Replace every placeholder with your own data before relying on Pulse Finance views.*"
    }
  ],
  "FINANCES/EXPENSES.md": [
    {
      "heading": "Fixed Monthly Expenses",
      "body": "| Category | Vendor | Amount | Frequency | Notes |\n|----------|--------|--------|-----------|-------|\n| Housing | Sample Landlord / Sample Bank Mortgage | $X,XXX | monthly | Sample notes |\n| Utilities — Electric | Sample Utility | $X | monthly | Sample notes |\n| Utilities — Internet | Sample ISP | $X | monthly | Sample notes |\n| Utilities — Water | Sample Water Co. | $X | monthly | Sample notes |\n| Insurance — Health | Sample Insurer | $X | monthly | Sample notes |\n| Insurance — Auto | Sample Auto Insurer | $X | monthly | Sample notes |\n| Phone | Sample Carrier | $X | monthly | Sample notes |\n\n**Subtotal (fixed monthly):** $X,XXX"
    },
    {
      "heading": "Recurring Software / Subscriptions",
      "body": "| Category | Vendor | Amount | Frequency | Notes |\n|----------|--------|--------|-----------|-------|\n| Productivity SaaS | Sample SaaS Vendor 1 | $X | monthly | Sample notes |\n| Productivity SaaS | Sample SaaS Vendor 2 | $X | annual | Sample notes |\n| Streaming | Sample Streaming Service | $X | monthly | Sample notes |\n| Cloud / Hosting | Sample Cloud Provider | $X | monthly | Sample notes |\n| AI Tools | Sample AI Vendor | $X | monthly | Sample notes |\n\n**Subtotal (subscriptions, normalized to monthly):** $X"
    },
    {
      "heading": "Variable Expenses (Monthly Average)",
      "body": "| Category | Average | Envelope / Budget | Notes |\n|----------|---------|-------------------|-------|\n| Groceries | $X | $X | Sample notes |\n| Dining out | $X | $X | Sample notes |\n| Transportation / Fuel | $X | $X | Sample notes |\n| Travel | $X | $X | Sample notes |\n| Entertainment | $X | $X | Sample notes |\n| Health / Fitness | $X | $X | Sample notes |\n| Clothing / Personal | $X | $X | Sample notes |\n| Gifts / Charitable | $X | $X | Sample notes |\n\n**Subtotal (variable, monthly avg):** $X,XXX"
    },
    {
      "heading": "Annual / Periodic Expenses",
      "body": "| Category | Vendor | Amount | When | Notes |\n|----------|--------|--------|------|-------|\n| Property tax | Sample County Assessor | $X,XXX | annually | Sample notes |\n| Auto registration | Sample DMV | $X | annually | Sample notes |\n| Domain / DNS | Sample Registrar | $X | annually | Sample notes |\n| Professional dues | Sample Org | $X | annually | Sample notes |"
    },
    {
      "heading": "Total Expenses",
      "body": "- **Monthly total (fixed + subscriptions + variable avg):** $X,XXX\n- **Annualized total:** $X,XXX"
    },
    {
      "heading": "Optimization Candidates",
      "body": "- Sample candidate 1 — e.g., consolidate overlapping SaaS\n- Sample candidate 2 — e.g., renegotiate insurance at renewal\n- Sample candidate 3 — e.g., audit subscriptions quarterly\n\n*This is a sample template. Replace every placeholder with your own data before relying on Pulse Finance views.*"
    }
  ],
  "FINANCES/ACCOUNTS.md": [
    {
      "heading": "Checking Accounts",
      "body": "- **Sample Bank Checking** — $X balance (sample), last 4 XXXX, primary deposit account\n- **Sample Bank Business Checking** — $X balance (sample), last 4 XXXX, business income deposit account\n- **Sample Credit Union Checking** — $X balance (sample), last 4 XXXX, secondary"
    },
    {
      "heading": "Savings / High-Yield Accounts",
      "body": "- **Sample Bank Savings** — $X balance (sample), last 4 XXXX, emergency fund target $X,XXX\n- **Sample High-Yield Savings** — $X balance (sample), last 4 XXXX, APY X% (sample), short-term savings"
    },
    {
      "heading": "Credit Cards",
      "body": "- **Sample Card 1** — $X balance / $X,XXX limit (sample), last 4 XXXX, primary spend, rewards: sample category\n- **Sample Card 2** — $X balance / $X,XXX limit (sample), last 4 XXXX, travel, rewards: sample category\n- **Sample Business Card** — $X balance / $X,XXX limit (sample), last 4 XXXX, business expenses"
    },
    {
      "heading": "Brokerage / Investment",
      "body": "- **Sample Brokerage Taxable** — $X,XXX balance (sample), last 4 XXXX, see `INVESTMENTS.md`\n- **Sample Brokerage Roth IRA** — $X,XXX balance (sample), last 4 XXXX, see `INVESTMENTS.md`\n- **Sample 401(k) Provider** — $X,XXX balance (sample), last 4 XXXX, see `INVESTMENTS.md`"
    },
    {
      "heading": "Loans / Liabilities",
      "body": "- **Sample Bank Mortgage** — $X,XXX remaining (sample), last 4 XXXX, rate X% (sample), payoff date YYYY-MM-DD (sample)\n- **Sample Auto Loan** — $X remaining (sample), last 4 XXXX, rate X% (sample)\n- **Sample Student Loan** — $X remaining (sample), last 4 XXXX, rate X% (sample)"
    },
    {
      "heading": "Other / Specialty",
      "body": "- **Sample HSA** — $X balance (sample), last 4 XXXX, contribution YTD $X\n- **Sample 529 (Education)** — $X balance (sample), last 4 XXXX, beneficiary: Sample Beneficiary\n- **Sample Crypto Custodian** — $X USD-equivalent (sample), wallet identifier last 4 XXXX"
    },
    {
      "heading": "Closed Accounts (For Reference)",
      "body": "- **Sample Old Bank Checking** — closed YYYY-MM-DD, last 4 XXXX, reason: sample reason"
    },
    {
      "heading": "Notes",
      "body": "- All last-4 digits are placeholders. Update with real last-4 only — never paste full account numbers.\n- For each account, the corresponding institution login should live in your password manager, not here.\n\n*This is a sample template. Replace every placeholder with your own data before relying on Pulse Finance views.*"
    }
  ],
  "FINANCES/INCOME.md": [
    {
      "heading": "Active Sources",
      "body": "### Sample Source 1 — Primary Salary\n\n- **Type:** W-2 employment (sample)\n- **Payer:** Sample Employer Inc.\n- **Frequency:** semi-monthly (sample)\n- **Gross per period:** $X,XXX\n- **Net per period:** $X,XXX\n- **Annual gross (expected):** $X,XXX\n- **Deposit account:** Sample Bank Checking (...XXXX)\n- **Started:** YYYY-MM-DD (sample)\n- **Notes:** Sample notes about this income source.\n\n### Sample Source 2 — Consulting / 1099\n\n- **Type:** 1099 contract (sample)\n- **Payer:** Sample Client LLC\n- **Frequency:** project-based (sample)\n- **Per-engagement amount:** $X,XXX\n- **YTD received:** $X,XXX\n- **Deposit account:** Sample Bank Business Checking (...XXXX)\n- **Notes:** Sample notes — e.g., quarterly estimated tax implications.\n\n### Sample Source 3 — Recurring Subscription Revenue\n\n- **Type:** SaaS / product income (sample)\n- **Source:** Sample Platform (e.g., your own product)\n- **Frequency:** monthly (sample)\n- **Current MRR:** $X,XXX\n- **Trend (last 90 days):** sample direction\n- **Deposit account:** Sample Payment Processor → Sample Bank Business Checking\n- **Notes:** Sample notes.\n\n### Sample Source 4 — Investment / Dividend Income\n\n- **Type:** dividend / interest (sample)\n- **Source:** Sample Brokerage holdings\n- **Frequency:** quarterly (sample)\n- **Average per period:** $X\n- **Notes:** Sample notes — taxable vs. tax-advantaged."
    },
    {
      "heading": "Expected Monthly Total",
      "body": "- **Expected monthly income (all sources):** $X,XXX\n- **Variability:** sample description (e.g., \"stable ±X%\")"
    },
    {
      "heading": "Inactive / Past Sources",
      "body": "- Sample past employer — ended YYYY-MM-DD\n- Sample past client — ended YYYY-MM-DD\n\n*This is a sample template. Replace every placeholder with your own data before relying on Pulse Finance views.*"
    }
  ],
  "FINANCES/GOALS.md": [
    {
      "heading": "Active Goals",
      "body": "### G1 — Build Emergency Fund\n\n- **Target:** Save $X,XXX by date YYYY-MM-DD — sample\n- **Current:** $X (X% complete) — sample\n- **Source account:** Sample High-Yield Savings (...XXXX)\n- **Monthly contribution:** $X\n- **Status:** on track / behind / ahead — sample\n- **Notes:** Sample notes — e.g., target equals N months of fixed expenses.\n\n### G2 — Pay Off Sample Loan\n\n- **Target:** Eliminate $X,XXX in sample loan principal by date YYYY-MM-DD — sample\n- **Current remaining:** $X (X% paid down) — sample\n- **Strategy:** sample strategy (e.g., $X extra principal monthly)\n- **Status:** on track / behind / ahead — sample\n- **Notes:** Sample notes.\n\n### G3 — Max Sample Retirement Account\n\n- **Target:** Contribute $X,XXX to Sample Brokerage Roth IRA by date YYYY-MM-DD — sample\n- **Current YTD:** $X (X% of cap) — sample\n- **Monthly contribution:** $X\n- **Status:** on track — sample\n- **Notes:** Sample notes — annual contribution cap.\n\n### G4 — Save for Sample Large Purchase\n\n- **Target:** Save $X,XXX by date YYYY-MM-DD for sample purchase (e.g., home down payment, vehicle, sabbatical) — sample\n- **Current:** $X (X% complete) — sample\n- **Source account:** Sample Bank Savings (...XXXX)\n- **Monthly contribution:** $X\n- **Status:** sample status\n- **Notes:** Sample notes.\n\n### G5 — Reach Sample Net Worth Milestone\n\n- **Target:** Net worth of $X,XXX by date YYYY-MM-DD — sample\n- **Current net worth:** $X,XXX — sample\n- **Status:** sample status\n- **Notes:** Sample notes — see `FINANCES.md` for net worth snapshot."
    },
    {
      "heading": "Completed Goals (For Memory)",
      "body": "- YYYY-MM-DD — Sample completed goal (e.g., \"Closed last high-interest credit card balance\")\n- YYYY-MM-DD — Sample completed goal"
    },
    {
      "heading": "Long-Horizon Goals (5+ Years)",
      "body": "- Sample long-horizon goal — e.g., financial independence target $X,XXX by year YYYY\n- Sample long-horizon goal — e.g., fully fund Sample 529 by year YYYY\n\n*This is a sample template. Replace every placeholder with your own data before relying on Pulse Finance views.*"
    }
  ],
  "WORK/YOUR_COMPANIES/AOS.md": [
    {
      "heading": "Company",
      "body": "- **Name:** (interview — sample company name)\n- **Entity type:** (interview — e.g. LLC, S-Corp, sole proprietor)\n- **Founded:** (interview — year)\n- **Stage:** (interview — idea / pre-revenue / early revenue / scaling / mature)"
    },
    {
      "heading": "Mission",
      "body": "(interview — sample mission statement: one sentence describing why this business exists and who it serves)"
    },
    {
      "heading": "Vision",
      "body": "(interview — sample vision statement: where the business is heading over the next 3–5 years)"
    },
    {
      "heading": "Values",
      "body": "- (interview — value 1)\n- (interview — value 2)\n- (interview — value 3)"
    },
    {
      "heading": "Annual Goals",
      "body": "Goals for the current year, in priority order.\n\n- **G1:** (interview — sample top goal, with measurable target)\n- **G2:** (interview — second goal)\n- **G3:** (interview — third goal)"
    },
    {
      "heading": "Strategy",
      "body": "How you plan to achieve the goals above.\n\n- **S1:** (interview — sample strategy 1)\n- **S2:** (interview — sample strategy 2)"
    },
    {
      "heading": "Key Initiatives",
      "body": "Concrete projects driving the strategy this year.\n\n- (interview — initiative 1: scope, owner, timeline)\n- (interview — initiative 2)\n- (interview — initiative 3)"
    },
    {
      "heading": "Metrics",
      "body": "The numbers you watch every week to know if the business is healthy.\n\n- **Revenue:** (interview — target and current)\n- **Customers / subscribers:** (interview — target and current)\n- **Margin:** (interview — target and current)\n- **Other:** (interview — any business-specific metric)"
    },
    {
      "heading": "Risks & Constraints",
      "body": "- (interview — top risk 1)\n- (interview — top risk 2)\n- (interview — top constraint, e.g. capital, time, hiring)"
    },
    {
      "heading": "Notes",
      "body": "Anything else the DA should know to give you good business answers.\n\n(interview — freeform notes)"
    }
  ],
  "WORK/YOUR_COMPANIES/README.md": [
    {
      "heading": "What goes here",
      "body": "- **`AOS.md`** — Annual Operating System / business plan: mission, vision, goals, strategy, metrics, key initiatives for the current year. The single document your DA reads to understand where the business is heading.\n- **`<COMPANY_NAME>/`** — One subdirectory per company or business entity you operate. Each subdir holds entity-specific context (revenue records, formation docs, tax IDs, media kits, customer-facing materials, etc.). The included `SAMPLE_COMPANY/` is a stub — rename it to your actual company name and populate it."
    },
    {
      "heading": "Add your own",
      "body": "Either:\n\n1. Run `/interview` and choose the BUSINESS scope — your DA will walk you through populating these files conversationally.\n2. Edit these files directly. Replace every `(interview — ...)` placeholder with your real value."
    },
    {
      "heading": "Privacy",
      "body": "This directory is part of your private USER/ tree. It is **not** included in LifeOS public releases. Keep sensitive entity information (tax IDs, account numbers, financial figures) here rather than in any documentation or skill file."
    }
  ],
  "WORK/YOUR_COMPANIES/SAMPLE_COMPANY/README.md": [
    {
      "heading": "What goes here",
      "body": "Entity-specific records and reference material:\n\n- **`README.md`** (this file) — overview of the company: what it does, who runs it, key facts.\n- **`REVENUE/`** — revenue records, invoices, quarterly/annual summaries. Files in here are how your DA answers \"how is the business doing financially this year.\"\n- **Formation documents** — EIN, articles of incorporation, operating agreement, W9, etc.\n- **Customer-facing materials** — media kit, one-pager, pricing sheet.\n- **Anything else specific to this entity** that your DA should be able to reference."
    },
    {
      "heading": "Sample fields to populate",
      "body": "- **Legal name:** (interview — sample company legal name)\n- **DBA / brand name:** (interview — sample brand name, if different)\n- **EIN / tax ID:** (interview — store actual EIN in a separate file, not in this README)\n- **State of formation:** (interview — sample state)\n- **Founder / owner:** (interview — name)\n- **What it does:** (interview — one-sentence description)\n- **Primary revenue source:** (interview — e.g. consulting, subscriptions, products)"
    },
    {
      "heading": "How to use",
      "body": "1. Rename this directory to your actual company name in PascalCase or UPPER_SNAKE_CASE — match how you'd reference it in conversation.\n2. Replace every `(interview — ...)` placeholder above.\n3. Add a `REVENUE/` subdirectory and populate it with your revenue records.\n4. Drop formation documents and customer-facing materials directly into this directory."
    },
    {
      "heading": "Privacy",
      "body": "This directory is part of your private USER/ tree and is **not** included in LifeOS public releases."
    }
  ]
} as const;
const TEMPLATE_GEAR = [
  {
    "category": "Computers & Displays",
    "items": [
      {
        "name": "Workstation",
        "detail": "(your machine)",
        "use": "Primary computer"
      },
      {
        "name": "Monitor",
        "detail": "(your display)",
        "use": "Primary display"
      }
    ],
    "notes": [],
    "todos": [
      "laptops, tablets, secondary machines, peripherals."
    ]
  },
  {
    "category": "Audio / Studio Chain",
    "items": [
      {
        "name": "Mic",
        "detail": "(your microphone)",
        "use": "Voice / recording",
        "subgroup": "Capture"
      },
      {
        "name": "Headphones / Monitors",
        "detail": "(your model)",
        "use": "Listening / mixing",
        "subgroup": "Monitoring"
      }
    ],
    "notes": [
      "Describe your capture and monitoring chain here if you have one."
    ],
    "todos": []
  },
  {
    "category": "Studio / Office",
    "items": [],
    "notes": [],
    "todos": [
      "desk, chair, lighting, keyboard, mouse."
    ]
  },
  {
    "category": "Networking",
    "items": [
      {
        "name": "Router / Firewall",
        "detail": "(your gateway)",
        "use": ""
      },
      {
        "name": "Internet",
        "detail": "(your plan)",
        "use": ""
      }
    ],
    "notes": [],
    "todos": []
  },
  {
    "category": "Smart Home (devices)",
    "items": [
      {
        "name": "Lighting",
        "detail": "(brand)",
        "use": "(count / hub)"
      },
      {
        "name": "Cameras",
        "detail": "(brand)",
        "use": "(count / integration)"
      }
    ],
    "notes": [],
    "todos": [
      "sensors, locks, thermostats, hubs. A network skill can populate a device topology that the Assets tab reads."
    ]
  },
  {
    "category": "House",
    "items": [],
    "notes": [],
    "todos": [
      "appliances, TVs, furniture, tools."
    ]
  },
  {
    "category": "Health & Sleep",
    "items": [],
    "notes": [],
    "todos": [
      "wearables, sleep tech, lab memberships."
    ]
  },
  {
    "category": "Everyday Carry (EDC)",
    "items": [],
    "notes": [],
    "todos": [
      "wallet, phone, watch, bag, keys, pen."
    ]
  },
  {
    "category": "Coffee",
    "items": [],
    "notes": [],
    "todos": [
      "grinders, brewers, kettle, scale — if coffee is your thing."
    ]
  },
  {
    "category": "Car",
    "items": [],
    "notes": [],
    "todos": [
      "make, model, year."
    ]
  },
  {
    "category": "Software",
    "items": [
      {
        "name": "(your app)",
        "detail": "(what for)",
        "use": ""
      }
    ],
    "notes": [],
    "todos": []
  },
  {
    "category": "Tech Stack",
    "items": [
      {
        "name": "(your language)",
        "detail": "(your projects)",
        "use": "",
        "subgroup": "Languages"
      },
      {
        "name": "(your framework)",
        "detail": "(your projects)",
        "use": "",
        "subgroup": "Frameworks & Runtimes"
      },
      {
        "name": "(your infra)",
        "detail": "(your projects)",
        "use": "",
        "subgroup": "Infrastructure"
      }
    ],
    "notes": [
      "The software/framework/infra stack you build on."
    ],
    "todos": []
  },
  {
    "category": "Maintenance",
    "items": [],
    "notes": [
      "Built to grow. When gear changes — new kit, upgrades, retirements — update the right section here and date the change. Skills point at this file; keeping it current keeps every gear-aware skill correct. New top-level categories are fine as your life expands."
    ],
    "todos": []
  }
] as const;

type SectionRecord = { heading: string; body: string };
const sectionKey = (section: SectionRecord) => JSON.stringify([section.heading.trim(), section.body.replace(/\r/g, "").trim()]);
const templateSectionKeys = new Set(Object.values(TEMPLATE_SECTIONS).flat().map(sectionKey));
export function withoutTemplateSections<T extends SectionRecord>(sections: T[] | undefined): T[] {
  return (sections ?? []).filter((section) => !templateSectionKeys.has(sectionKey(section)));
}

export function presentHealthData<T extends { files?: { name: string; sections: string[] }[]; [key: string]: unknown }>(data: T): T & { referenceFiles: { name: string; sections: string[] }[] } {
  const result = { ...data } as T & { referenceFiles: { name: string; sections: string[] }[] };
  for (const key of ["conditions", "medications", "supplements", "fitness", "nutrition", "routine", "providers", "metrics", "history"]) {
    if (Array.isArray(data[key])) (result as Record<string, unknown>)[key] = withoutTemplateSections(data[key] as SectionRecord[]);
  }
  // HEALTH.md is a reference overview. The API exposes only its headings, so
  // it cannot establish whether a personal measurement has been supplied.
  result.referenceFiles = (data.files ?? []).filter((file) => file.name.toUpperCase() === "HEALTH");
  result.files = (data.files ?? []).filter((file) => file.name.toUpperCase() !== "HEALTH").flatMap((file) => {
    const key = file.name.toLowerCase();
    const sections = result[key];
    return Array.isArray(sections)
      ? sections.length ? [{ ...file, sections: (sections as SectionRecord[]).map((section) => section.heading) }] : []
      : [file];
  });
  return result;
}

export function presentBusinessData<T extends { businessOverview?: SectionRecord[]; ulOverview?: SectionRecord[]; revenueAllSections?: SectionRecord[] }>(data: T): T {
  return { ...data,
    businessOverview: withoutTemplateSections(data.businessOverview),
    ulOverview: withoutTemplateSections(data.ulOverview),
    revenueAllSections: withoutTemplateSections(data.revenueAllSections),
  };
}

export function presentFinanceData<T extends { accounts?: SectionRecord[]; goals?: SectionRecord[]; expenses?: SectionRecord[]; investments?: SectionRecord[]; taxes?: SectionRecord[]; overview?: SectionRecord[]; outbound?: { vendors: FinanceLine[]; obligations: FinanceLine[]; other: FinanceLine[] } }>(data: T): T {
  return { ...data,
    accounts: withoutTemplateSections(data.accounts), goals: withoutTemplateSections(data.goals),
    expenses: withoutTemplateSections(data.expenses), investments: withoutTemplateSections(data.investments),
    taxes: withoutTemplateSections(data.taxes), overview: withoutTemplateSections(data.overview),
    ...(data.outbound ? { outbound: { ...data.outbound, vendors: withoutTemplateFinanceLines(data.outbound.vendors), obligations: withoutTemplateFinanceLines(data.outbound.obligations), other: withoutTemplateFinanceLines(data.outbound.other) } } : {}),
  };
}

type GearRecord = { name: string; detail: string; use: string; subgroup?: string };
type GearSectionRecord = { category: string; items: GearRecord[]; notes: string[]; todos: string[] };
const gearItemKey = (category: string, item: GearRecord) => JSON.stringify([category, item.name, item.detail, item.use, item.subgroup ?? ""]);
const templateGearItems = new Set(TEMPLATE_GEAR.flatMap((section) => section.items.map((item) => gearItemKey(section.category, item))));
export function presentGearSections<T extends GearSectionRecord>(sections: T[]): T[] {
  return sections.map((section) => {
    const template = TEMPLATE_GEAR.find((entry) => entry.category === section.category);
    return { ...section,
      items: section.items.filter((item) => !templateGearItems.has(gearItemKey(section.category, item))),
      notes: section.notes.filter((note) => !(template?.notes as readonly string[] | undefined)?.includes(note)),
      todos: section.todos.filter((todo) => !(template?.todos as readonly string[] | undefined)?.includes(todo)),
    };
  }).filter((section) => section.items.length > 0 || section.notes.length > 0 || section.todos.length > 0);
}

const SECTION_LABELS: Record<string, string> = {
  "Dietary Approach": "飲食方式",
  "Meal Preparation": "餐食準備",
  "Key Nutritional Considerations": "營養重點",
  "Hydration": "水分補充",
  "Food Sensitivities and Allergies": "食物敏感與過敏",
  "Current Stats (sample)": "目前數據（範例）",
  "Weight History (sample)": "體重紀錄（範例）",
  "Primary Care": "初級照護",
  "Specialists": "專科醫療",
  "Biomarker Testing": "生物指標檢驗",
  "Pharmacy": "藥局",
  "Pending Referrals": "待處理轉診",
  "Insurance": "保險",
  "Active Conditions": "目前健康狀況",
  "Allergies": "過敏",
  "Medical History": "病史",
  "Vitals Snapshot (sample)": "生命徵象概況（範例）",
  "Blood Type": "血型",
  "Prescription Medications": "處方藥物",
  "Daily Supplements": "每日補充品",
  "As-Needed (Not Every Day)": "按需要使用",
  "Past Medications": "過去用藥",
  "What Lives Here": "資料內容",
  "File Layout": "檔案結構",
  "How to Populate": "填寫方式",
  "Sample Snippet": "範例內容",
  "Key Numbers (Sample Panel — 2026-01-01)": "關鍵數值（範例檢驗 — 2026-01-01）",
  "Trends (Sample — Two Panels Compared)": "變化趨勢（兩次檢驗範例）",
  "Daily Metrics (Sample — Wearable/App Snapshot)": "每日指標（穿戴裝置或應用程式範例）",
  "Lab Sources": "檢驗來源",
  "Filing Profile": "申報資料",
  "Estimated Tax (Quarterly)": "每季預估稅額",
  "YTD Withholding (W-2)": "本年度累計預扣稅（W-2）",
  "Deductions To Track": "待追蹤扣除額",
  "Credits To Watch": "待檢視稅額抵減",
  "Carry-Forward Items": "結轉項目",
  "Last Year (For Reference)": "去年紀錄（供參考）",
  "Open Questions / Notes": "待釐清問題與筆記",
  "What lives here": "資料內容",
  "How to populate": "填寫方式",
  "Sample placeholder conventions": "範例欄位說明",
  "Total Invested": "投資總額",
  "Accounts": "帳戶",
  "Allocation (Approximate)": "大致配置",
  "Strategy Notes": "策略筆記",
  "Open Questions / Decisions Pending": "待釐清問題與待定事項",
  "Fixed Monthly Expenses": "每月固定支出",
  "Recurring Software / Subscriptions": "軟體與定期訂閱",
  "Variable Expenses (Monthly Average)": "變動支出（月平均）",
  "Annual / Periodic Expenses": "年度與定期支出",
  "Total Expenses": "總支出",
  "Optimization Candidates": "可調整項目",
  "Active Sources": "目前收入來源",
  "Expected Monthly Total": "預期每月合計",
  "Inactive / Past Sources": "已停止或過去來源",
  "Active Goals": "目前目標",
  "Completed Goals (For Memory)": "已完成目標（留存）",
  "Long-Horizon Goals (5+ Years)": "長期目標（五年以上）",
  "Company": "公司",
  "Mission": "使命",
  "Vision": "願景",
  "Values": "價值觀",
  "Annual Goals": "年度目標",
  "Strategy": "策略",
  "Key Initiatives": "重點行動",
  "Risks & Constraints": "風險與限制",
  "Sample fields to populate": "待填寫範例欄位",
  "How to use": "使用方式",

  "Quick Reference": "快速參考", "Current Status": "目前狀態", "Current Focus": "目前重點", "Recent Updates": "近期更新",
  "Current Routine": "目前習慣", "Current Goals": "目前目標", "Goals": "目標", "Notes": "筆記",
  "Metrics": "指標", "Tracking": "追蹤紀錄", "History": "歷史紀錄", "Overview": "概覽",
  "What goes here": "資料內容", "Add your own": "加入個人資料", "Conventions": "整理方式", "Privacy": "隱私",
  "Checking Accounts": "活期帳戶", "Savings / High-Yield Accounts": "儲蓄帳戶", "Credit Cards": "信用卡",
  "Brokerage / Investment": "證券與投資", "Loans / Liabilities": "貸款與負債", "Other / Specialty": "其他帳戶",
  "Closed Accounts (For Reference)": "已關閉帳戶（供參考）", "Net Worth Snapshot": "淨資產概況",
  "Monthly Cash Flow": "每月現金流", "Key Numbers To Track": "待追蹤指標", "Recent Changes": "近期變更", "Linked Files": "相關檔案",
};
export function sectionLabel(value: string): string { return SECTION_LABELS[value] ?? value; }

const TEMPLATE_FINANCE_LINES = [
  {
    "id": "sample_employer_inc.",
    "name": "Sample Employer Inc.",
    "scope": "mixed",
    "monthly_usd": 0,
    "annual_usd": 0,
    "source": "unconfigured",
    "cadence": "monthly",
    "notes": "Sample notes — semi-monthly direct deposit"
  },
  {
    "id": "sample_client_llc",
    "name": "Sample Client LLC",
    "scope": "mixed",
    "monthly_usd": 0,
    "annual_usd": 0,
    "source": "unconfigured",
    "cadence": "monthly",
    "notes": "Sample notes — project-based"
  },
  {
    "id": "sample_landlord",
    "name": "Sample Landlord",
    "scope": "mixed",
    "monthly_usd": 0,
    "annual_usd": 0,
    "source": "unconfigured",
    "cadence": "monthly",
    "notes": "Sample notes"
  },
  {
    "id": "sample_bank_mortgage",
    "name": "Sample Bank Mortgage",
    "scope": "mixed",
    "monthly_usd": 0,
    "annual_usd": 0,
    "source": "unconfigured",
    "cadence": "monthly",
    "notes": "Sample notes"
  },
  {
    "id": "sample_utility_(electric)",
    "name": "Sample Utility (Electric)",
    "scope": "mixed",
    "monthly_usd": 0,
    "annual_usd": 0,
    "source": "unconfigured",
    "cadence": "monthly",
    "notes": "Sample notes"
  },
  {
    "id": "sample_utility_(water)",
    "name": "Sample Utility (Water)",
    "scope": "mixed",
    "monthly_usd": 0,
    "annual_usd": 0,
    "source": "unconfigured",
    "cadence": "monthly",
    "notes": "Sample notes"
  },
  {
    "id": "sample_isp",
    "name": "Sample ISP",
    "scope": "mixed",
    "monthly_usd": 0,
    "annual_usd": 0,
    "source": "unconfigured",
    "cadence": "monthly",
    "notes": "Sample notes"
  },
  {
    "id": "sample_health_insurer",
    "name": "Sample Health Insurer",
    "scope": "mixed",
    "monthly_usd": 0,
    "annual_usd": 0,
    "source": "unconfigured",
    "cadence": "monthly",
    "notes": "Sample notes"
  },
  {
    "id": "sample_auto_insurer",
    "name": "Sample Auto Insurer",
    "scope": "mixed",
    "monthly_usd": 0,
    "annual_usd": 0,
    "source": "unconfigured",
    "cadence": "monthly",
    "notes": "Sample notes"
  },
  {
    "id": "sample_saas_vendor_1",
    "name": "Sample SaaS Vendor 1",
    "scope": "mixed",
    "monthly_usd": 0,
    "annual_usd": 0,
    "source": "unconfigured",
    "cadence": "monthly",
    "notes": "Sample notes"
  },
  {
    "id": "sample_saas_vendor_2",
    "name": "Sample SaaS Vendor 2",
    "scope": "mixed",
    "monthly_usd": 0,
    "annual_usd": 0,
    "source": "unconfigured",
    "cadence": "monthly",
    "notes": "Sample notes"
  },
  {
    "id": "sample_ai_vendor",
    "name": "Sample AI Vendor",
    "scope": "mixed",
    "monthly_usd": 0,
    "annual_usd": 0,
    "source": "unconfigured",
    "cadence": "monthly",
    "notes": "Sample notes"
  },
  {
    "id": "sample_cloud_provider",
    "name": "Sample Cloud Provider",
    "scope": "mixed",
    "monthly_usd": 0,
    "annual_usd": 0,
    "source": "unconfigured",
    "cadence": "monthly",
    "notes": "Sample notes"
  },
  {
    "id": "sample_streaming_service",
    "name": "Sample Streaming Service",
    "scope": "mixed",
    "monthly_usd": 0,
    "annual_usd": 0,
    "source": "unconfigured",
    "cadence": "monthly",
    "notes": "Sample notes"
  },
  {
    "id": "sample_grocery",
    "name": "Sample Grocery",
    "scope": "mixed",
    "monthly_usd": 0,
    "annual_usd": 0,
    "source": "unconfigured",
    "cadence": "monthly",
    "notes": "Sample notes"
  },
  {
    "id": "sample_brokerage",
    "name": "Sample Brokerage",
    "scope": "mixed",
    "monthly_usd": 0,
    "annual_usd": 0,
    "source": "unconfigured",
    "cadence": "monthly",
    "notes": "Sample notes — outbound transfers in, inbound dividends out"
  },
  {
    "id": "sample_cpa",
    "name": "Sample CPA",
    "scope": "mixed",
    "monthly_usd": 0,
    "annual_usd": 0,
    "source": "unconfigured",
    "cadence": "monthly",
    "notes": "Sample notes — annual fee"
  },
  {
    "id": "sample_county_assessor",
    "name": "Sample County Assessor",
    "scope": "mixed",
    "monthly_usd": 0,
    "annual_usd": 0,
    "source": "unconfigured",
    "cadence": "monthly",
    "notes": "Sample notes"
  },
  {
    "id": "sample_landlord",
    "name": "Sample Landlord",
    "scope": "personal",
    "monthly_usd": 0,
    "annual_usd": 0,
    "source": "manual",
    "cadence": "monthly",
    "tags": [
      "housing"
    ],
    "notes": "Sample notes — rent or mortgage payment"
  },
  {
    "id": "sample_utility_(electric)",
    "name": "Sample Utility (Electric)",
    "scope": "personal",
    "monthly_usd": 0,
    "annual_usd": 0,
    "source": "manual",
    "cadence": "monthly",
    "tags": [
      "utilities"
    ],
    "notes": "Sample notes — varies seasonally"
  },
  {
    "id": "sample_isp",
    "name": "Sample ISP",
    "scope": "personal",
    "monthly_usd": 0,
    "annual_usd": 0,
    "source": "manual",
    "cadence": "monthly",
    "tags": [
      "utilities"
    ],
    "notes": "Sample notes"
  },
  {
    "id": "sample_health_insurer",
    "name": "Sample Health Insurer",
    "scope": "personal",
    "monthly_usd": 0,
    "annual_usd": 0,
    "source": "manual",
    "cadence": "monthly",
    "tags": [
      "insurance"
    ],
    "notes": "Sample notes — pre-tax via payroll if applicable"
  },
  {
    "id": "sample_auto_insurer",
    "name": "Sample Auto Insurer",
    "scope": "personal",
    "monthly_usd": 0,
    "annual_usd": 0,
    "source": "manual",
    "cadence": "variable",
    "tags": [
      "insurance"
    ],
    "notes": "Sample notes — renews YYYY-MM-DD"
  },
  {
    "id": "sample_saas_vendor_1",
    "name": "Sample SaaS Vendor 1",
    "scope": "personal",
    "monthly_usd": 0,
    "annual_usd": 0,
    "source": "manual",
    "cadence": "monthly",
    "tags": [
      "subscription"
    ],
    "notes": "Sample notes"
  },
  {
    "id": "sample_saas_vendor_2",
    "name": "Sample SaaS Vendor 2",
    "scope": "personal",
    "monthly_usd": 0,
    "annual_usd": 0,
    "source": "manual",
    "cadence": "annual",
    "tags": [
      "subscription"
    ],
    "notes": "Sample notes — renews YYYY-MM-DD"
  },
  {
    "id": "sample_streaming_service",
    "name": "Sample Streaming Service",
    "scope": "personal",
    "monthly_usd": 0,
    "annual_usd": 0,
    "source": "manual",
    "cadence": "monthly",
    "tags": [
      "subscription"
    ],
    "notes": "Sample notes"
  },
  {
    "id": "sample_auto_loan_servicer",
    "name": "Sample Auto Loan Servicer",
    "scope": "personal",
    "monthly_usd": 0,
    "annual_usd": 0,
    "source": "manual",
    "cadence": "monthly",
    "tags": [
      "loan"
    ],
    "notes": "Sample notes — see ACCOUNTS.md for principal remaining"
  },
  {
    "id": "sample_county_assessor",
    "name": "Sample County Assessor",
    "scope": "personal",
    "monthly_usd": 0,
    "annual_usd": 0,
    "source": "manual",
    "cadence": "annual",
    "tags": [
      "tax"
    ],
    "notes": "Sample notes — property tax, due YYYY-MM-DD"
  }
] as const;
type FinanceLine = { id: string; name: string; scope: string; monthly_usd: number; annual_usd: number; source: string; cadence: string; tags?: readonly string[]; notes?: string; collector?: string };
const financeLineKey = (line: FinanceLine) => JSON.stringify([line.id, line.name, line.scope, line.monthly_usd, line.annual_usd, line.source, line.cadence, line.tags ?? [], line.notes ?? "", line.collector ?? ""]);
const templateFinanceLineKeys = new Set(TEMPLATE_FINANCE_LINES.map(financeLineKey));
function withoutTemplateFinanceLines<T extends FinanceLine>(lines: T[]): T[] {
  return lines.filter((line) => !templateFinanceLineKeys.has(financeLineKey(line)));
}
