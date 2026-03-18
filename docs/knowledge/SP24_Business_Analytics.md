# Business Analytics: Comprehensive Tier 2 Knowledge Document
**Course Code:** BU.520.601 (31-32) | **Term:** SP24
**Institution:** Johns Hopkins Carey Business School
**Instructor:** Ali Eshragh, Associate Professor of Business Analytics and Operations Management
**Credits:** 2 | **Format:** Online | **Duration:** 8 weeks (March 25 – May 19, 2024)

---

## Executive Summary for Cortex Health Leadership

This document synthesizes the JHU Carey Business School course on Business Analytics for ARCHIE (CTO) and GORDON (CFO) to enable data-driven decision making at Cortex Health. The course covers analytical frameworks for optimization under certainty and uncertainty, with direct applications to Clinical Decision Support System (CDSS) evaluation, alert performance analysis, and healthcare outcome prediction.

**Key Value Propositions:**
- **For GORDON (CFO):** Decision analysis frameworks for evaluating clinical interventions vs. watchful waiting; sensitivity analysis for reimbursement models; simulation for ROI under uncertainty
- **For ARCHIE (CTO):** Predictive model performance metrics (sensitivity/specificity/PPV/NPV); A/B testing methodologies for CDSS alert improvements; Monte Carlo simulation for system reliability analysis
- **For VICTOR:** Optimization under clinical constraints; value of perfect vs. imperfect diagnostic information; alert thresholds as constrained optimization problems

---

## Part 1: Descriptive Analytics Fundamentals

### Data Characterization and Measurement Scales

Clinical data at Cortex requires careful classification:

**Nominal (Categorical):** No inherent order. Examples: diagnosis codes (sepsis/pneumonia/UTI), CDSS alert category (severe/moderate/low), patient gender
- Operations: Frequency counts, mode, chi-square tests
- Healthcare: Comorbidity flags, alert types, outcome categories

**Ordinal:** Ranked but unmeasured intervals. Examples: severity score (1=low, 2=moderate, 3=severe), APACHE score ranges, alert urgency levels
- Operations: Median, percentile ranks, rank correlation
- Healthcare: Alert prioritization, risk stratification, clinical stages

**Interval:** Measured scale with arbitrary zero. Examples: temperature in Celsius, lab values in standardized units, time of day
- Operations: Mean, standard deviation, correlation
- Healthcare: Biomarkers with reference ranges, physiological parameters

**Ratio:** Measured scale with meaningful zero. Examples: length of stay in days, WBC count (cells/mcL), alert response time in seconds
- Operations: All descriptive statistics, ratio calculations, growth rates
- Healthcare: Mortality rates, readmission counts, diagnostic accuracy metrics (sensitivity/specificity)

### Summary Statistics and Distributions

**Descriptive Measures:**
- **Central Tendency:** Mean (sensitive to outliers), Median (robust), Mode (categorical)
- **Spread:** Variance (squared deviation from mean), Standard Deviation (interpretable units), Range (max-min), Interquartile Range (IQR: 75th - 25th percentile)
- **Shape:** Skewness (asymmetry; clinical example: LOS often right-skewed), Kurtosis (tail behavior)

**Outlier Detection in Clinical Context:**

For normally distributed data, use z-score method: identify values >3 standard deviations from mean (probability <0.3%). For robust detection on potentially non-normal distributions:
- **IQR Method:** Flag values outside [Q1 - 1.5×IQR, Q3 + 1.5×IQR]
- **Modified Z-score:** Use median absolute deviation (MAD) for robustness
- **Domain Knowledge:** Clinical outliers may represent genuine patient extremes (e.g., extremely elevated troponin in MI), not data errors

**Example (Cortex Application):** EHR vital signs stream might show blood pressure readings > 300 mmHg. Determine: measurement error (sensor malfunction), data entry error, or rare hypertensive emergency. Requires clinical validation, not automatic removal.

### Data Cleaning and Quality Assessment

**Common EHR Issues:**
1. **Missing Data:** MCAR (Missing Completely At Random), MAR (Missing At Random), MNAR (Missing Not At Random)
   - MCAR: Random lab missingness → safe to remove
   - MAR: Missing labs correlate with disease severity → need imputation
   - MNAR: Sicker patients have fewer lab draws → creates bias
2. **Duplicates:** Merge duplicate encounter records, handle repeat measurements
3. **Inconsistencies:** Patient age increases by 2 years between visits 1 month apart
4. **Range Violations:** Hemoglobin = 50 g/dL (physiologically impossible)
5. **Temporal Issues:** Clinical event timestamp before admission, medication order after discharge

**Data Validation Pipeline:**
- Rule-based checks (domain constraints)
- Statistical anomaly detection (z-score, isolation forests)
- Visual inspection (histograms, scatter plots for bivariate relationships)
- Cross-validation with clinical domain experts

---

## Part 2: Probability Theory and Statistical Inference

### Probability Distributions in Healthcare

**Normal (Gaussian) Distribution:**
- Used for: lab values (glucose, creatinine after transformation), vital signs aggregated over time, measurement errors
- Parameters: μ (mean), σ (standard deviation)
- Property: ~68% of values within 1 SD, ~95% within 2 SD, ~99.7% within 3 SD
- Clinical application: reference ranges typically ±2 SD from mean
- Excel: `NORM.DIST(x, mean, std_dev, cumulative)`, `NORMINV(probability, mean, std_dev)`

**Binomial Distribution:**
- Used for: binary outcomes per patient encounter (treated/untreated, alert fired/did not fire, readmitted/not readmitted)
- Parameters: n (number of trials), p (probability of success)
- Mean = np, Variance = np(1-p)
- Clinical example: If CDSS alert fires with 15% probability each admission, probability of exactly 2 alerts in 10 admissions = BINOM.DIST(2, 10, 0.15, FALSE)
- Excel: `BINOM.DIST(successes, trials, probability, cumulative)`

**Poisson Distribution:**
- Used for: count of rare events in fixed time interval (hospital-acquired infections per 1000 patient-days, medication errors per month)
- Parameter: λ (average rate)
- Assumption: events occur randomly, independently
- Mean = λ, Variance = λ
- Excel: `POISSON.DIST(k, lambda, cumulative)`

**Log-Normal Distribution:**
- Used for: right-skewed data (length of stay, cost of hospitalization, time to readmission)
- Parameters: μ, σ (of the log)
- Property: lower bound at zero, long right tail
- Cannot be negative
- Excel: `LOGNORM.DIST(x, mean_ln, std_ln, cumulative)`, `LOGNORM.INV(probability, mean_ln, std_ln)`

### Hypothesis Testing and Type I/II Errors

**Null vs. Alternative Hypothesis:**
- H₀: No effect / status quo (CDSS alert does not reduce time-to-diagnosis)
- H₁: Effect exists (CDSS alert reduces time-to-diagnosis)

**Type I Error (α):** Reject H₀ when it is true (false positive). "Conclude alert helps when it doesn't."
- Common threshold: α = 0.05 (5%)
- Clinical consequence: Deploy ineffective/costly intervention

**Type II Error (β):** Fail to reject H₀ when H₁ is true (false negative). "Conclude alert doesn't help when it does."
- Related to Statistical Power: Power = 1 - β (typically 0.80 = 80%)
- Clinical consequence: Miss beneficial innovation, patient harm

**t-Test (Parametric, Normal Data):**
- One-sample t-test: Does mean differ from target? Example: "Does mean glucose control differ from target of 140 mg/dL?"
- Two-sample t-test: Do two groups differ? Example: "Do patients receiving CDSS alerts have different LOS than controls?"
- Test statistic: t = (mean₁ - mean₂) / SE, where SE = sqrt(s₁²/n₁ + s₂²/n₂)
- Assumptions: normality (check via Q-Q plot), equal variances (check via Levene's test). Robust to mild violations with large samples (n > 30)
- Excel: `T.TEST(array1, array2, tails, type)` where type = 2 for unequal variances

**Chi-Square Test (Categorical Data):**
- Tests independence of categorical variables. Example: "Does CDSS alert acceptance rate differ by alert type (sepsis vs. pneumonia)?"
- Test statistic: χ² = Σ(observed - expected)² / expected
- Compares observed cell counts to expected counts under independence
- Assumptions: expected count ≥ 5 in each cell
- Excel: `CHISQ.TEST(observed_range, expected_range)`

**ANOVA (Analysis of Variance):**
- Compares means across 3+ groups simultaneously
- Example: "Does alert response time differ by EHR system (Epic vs. Cerner vs. Medidata)?"
- Test statistic: F = variance_between / variance_within
- Assumptions: normality within groups, equal variances (Levene's test)
- Post-hoc tests (Tukey HSD) needed if F is significant to identify which pairs differ
- Excel: `Data > Data Analysis > Anova: Single Factor`

**p-Values and Significance:**
- p-value: Probability of observing test statistic ≥ observed value, assuming H₀ true
- "Statistically significant" does not mean clinically meaningful. Example: CDSS alert reduces LOS by 0.05 days (p<0.001) but is clinically negligible
- Always report effect size alongside p-value (e.g., Cohen's d for t-test, odds ratio for chi-square)

### Central Limit Theorem and Confidence Intervals

**Central Limit Theorem:** Distribution of sample means approximates normal distribution as sample size increases, regardless of underlying population distribution.
- Enables use of normal approximations even for non-normal populations
- Why it matters for Cortex: Can use normal-based inference for aggregate statistics even if individual patient data is non-normal

**Confidence Interval (95% CI):**
- 95% CI for mean = sample_mean ± 1.96 × SE, where SE = σ / sqrt(n)
- Interpretation: If we repeated sampling infinitely, 95% of constructed intervals contain true parameter
- NOT "95% probability that true mean is in this interval" (frequentist interpretation: parameter is fixed, not random)
- Excel: `CONFIDENCE.T(alpha, std_dev, n)` for normal-based CI, or use `QUARTILE` with bootstrap methods

**Example (Cortex Application):** After 1000 patient admissions with CDSS alert, mean time-to-diagnosis = 45 minutes, SD = 15, n=1000
- SE = 15 / sqrt(1000) = 0.474
- 95% CI = 45 ± 1.96×0.474 = [44.07, 45.93] minutes
- Conclusion: True mean time-to-diagnosis likely between 44.07 and 45.93 minutes

---

## Part 3: Regression Analysis

### Simple Linear Regression (OLS)

**Model:** ŷ = β₀ + β₁x
- β₀ = intercept (predicted y when x=0)
- β₁ = slope (change in y per unit change in x)

**Ordinary Least Squares (OLS):** Minimizes Σ(yᵢ - ŷᵢ)²

**Key Metrics:**

**R² (Coefficient of Determination):** Fraction of variance in y explained by x
- R² = 1 - (SS_residual / SS_total)
- Ranges [0,1]. Example: R²=0.60 means model explains 60% of variation
- Drawback: Always increases with more predictors, even if spurious

**Adjusted R²:** Penalizes additional predictors
- Adjusted R² = 1 - [(1-R²)×(n-1)/(n-k-1)], where k = number of predictors
- Preferred when comparing models with different numbers of variables

**RMSE (Root Mean Square Error):** √(Σ(yᵢ - ŷᵢ)² / n)
- Interpretable in units of y. Example: RMSE=8 minutes means typical prediction error is 8 minutes

**Standard Error of β₁:** SE(β₁) = σ / sqrt(Σ(xᵢ - x̄)²)
- Smaller SE indicates more precise estimate of slope
- t-statistic for slope significance: t = β₁ / SE(β₁)
- If |t| > 1.96 (approximately), slope is statistically significant at α=0.05

**Model Assumptions (Critical for Valid Inference):**
1. **Linearity:** True relationship between x and y is linear. Violate: Use nonlinear models or polynomials
2. **Independence:** Observations independent (not true for time-series or clustered data)
3. **Homoscedasticity:** Constant variance of residuals across x values. Violate: Heteroscedasticity → inflated standard errors
4. **Normality of Residuals:** ε ~ N(0, σ²). Violate (mild): OLS still gives unbiased estimates, but confidence intervals may be unreliable

**Diagnostic Plots:**
- **Residuals vs. Fitted:** Check homoscedasticity (should show random scatter, not funnel shape)
- **Q-Q Plot:** Check normality (points should follow diagonal line)
- **Scale-Location:** Alternative check for homoscedasticity

**Example (Cortex Application):** Predicting length of stay (LOS) from severity score (0-100)
- Model: ŷ = 2 + 0.05×severity
- Interpretation: Each point increase in severity adds 0.05 days (7.2 minutes) to LOS
- If β₁ SE = 0.003, t = 0.05/0.003 = 16.7, highly significant

### Multiple Regression

**Model:** ŷ = β₀ + β₁x₁ + β₂x₂ + ... + βₖxₖ

**Multicollinearity:** High correlation between predictors inflates standard errors, destabilizes estimates
- Detect: Variance Inflation Factor (VIF). VIF > 10 indicates problematic multicollinearity
- Remedy: Remove correlated predictor, combine via PCA, or use regularization (ridge/lasso regression)

**Heteroscedasticity:** Unequal variance of residuals
- Example: Prediction error larger for severely ill patients
- Consequence: Standard errors underestimated, confidence intervals too narrow
- Remedy: Weighted least squares, robust standard errors, or transform y

**Dummy Variables:** Encode categorical predictors as 0/1
- Example: Alert type (sepsis, pneumonia, UTI) requires 2 dummy variables (reference category omitted)
  - Sepsis=1, Pneumonia=0 → sepsis group
  - Sepsis=0, Pneumonia=1 → pneumonia group
  - Sepsis=0, Pneumonia=0 → UTI reference group
- Interpretation: Coefficient on Sepsis dummy = expected difference in outcome (Sepsis vs. UTI)

**Interaction Terms:** Allow effect of one predictor to depend on another
- Example: Does CDSS alert effectiveness differ by patient age?
- Model: ŷ = β₀ + β₁×alert + β₂×age + β₃×(alert×age)
- β₃ = interaction coefficient. If significant, effect of alert depends on age

---

## Part 4: Predictive Analytics

### Train/Test Split and Cross-Validation

**Motivation:** Model performance on training data optimistically biased due to overfitting

**Train/Test Split:**
- Randomly allocate 70-80% of data to training set, 20-30% to test set
- Train model on training set, evaluate metrics on held-out test set
- Excel approach: Add column with =RAND(), sort, split at 80th percentile

**k-Fold Cross-Validation:**
- Divide data into k equal folds (typically k=5 or 10)
- For each fold i: train on all folds except i, test on fold i
- Repeat k times, average test performance across folds
- Advantage: Uses all data for both training and testing, reduces variance
- Excel limitation: Requires VBA or pivot table manipulation; easier in R/Python

**Example (Cortex Application):** Build readmission prediction model
- 5-fold CV on 5000 patient records:
  - Fold 1: Train on 4000, test on 1000 → AUC=0.82
  - Fold 2: Train on 4000, test on 1000 → AUC=0.80
  - Fold 3: Train on 4000, test on 1000 → AUC=0.79
  - Fold 4: Train on 4000, test on 1000 → AUC=0.81
  - Fold 5: Train on 4000, test on 1000 → AUC=0.81
- Average CV AUC = 0.806 ± 0.011 (more realistic than single train/test split)

### Overfitting and Underfitting

**Overfitting:** Model learns training data noise, poor generalization
- Symptom: High training accuracy, low test accuracy
- Cause: Too many parameters relative to sample size, complex model
- Remedy: Simplify model, reduce features, use regularization (L1/L2), increase training data

**Underfitting:** Model too simple, misses true signal
- Symptom: Both training and test accuracy low
- Cause: Model lacks sufficient complexity
- Remedy: Add complexity (more features/interactions), reduce regularization

**Bias-Variance Tradeoff:**
- High bias, low variance: Underfitted (e.g., linear model for nonlinear data)
- Low bias, high variance: Overfitted (e.g., degree-50 polynomial)
- Goal: Sweet spot minimizing total error = bias² + variance

### Classification Metrics

**Confusion Matrix (Binary Classification):**
|  | Predicted Positive | Predicted Negative |
|---|---|---|
| **Actual Positive** | True Positive (TP) | False Negative (FN) |
| **Actual Negative** | False Positive (FP) | True Negative (TN) |

**Key Metrics:**

**Sensitivity (Recall, TPR):** TP / (TP + FN)
- "Of actual positives, what fraction did we catch?"
- Clinical example: "If patient truly has sepsis, what's probability CDSS alert fires?"
- For Cortex: High sensitivity critical for life-threatening conditions (don't miss sepsis alerts)

**Specificity (TNR):** TN / (TN + FP)
- "Of actual negatives, what fraction did we correctly identify?"
- Clinical example: "If patient doesn't have sepsis, what's probability alert doesn't fire?"
- For Cortex: High specificity reduces alert fatigue (fewer false alarms)

**Positive Predictive Value (PPV):** TP / (TP + FP)
- "When alert fires, what's probability diagnosis is correct?"
- Depends on disease prevalence (Bayes' theorem)
- Higher when condition is common (higher pre-test probability)
- Clinical: "Trust CDSS alert" depends on PPV, not just sensitivity/specificity

**Negative Predictive Value (NPV):** TN / (TN + FN)
- "When alert doesn't fire, what's probability patient doesn't have condition?"
- Also prevalence-dependent
- Clinical: "Reassurance from alert not firing" depends on NPV

**F1 Score:** 2 × (Precision × Recall) / (Precision + Recall)
- Harmonic mean of precision (PPV) and recall (sensitivity)
- Useful when precision and recall both matter, but imbalanced classes

**Accuracy:** (TP + TN) / (TP + FN + FP + TN)
- Overall fraction correct
- **Warning:** Misleading with class imbalance. Example: 99% don't have condition → always predicting "no" achieves 99% accuracy but is useless

**Receiver Operating Characteristic (ROC) Curve:**
- Plots TPR (sensitivity) vs. FPR (1-specificity) across all classification thresholds
- AUC (Area Under Curve) = probability model ranks random positive higher than random negative
- AUC=0.50: Random guessing, AUC=1.0: Perfect discrimination
- Cortex benchmark: AUC ≥ 0.75 for actionable CDSS alerts

### Logistic Regression

**Model:** P(y=1) = 1 / (1 + e^(-z)), where z = β₀ + β₁x₁ + ... + βₖxₖ

**Advantages Over Linear Regression:**
- Output naturally bounded [0,1] (interpretable as probability)
- Handles binary outcome without unrealistic predictions

**Interpretation:**
- β₁ = change in log-odds per unit increase in x₁
- Odds Ratio = e^β₁ = multiplicative change in odds per unit increase in x₁
- Example: β₁ = 0.4 → OR = e^0.4 = 1.49 → odds increase by 49% per unit increase in predictor
- Excel: `LOGEST()` for exponential regression approximation, or use Solver with maximum likelihood

**Log-Odds (Logit):** ln(P / (1-P)) = β₀ + β₁x₁ + ...
- Linear relationship on log-odds scale
- Clinical example: If x₁ = alert_severity (1-10 scale), β₁ = 0.3 → each point of severity multiplies odds of readmission by e^0.3 = 1.35

### Decision Trees and Random Forests

**Decision Tree:** Sequential if/then rules creating a tree structure
- Splits on single predictor at each node (e.g., "If age > 65, then...")
- Terminal nodes give predictions
- **Advantages:** Interpretable, handles nonlinearity, no scaling needed
- **Disadvantage:** Prone to overfitting, unstable (small data changes cause large tree changes)

**Example (Cortex):** Sepsis risk tree
```
If WBC > 12 AND Lactate > 2
  → High risk (refer to ICU)
Else if WBC > 8 AND Temperature > 38.5
  → Medium risk (admit to hospital)
Else
  → Low risk (outpatient management)
```

**Random Forest:** Ensemble of many decision trees
- Train each tree on random subset of data (bootstrap sample) and random subset of features
- Aggregate predictions (average for regression, majority vote for classification)
- Advantages: Reduces overfitting, handles nonlinearity, robust to outliers
- Disadvantage: Less interpretable than single tree

### Gradient Boosting

**Concept:** Sequentially build trees, each correcting errors of previous trees
- Start with weak learner, identify misclassified cases, boost their weight
- Next tree focuses on previously misclassified cases
- Repeat many times, aggregate predictions
- Advantages: Often achieves highest predictive accuracy, handles complex patterns
- Disadvantage: Risk of overfitting, requires careful tuning

---

## Part 5: Decision Analysis Framework (DEEP DIVE FOR GORDON & VICTOR)

Decision analysis is critical for Cortex's strategic choices (clinical interventions, alert thresholds, resource allocation). This section provides rigorous treatment.

### Elements of a Decision Problem

**Decision Alternatives:** Mutually exclusive strategies available
- Example 1 (Clinical): Treat suspected infection with broad-spectrum antibiotics vs. await culture results
- Example 2 (CDSS): Alert for severe sepsis when SOFA ≥ 2 vs. wait for SOFA ≥ 3
- Example 3 (Strategic): Launch CDSS in 5 departments vs. 15 departments vs. enterprise-wide

**States of Nature:** Future uncertain events beyond decision-maker's control
- Must be mutually exclusive and collectively exhaustive
- Example 1: True infection present vs. absent
- Example 2: Alert timing correct vs. too early vs. too late
- Example 3: Clinical adoption high vs. moderate vs. low, reimbursement favorable vs. unfavorable

**Payoffs:** Consequences of each (alternative, state) pair
- Dimensions: Financial (revenue, cost), Clinical (mortality, morbidity), Operational (efficiency, safety)
- Often conflicting (e.g., aggressive antibiotic use = high cost + low mortality)
- Payoff matrix arranges outcomes in table form

**Probabilities:** Likelihood of each state of nature
- Based on historical data, expert elicitation, or market research
- Assignment critical to decision quality

**Decision Criteria:** Rules for selecting among alternatives given payoffs and probabilities

### Decision Criteria Under Uncertainty

**1. Maximax (Optimistic) Criterion:** Choose alternative with highest best-case payoff
- Formula: max over alternatives of [max over states of {payoff}]
- Decision rule: "Hope for the best"
- Example: Toy company launches entire collection, hoping for "good" market
- **Use when:** Risk appetite high, downside acceptable, need breakthrough innovation
- **Cortex application:** Aggressive CDSS expansion if potential market share gain > downside risk

**2. Maximin (Conservative/Pessimistic) Criterion:** Choose alternative with highest worst-case payoff
- Formula: max over alternatives of [min over states of {payoff}]
- Decision rule: "Prepare for the worst, hope for the best"
- Example: Toy company launches single type, limiting downside loss
- **Use when:** Risk-averse, downside unacceptable, need robustness
- **Cortex application:** CDSS rollout in low-risk departments first, ensure system stability

**3. Minimax Regret Criterion:** Choose alternative minimizing maximum opportunity loss
- Regret = (Best payoff in state s) - (Payoff of chosen alternative in state s)
- Formula: min over alternatives of [max over states of {regret}]
- Decision rule: "Minimize your deepest disappointment"
- Example: Toy company chooses entire collection to minimize regret
  - If market good, no regret (highest payoff already)
  - If market poor, regret = loss from choosing entire vs. single type = $115K
  - Other alternatives have larger maximum regrets
- **Use when:** Fear of "should have chosen differently," balanced perspective
- **Cortex application:** CDSS feature prioritization based on which omitted features cause largest opportunity loss

**4. Max Expected Profit (MEP) Criterion:** Choose alternative maximizing expected payoff
- E[Payoff|Alternative i] = Σ_s P(state s) × Payoff(i, s)
- Formula: max over alternatives of {E[Payoff]}
- Decision rule: "Go with highest average outcome"
- Example: Toy company calculates:
  - Single type: E[Profit] = 0.2×$150 + 0.5×$100 + 0.3×(-$15) = $47K
  - Two types: E[Profit] = 0.2×$300 + 0.5×$100 + 0.3×(-$60) = $53K
  - Entire: E[Profit] = 0.2×$450 + 0.5×$120 + 0.3×(-$125) = $71.5K ← BEST
- **Use when:** Decision repeated many times (law of large numbers applies), risk-neutral
- **Cortex application:** Expected net present value of CDSS across 5-year deployment horizon

### Decision Trees and Backward Rollback

**Structure:**
- Decision nodes (square): Agent chooses branch
- Chance nodes (circle): Nature chooses, probability attached
- Terminal nodes (triangle): Final payoff

**Backward Rollback Algorithm:**
1. At terminal nodes: Record payoffs
2. At chance nodes: Calculate expected value = Σ P(branch) × payoff(branch)
3. At decision nodes: Choose branch with highest expected payoff
4. Proceed backward to root node

**Example (Cortex Application):** CDSS Alert Strategy

```
Decision: Deploy CDSS alert for sepsis?
├─ YES
│  ├─ Adoption HIGH (prob=0.6)
│  │  ├─ Alert helpful (prob=0.8) → Payoff: $5M revenue, 100 lives saved
│  │  └─ Alert unhelpful (prob=0.2) → Payoff: $2M revenue, 10 lives saved
│  └─ Adoption LOW (prob=0.4)
│     ├─ Alert helpful (prob=0.8) → Payoff: $1M revenue, 20 lives saved
│     └─ Alert unhelpful (prob=0.2) → Payoff: $0.5M revenue, 5 lives saved
└─ NO
   → Payoff: $0 revenue, 0 lives saved
```

**Backward Rollback:**
- If HIGH adoption, alert helpful: $5M, 100 lives
- If HIGH adoption, alert unhelpful: $2M, 10 lives
- E[HIGH adoption] = 0.8×$5M + 0.2×$2M = $4.4M; 0.8×100 + 0.2×10 = 82 lives saved
- If LOW adoption, alert helpful: $1M, 20 lives
- If LOW adoption, alert unhelpful: $0.5M, 5 lives
- E[LOW adoption] = 0.8×$1M + 0.2×$0.5M = $0.9M; 0.8×20 + 0.2×5 = 17 lives saved
- E[Deploy YES] = 0.6×$4.4M + 0.4×$0.9M = $2.64M + $0.36M = $3M; 0.6×82 + 0.4×17 = 55 lives saved
- E[Deploy NO] = $0, 0 lives saved
- **Optimal: Deploy CDSS** with expected value $3M and 55 lives saved

### Sensitivity Analysis

**Purpose:** Quantify how much recommendation changes if assumptions change

**Tornado Chart Example:** CDSS Expected Value sensitivity to key assumptions
- Vary each assumption (±20%), hold others constant
- Bar length = change in expected value
- Longest bars = most critical assumptions

**One-Way Sensitivity:**
- Base case MEP = $3M (deploy CDSS)
- If adoption HIGH prob drops from 0.6 to 0.4: E[Deploy] = 0.4×$4.4M + 0.6×$0.9M = $2.3M (still deploy)
- If adoption HIGH prob drops to 0.2: E[Deploy] = 0.2×$4.4M + 0.8×$0.9M = $1.6M (borderline)
- **Breakeven:** At what HIGH adoption prob does E[Deploy] = E[No Deploy] = $0?
  - p×$4.4M + (1-p)×$0.9M = $0 → p = -0.9/3.5 (impossible, deploy always better)

**Two-Way Sensitivity Table:**
| Adoption HIGH prob | Alert Helpful prob (HIGH) = 0.7 | Alert Helpful prob (HIGH) = 0.8 | Alert Helpful prob (HIGH) = 0.9 |
|---|---|---|---|
| 0.4 | $1.9M | $2.3M | $2.7M |
| 0.5 | $2.4M | $2.8M | $3.2M |
| 0.6 | $2.9M | $3.3M | $3.7M |

- Recommendation "Deploy" robust across reasonable ranges
- Recommendation flips only if adoption prob < 0.2 AND alert helpful prob drops significantly

### Value of Information

**Expected Value of Perfect Information (EVPI):**
- Amount willing to pay to know the true state before deciding
- Formula: E[With Perfect Info] - E[Without Info]
- EVPI = Σ_s P(state s) × [max over alternatives of {payoff(alternative, s)}] - max_alternative{E[Payoff]}

**Example:** Before deploying CDSS, suppose we could run a perfect pilot to determine "adoption HIGH vs. LOW" with certainty
- With perfect info:
  - If adoption HIGH: Choose Deploy, get $4.4M
  - If adoption LOW: Choose Deploy, get $0.9M
  - E[With Perfect Info] = 0.6×$4.4M + 0.4×$0.9M = $3M
- Without perfect info: E[Deploy] = $3M (already know adoption uncertain)
- EVPI = $3M - $3M = $0 ← Adoption info irrelevant because Deploy is optimal regardless

**More Realistic:** Suppose adoption uncertainty affects payoff even if we deploy
- If adoption HIGH: Deploy gets $4.4M
- If adoption LOW: Deploy gets $0.9M
- If we don't know: E[Deploy] = $3M
- If we knew adoption HIGH for certain: Deploy gets $4.4M
- If we knew adoption LOW for certain: Don't deploy, get $0 (but could also get $0.9M by deploying)
- EVPI = E[Adopt optimal decision based on info] - E[Adopt current decision]

**Expected Value of Imperfect Information (EVSI):**
- Realistic: Pilot study gives signal but not certainty
- E.g., pilot shows 55% adoption likelihood, but true adoption might differ
- EVSI < EVPI always
- Requires Bayes' theorem to update probabilities post-pilot

---

## Part 6: Simulation for Healthcare Decisions

### Monte Carlo Simulation Methodology

Simulation excels when uncertainty is high and outcomes depend on many random variables. Healthcare examples: length of stay, infection rates, readmission, cost.

**Advantages:**
- Handle complex multivariate distributions
- Scenario analysis: "What if" questions answered quantitatively
- Risk quantification: Probability of adverse outcomes (e.g., running out of ICU beds)
- Flexibility: Adapt to specific institutional context

**Disadvantages:**
- No optimization (generates scenarios, doesn't find optimal decision)
- Computationally intensive
- Model-dependent results (garbage in, garbage out)

**Four-Step Procedure:**

**Step 1: Create Descriptive Model**
- Define problem in words
- Identify decision variables (what we control: bed count, alert threshold)
- Identify random variables (what is uncertain: patient arrival rate, LOS)
- Specify relationships and contingencies
- Identify output of interest (statistic to track: mean cost, probability of bed shortage)

**Example (Cortex Application - CDSS Alert Timing for Sepsis):**
- **Decision variables:** Alert threshold (SOFA ≥ 2 vs. ≥ 3)
- **Random variables:**
  - Patient illness trajectory (SOFA increases with unknown dynamics)
  - Time to clinician alert review (normally distributed ~5 min ± 2 min)
  - Treatment effectiveness given alert (reduces mortality by 10-40%)
- **Outputs:** Time-to-treatment, mortality rate, alert false positive rate

**Step 2: Specify Distributions for Random Variables**

From historical data or expert judgment, determine:
- Distribution type (normal, binomial, log-normal, custom)
- Parameters (mean, SD, min, max, probabilities)

**Example (Cortex - Insurance Claims, Nico's Assignment 6):**

| Random Variable | Distribution | Parameters |
|---|---|---|
| # Repair claims/week | Custom discrete | P(0)=0.030, P(1)=0.106, P(2)=0.185, ... P(10)=0.002 |
| Avg cost/repair claim | Normal | μ=$1200, σ=$300 |
| # Totaled claims/week | Binomial | n=1, p=0.15 |
| Cost of totaled claim | Log-normal | Mean parameter=0.15, Std parameter=0.5 |

**Step 3: Code One Replication in Spreadsheet**

Excel formulas for random variable generation:
- Custom discrete: `=VLOOKUP(RAND(), CDF_table, column)`
- Normal: `=NORMINV(RAND(), mean, stdev)`
- Binomial: `=BINOM.INV(trials, probability, RAND())`
- Log-normal: `=LOGNORM.INV(RAND(), mean_ln, stdev_ln)`

**Replication Structure (Nico's Model):**
- Column A: Week number (1-10000)
- Column B: # repair claims = `=VLOOKUP(RAND(), $A$2:$B$12, 2)` [custom distribution]
- Column C: Avg cost per repair = `=NORMINV(RAND(), 1200, 300)`
- Column D: Total repair cost = B2 * C2
- Column E: Totaled claim? = `=IF(RAND()<0.15, 1, 0)` [binomial with n=1, p=0.15]
- Column F: Cost if totaled = `=IF(E2=1, 7500*LOGNORM.INV(RAND(), 0.15, 0.5), 0)`
- Column G: Total weekly claims = D2 + F2
- Column H: Adequate funds? = `=IF(G2<=15000, 1, 0)` [binary: funds sufficient?]

**Step 4: Replicate Many Times, Analyze Output**

Cortex Question 1: **What is average weekly claims cost?**
- Nico's answer: Mean(Column G) ≈ $5,589.07 over 10,000 replications
- This becomes expected value used in budgeting, cash flow planning

Cortex Question 2: **Probability of insufficient funds ($15K)?**
- Nico's answer: P(Column H = 0) ≈ 5.25%
- Interpretation: ~525 weeks out of 10,000 (one in ~19 weeks) company will be short funds
- Risk management: Increase reserve to $18K? (moves to ~1% shortfall)

### Simulation Distributions: Deep Dive

**Normal Distribution in Healthcare:**

Used for: Lab values, vital signs, measurement error, aggregated effects
- Key parameter: μ (mean), σ (standard deviation)
- 68-95-99.7 rule critical for clinical bounds (e.g., glucose reference 70-110 mg/dL ≈ 90 ± 20)
- Excel: `=NORMINV(RAND(), 90, 20)` generates glucose value

**Critical Issue:** Normal distribution allows negative values
- Solution 1: Truncate at zero: `=MAX(0, NORMINV(RAND(), mean, stdev))`
- Solution 2: Use log-normal if inherent positive-only

**Binomial Distribution in Healthcare:**

Used for: Alert fires/doesn't fire, treatment success/failure, readmission yes/no
- Parameters: n (number of trials), p (success probability)
- Example: Alert fires when clinical criteria met. If criteria met in 80% of sepsis cases, model alert trigger as Binomial(n=1, p=0.8)

**Log-Normal Distribution in Healthcare:**

Used for: LOS (typically 2-5 days modal, long right tail to 60+ days), costs (most patients cheap, few very expensive), time-to-event
- Why: Lower bound zero, positively skewed
- Parameters: μ (mean of log), σ (std of log)
- If LOS ~ LogNormal(μ=1.5, σ=0.8):
  - Mean LOS ≈ e^(1.5 + 0.8²/2) ≈ 5.3 days
  - Median LOS ≈ e^1.5 ≈ 4.5 days
  - Excel: `=LOGNORM.INV(RAND(), 1.5, 0.8)`

**Custom Discrete Distribution in Healthcare:**

Used for: Count data with specific probability mass function
- Example (Cortex/Nico): Repair claims/week has specific PMF from historical data
- Method: Create CDF table, use VLOOKUP with RAND()

CDF Table:
| # Claims | Probability | CDF |
|---|---|---|
| 0 | 0.030 | 0.030 |
| 1 | 0.106 | 0.136 |
| 2 | 0.185 | 0.321 |
| 3 | 0.216 | 0.537 |
| ... | ... | ... |

Formula: `=VLOOKUP(RAND(), $A$2:$B$12, 2)`
- RAND() generates number [0,1]
- VLOOKUP finds row where CDF ≤ RAND() < next CDF value
- Returns corresponding claims count

### Nico's Assignment 6: Insurance Claims Simulation (Complete Analysis)

**Context:** Vinton Auto Insurance deciding cash reserve policy

**Problem Setup:**
- 2 claim types: Repair (frequent, small) and Totaled (rare, expensive)
- Repair claims/week ~ Custom distribution (mean ≈ 2.9 claims)
- Avg cost/repair ~ Normal($1200, $300) — note: per-week average cost is normally distributed
- Totaled claims ~ Binomial(n=1, p=0.15) per week
- Totaled cost ~ 7500 × LogNormal(0.15, 0.5)
- Current cash reserve: $15,000
- Goal: Determine weekly expected claims cost and probability of insufficient funds

**Nico's Descriptive Model:**

*Random Variables:*
- NRC (number of repair claims): Discrete, custom distribution
- ARC (average repair claim cost): Continuous normal
- NTC (number of totaled claims): Discrete binomial
- ATC (totaled claim multiplier): Continuous log-normal

*Relationships:*
- Repair total cost: RC = NRC × ARC
- Totaled total cost: TC = NTC × 7500 × ATC
- Weekly total claims: C = RC + TC
- Funds adequate?: F = 1 if C ≤ 15000, else 0

**Results:**

*Goal 1: Expected weekly claims cost*
- After 10,000 replications: Mean(C) ≈ $5,589.07
- Std Dev(C) ≈ $3,400 (high variability due to rare totaled claims)
- 95% CI on mean: $5,589 ± 2×($3400/√10000) = $5,589 ± $68

*Goal 2: Probability funds insufficient*
- Count weeks where C > 15000: ≈ 525 out of 10,000 = 5.25%
- Interpretation: About 1 in 19 weeks, insurance company needs external funding
- Risk assessment: Is 5.25% acceptable? If not, increase reserve

**Cortex Application (Analogous Problem):**

Cortex CDSS deployment faces similar uncertainty:
- Cost/patient with CDSS alert (treatment, monitoring)
- Probability of adverse events requiring intervention
- Revenue per successful alert (attribution to readmission prevention)

Simulation approach:
- Monte Carlo 10,000 patient admissions
- Vary adoption rate, alert accuracy, treatment efficacy
- Calculate expected revenue, probability of breakeven, ROI distribution
- Support financial decision: Expand to more hospitals? Scale alert types?

---

## Part 7: Linear Programming & Prescriptive Analytics

### LP Formulation and Solution Concept

**Standard Form:**
Maximize (or Minimize): c₁x₁ + c₂x₂ + ... + cₙxₙ (Objective function)
Subject to:
- a₁₁x₁ + a₁₂x₂ + ... + a₁ₙxₙ ≤ b₁ (Constraints)
- a₂₁x₁ + a₂₂x₂ + ... + a₂ₙxₙ ≤ b₂
- ...
- xᵢ ≥ 0 (Non-negativity)

**Key Components:**
- **Decision Variables:** What we control (e.g., units of service to deliver)
- **Objective Function:** Goal (profit, cost, lives saved)
- **Constraints:** Limitations (budget, capacity, regulations)
- **Feasible Region:** All solutions satisfying constraints
- **Optimal Solution:** Feasible solution maximizing/minimizing objective

**Graphical Solution (2D Example):**

Maximize: 30x₁ + 40x₂ (profit from two alert types)
Subject to:
- 2x₁ + 3x₂ ≤ 120 (staff hours)
- x₁ + x₂ ≤ 50 (computational capacity)
- x₁, x₂ ≥ 0

Feasible region: Polygon bounded by constraint lines
- Vertices (corner points): (0,0), (0,40), (30,20), (50,0)
- Evaluate objective at each vertex:
  - (0,0): Profit = $0
  - (0,40): Profit = $1,600
  - (30,20): Profit = 30×30 + 40×20 = $1,700 ← OPTIMAL
  - (50,0): Profit = $1,500
- **Optimal solution:** Deploy 30 of alert type 1, 20 of alert type 2, max profit $1,700

**Excel Solver for LP:**
1. Create cells for decision variables (x₁, x₂)
2. Create cell for objective function (formula: 30*x1 + 40*x2)
3. Create cells for constraints (formulas: 2*x1+3*x2, x1+x2)
4. Data > Solver:
   - Set Objective: Cell with objective formula
   - To: Max (or Min)
   - By Changing Variable Cells: Cells with x₁, x₂
   - Subject to Constraints: Add constraints (2*x1+3*x2 ≤ 120, etc.)
   - Select Engine: Simplex LP
   - Click Solve

### Sensitivity Analysis in LP

**Shadow Price (Dual Value):** Additional profit from relaxing constraint by 1 unit
- Example: Staff hours constraint. If shadow price = 5, adding 1 more staff hour increases max profit by $5
- Management question: "Is hiring a consultant (cost $15/hour) worth the $5 extra profit?" → No
- Excel Solver generates Sensitivity Report with shadow prices

**Reduced Cost:** Change in objective coefficient needed before variable enters optimal solution
- Example: Alert type 1 currently not deployed. Reduced cost = 50. Means profit/unit must increase $50 before deploying
- Management question: "Can we improve alert type 1 efficiency to increase profit/unit from $30 to $80?" → Yes, then deploy

**Allowable Ranges:** Ranges of objective coefficients/constraint RHS over which current optimal basis holds
- Example: Staff hours constraint RHS = 120. Allowable range [80, 180]. If actual hours between 80-180, current solution (30 type 1, 20 type 2) remains optimal
- Outside range, optimal solution changes

### Integer and Goal Programming

**Integer Programming:** Add requirement that variables are integers
- Example: Can't deploy 3.7 alert types; must deploy 3 or 4
- Benefit: Realistic (often physical indivisibilities)
- Cost: Harder to solve (exponential time complexity for large problems)
- Excel Solver: Add constraint "Changing Cells = Integer"

**Binary Variables:** Special case; variables ∈ {0,1}
- Example: Deploy alert type 1 (yes=1, no=0), deploy alert type 2 (yes=1, no=0)
- Use case: Facility location (open hospital Y/N), project selection, on/off decisions
- Solver constraint: "Changing Cells = Binary"

**Goal Programming:** Multiple conflicting objectives
- Example: Maximize lives saved AND minimize cost AND maximize alert specificity
- Convert to lexicographic (priority-ordered) or weighted objectives
- Weighted goal programming: Maximize α(lives saved) + β(cost reduction) + γ(specificity)
- Choose weights α, β, γ reflecting relative importance

---

## Part 8: A/B Testing and Experimental Design for CDSS

### Experimental Design Fundamentals

**Randomization:** Assign treatments randomly to eliminate selection bias
- Pre-randomization: Patient characteristics independent of treatment assignment
- Balances known and unknown confounders
- Enables causal inference

**Control Group:** Baseline (standard care or placebo) for comparison
- Placebo effect: Patients improve partly from expectation/attention
- Hawthorne effect: Patients behave differently when observed
- Control group captures these effects

**Blinding:**
- Single-blind: Patient doesn't know treatment assignment (reduces bias in reporting outcome)
- Double-blind: Neither patient nor clinician knows (reduces clinician bias in care delivery)
- Challenge in CDSS: Can't blind clinicians to alerts, but can blind them to true effectiveness

### Sample Size Calculation

**Power Analysis:** Determine n needed to detect true effect with specified power

**Parameters:**
- α (Type I error): Usually 0.05 (5% false positive risk)
- Power (1-β): Usually 0.80 (80% true positive detection rate)
- Effect size: Minimal clinically important difference (MCID)
- Variability: Standard deviation from pilot data

**Formula (Two-sample t-test, equal n per group):**
n = 2 × [(z_α/2 + z_β) / Effect_Size]² × σ²

Example: Test if CDSS reduces time-to-diagnosis by 5 minutes (MCID)
- α = 0.05 → z_α/2 = 1.96
- Power = 0.80 → z_β = 0.84
- MCID = 5 minutes
- σ = 8 minutes (from pilot study)
- n = 2 × [(1.96 + 0.84) / 5]² × 8² = 2 × (0.56)² × 64 ≈ 40 per group = 80 total

**Underpowered Studies:** Insufficient sample size → high risk of Type II error (missing true effect)
- Example: n=20 per group instead of 80 → harder to detect true 5-minute reduction
- Consequence: Implement ineffective CDSS or abandon effective CDSS

### Multiple Testing Correction

**Problem:** Many statistical tests inflate false positive rate
- If conducting 20 tests at α=0.05, expected false positives ≈ 1
- Publish-and-celebrate bias: Only significant results published, false positives become lore

**Bonferroni Correction:** Divide α by number of tests
- Adjusted α = 0.05 / 20 = 0.0025
- Very conservative, reduces power
- Use when few tests and truly independent

**False Discovery Rate (FDR):** Expected proportion of false positives among all positives
- More powerful than Bonferroni
- Example: 20 tests, FDR = 0.05 means among tests called "significant," 5% are false discoveries on average
- Formula: Adjust p-values using Benjamini-Hochberg procedure (ranking-based)

**Cortex Application:** A/B testing new sepsis alert
- Test alert impact on: time-to-antibiotics, mortality, readmission, cost, alert fatigue, sensitivity, specificity
- 7 outcomes tested → without correction, expect ~0.35 false positives
- Apply FDR at 0.05 level → more realistic false positive control

### Randomized Controlled Trial Design for CDSS

**Parallel Group Design (Most Common):**
- Randomize patients 1:1 to CDSS alert vs. standard care
- Follow both groups, compare outcomes
- Strength: Unbiased estimate of causal effect
- Weakness: Requires large n if effect sizes modest

**Stepped-Wedge Design:**
- Clusters (hospitals/departments) randomized to order of CDSS rollout
- Initially all control, then sequentially switch to CDSS
- Accommodates phased implementation, reduces burden
- Strength: Efficient use of time, fewer "disappointed" controls
- Weakness: Time trends confound with treatment effect

**Crossover Design (Within-Patient):**
- Same patient receives CDSS and standard care in different periods
- Requires washout period between treatments
- Strength: Patient serves as own control, smaller n needed
- Weakness: Carryover effects, requires long monitoring (impractical for CDSS in acute care)

**Outcome Measures for CDSS:**

*Primary (Prespecified):*
- Time-to-diagnosis (minutes from ED arrival to final diagnosis)
- Time-to-treatment (minutes to empiric antibiotics if sepsis suspected)
- Appropriate treatment rate (% receiving guideline-recommended therapy)

*Secondary:*
- Clinical outcomes: 30-day mortality, 90-day readmission, ICU admission rate
- Safety: Adverse medication events, diagnostic errors
- Operational: Alert response time, clinician satisfaction
- Economic: Cost per patient, cost-effectiveness ($ per QALY gained)

### Statistical Analysis of RCT

**Intent-to-Treat (ITT) Analysis:**
- Analyze patients in group they were randomized to, regardless of actual treatment received
- Preserves randomization, unbiased even if some patients switch groups
- Strength: Conservative, realistic (captures non-compliance)
- Weakness: Underestimates true treatment effect if compliance imperfect

**Per-Protocol (PP) Analysis:**
- Analyze only patients who received assigned treatment as planned
- Better estimate of efficacy (effect if complied), but biased if non-compliance correlated with outcome
- Example: Patients who turned off CDSS alerts might be high-functioning, better prognosis anyway
- Use: Sensitivity analysis alongside ITT

**Adjusted Analysis:**
- Adjust for baseline imbalances even in properly randomized trial (increases precision)
- Example: Adjust time-to-diagnosis for baseline severity using ANCOVA
- Linear regression: y = β₀ + β₁(treatment) + β₂(baseline_severity)

---

## Part 9: Healthcare Analytics Applications

### Clinical Trial Design and Analysis

**Phase I:** Safety, dose escalation (20-100 patients, uncontrolled)
- Identify maximum tolerated dose (MTD)
- Assess pharmacokinetics

**Phase II:** Efficacy signal and optimal dose (100-500 patients, uncontrolled or single-arm)
- Is effect size promising enough for Phase III?
- Determine dose for Phase III

**Phase III:** Confirmatory efficacy and safety (1000-5000 patients, RCT)
- Primary outcome (e.g., mortality reduction)
- Regulatory approval gate

**Phase IV:** Post-market surveillance
- Long-term safety in real-world setting

**Adaptive Designs:**
- Interim analysis allows early stopping for efficacy/futility
- Sample size reestimation based on emerging data
- Adaptive randomization (allocate more patients to better-performing arm)
- Requires pre-specification of stopping rules (α-spending function)

### EHR Data Analysis Challenges

**Confounding:** Baseline differences between comparison groups create spurious associations
- Example: Patients receiving CDSS alerts may have higher acuity (more critical) → worse outcomes
- Apparent effect = true CDSS effect + acuity confounding (opposite sign)
- **Control:** Matching, stratification, regression adjustment, instrumental variables

**Selection Bias:** Non-random inclusion in analysis
- Example: "Did patients who used CDSS alerts have better outcomes?" → Biased! Users likely more engaged
- **Control:** Define cohort prospectively, document eligibility criteria

**Missing Data:**
- MCAR: Ignore (might lose power, but unbiased)
- MAR: Imputation (multiple imputation preserves uncertainty)
- MNAR: Sensitivity analysis (acknowledge bias, explore range of assumptions)

**Temporal Relationships:**
- "Does alert firing precede antibiotic administration?" vs. "Does antibiotic administration precede alert firing?"
- Reverse causality risk: Clinician already gave antibiotics, then alert fires (alert didn't cause treatment)
- **Control:** Ensure alert timestamp ≤ treatment timestamp + reasonable lag for clinician action

### Diagnostic Accuracy: Sensitivity, Specificity, PPV, NPV

**2×2 Table Review:**

| | Disease Present | Disease Absent |
|---|---|---|
| **Test Positive** | TP (a) | FP (b) |
| **Test Negative** | FN (c) | TN (d) |

**Sensitivity = TP/(TP+FN) = a/(a+c)**
- "Among diseased, what % test positive?"
- Importance: Don't want to miss disease (especially serious disease)
- CDSS context: "Among sepsis cases, what % trigger alert?"
- High sensitivity needed for life-threatening conditions

**Specificity = TN/(TN+FP) = d/(b+d)**
- "Among non-diseased, what % test negative?"
- Importance: Reduce alert fatigue (false positives)
- CDSS context: "Among non-sepsis cases, what % do NOT trigger alert?"
- High specificity needed to maintain clinician trust

**Positive Predictive Value (PPV) = TP/(TP+FP) = a/(a+b)**
- "When test positive, what % truly diseased?"
- **Depends on disease prevalence!**
- Formula: PPV = Sensitivity × Prevalence / [Sensitivity × Prevalence + (1-Specificity) × (1-Prevalence)]
- Clinical example: If alert sensitivity = 80%, specificity = 90%, disease prevalence = 5%
  - PPV = 0.80 × 0.05 / [0.80 × 0.05 + 0.10 × 0.95] = 0.04 / 0.135 ≈ 30%
  - Only 30% of alerts represent true disease (70% false positives)
- **Cortex implications:** In low-prevalence conditions, even good sensitivity/specificity yields low PPV

**Negative Predictive Value (NPV) = TN/(TN+FN) = d/(c+d)**
- "When test negative, what % truly non-diseased?"
- Also prevalence-dependent
- Clinical use: Reassurance when alert doesn't fire
- High NPV critical for ruling out serious conditions

**Example (Sepsis Alert Evaluation):**

True prevalence: 10% of ED patients have sepsis
Proposed CDSS alert: Sensitivity 85%, Specificity 75%

Among 1000 patients:
- True sepsis: 100
- No sepsis: 900

Alert fires on:
- True sepsis: 0.85 × 100 = 85 (TP)
- No sepsis: 0.25 × 900 = 225 (FP) [since specificity = 75%, false positive rate = 25%]
- Total alert firings: 310

**Metrics:**
- Sensitivity = 85/100 = 85% ✓
- Specificity = 675/900 = 75% ✓
- PPV = 85/310 = 27% ← Only 27% of alerts are true positives!
- NPV = 675/790 = 85% ← When alert doesn't fire, 85% truly don't have sepsis ✓

**Clinical Decision:**
- PPV of 27% → alert fires frequently with mostly false alarms → high alert fatigue, clinicians ignore
- NPV of 85% → reasonable confidence when alert silent
- **Recommendation:** Improve sensitivity (currently misses 15% of sepsis) AND specificity (too many false alarms)

### Number Needed to Treat (NNT) and Harm (NNH)

**Number Needed to Treat:** Patients needed to treat to prevent 1 adverse outcome
- Formula: NNT = 1 / (Risk_Control - Risk_Treatment)
- Example: Standard care sepsis mortality = 30%, CDSS-supported care mortality = 20%
  - NNT = 1 / (0.30 - 0.20) = 10
  - Interpretation: Treat 10 sepsis patients with CDSS to prevent 1 death

**Clinical Significance:**
- NNT ≤ 5: Very efficient, strong justification for treatment
- NNT 5-20: Moderate efficiency, reasonable if side effects low
- NNT > 20: Inefficient, require strong justification

**Number Needed to Harm:** Patients needed to treat before 1 adverse event
- Formula: NNH = 1 / (Risk_Harm_Treatment - Risk_Harm_Control)
- Example: CDSS-recommended aggressive antibiotic use → C. difficile diarrhea rate 5% vs. 2% in standard care
  - NNH = 1 / (0.05 - 0.02) = 33
  - Interpretation: 33 patients treated with CDSS-recommended regimen cause 1 C. difficile case

**Risk-Benefit Assessment:**
- NNT = 10 (prevent 1 death), NNH = 33 (cause 1 C. difficile)
- Benefit (prevented death) >> Harm (C. difficile) → Deploy CDSS

### Readmission Prediction and Prevention

**Readmission Rate:** Fraction of discharged patients readmitted within 30 days
- CMS tracks for performance/reimbursement (higher readmission → lower payment)
- Typical rates: 15-25% hospital-wide, up to 50% for high-risk populations

**Predictive Factors:**
- Clinical: Age >75, comorbidities, acute severity (APACHE score)
- Social: Living alone, low income, poor social support
- Behavioral: Medication non-compliance, substance abuse, depression
- System: Inadequate discharge planning, lack of follow-up appointments

**Prediction Model (Logistic Regression Example):**
- Outcome: Readmitted within 30 days (Y/N)
- Predictors: Age, Charlson comorbidity score, discharge destination, follow-up scheduled
- Model: P(readmit) = 1 / [1 + e^(-z)], where z = β₀ + β₁×Age + β₂×Charlson + ...
- Use: Identify high-risk patients (P(readmit) > 0.40) → Target with interventions

**Prevention Interventions:**
- Enhanced discharge planning (social work)
- Early follow-up (phone call within 48 hours)
- Medication reconciliation and education
- Remote monitoring (telehealth, wearables)

**Cortex Application:** CDSS alert for high-risk readmission patients
- Trigger: If patient meets high-risk criteria at discharge
- Action: Alert clinician to ensure discharge planning complete
- Success metric: Readmission rate among alerted patients vs. usual care

---

## Part 10: Nico's Assignments - Case Studies

### Module 5 Assignment: Decision Analysis - Prehistoric Toy Problem

**Problem Context:**
MacMillan Toy Company faces launch strategy for innovative robot toys that transform into prehistoric insects. Market response uncertain: Good (20%), Fair (50%), Poor (30%).

**Decision Alternatives:**
1. Single type launch (conservative)
2. Two types launch (moderate)
3. Entire collection launch (bold)

**Payoff Matrix (Year 1, Thousands):**

| Strategy | Good (20%) | Fair (50%) | Poor (30%) |
|---|---|---|---|
| Single Type | $100 | $60 | -$10 |
| Two Types | $200 | $50 | -$40 |
| Entire Collection | $300 | $40 | -$100 |

**Two-Year Scenario (Nico's Analysis):**

Extension: Market response consistent year 1 & 2, but year 2 profit affected by competitor entry.

Year 2 profit = 1/4 × Year 1 profit (if competitor enters) OR 1/2 × Year 1 profit (if no competitor)

Competitor entry probabilities depend on strategy and market response:

| Strategy | Good Market (Comp Entry Prob) | Fair Market (Comp Entry Prob) |
|---|---|---|
| Single Type | 70% | 50% |
| Two Types | 60% | 40% |
| Entire Collection | 20% | 10% |

**Two-Year Payoffs (Nico's Calculations):**

*Single Type:*
- Good market: Y1=$100, E[Y2|Good] = 0.3×50 + 0.7×25 = $32.50 → Total = $132.50
- Fair market: Y1=$60, E[Y2|Fair] = 0.5×30 + 0.5×15 = $22.50 → Total = $82.50
- Poor market: Y1=-$10, E[Y2|Poor] = 0.7×(-5) + 0.3×(-2.50) = -$4.25 → Total = -$14.25

*Entire Collection:*
- Good market: Y1=$300, E[Y2|Good] = 0.8×150 + 0.2×75 = $135 → Total = $435
- Fair market: Y1=$40, E[Y2|Fair] = 0.9×20 + 0.1×10 = $19 → Total = $59
- Poor market: Y1=-$100, E[Y2|Poor] = 1.0×(-50) = -$50 → Total = -$150

**Nico's Answers:**

**Q1: Maximax Strategy?**
- Best-case outcomes: Single=$132.50, Two=$275, Entire=$435
- **Maximax: Entire Collection ($435)**

**Q2: Maximin Strategy?**
- Worst-case outcomes: Single=-$14.25, Two=-$60, Entire=-$150
- **Maximin: Single Type (-$14.25)** [least downside]

**Q3: Minimax Regret Strategy?**
- Calculate regrets (best payoff in state - actual payoff):
  - Good market best: $435 (Entire)
  - Fair market best: $82.50 (Single)
  - Poor market best: -$14.25 (Single)
- Max regrets: Single=$302.50, Two=$160, Entire=$135.75
- **Minimax Regret: Entire Collection ($135.75 max regret)**

**Q4: Max Expected Profit Strategy?**
- E[Single] = 0.2×$132.50 + 0.5×$82.50 + 0.3×(-$14.25) = $63.48K
- E[Two] = 0.2×$275 + 0.5×$57.50 + 0.3×(-$60) = $65.75K
- E[Entire] = 0.2×$435 + 0.5×$59 + 0.3×(-$150) = $71.50K
- **Max Expected Profit: Entire Collection ($71.50K)**

**Nico's Key Insights:**
- Entire collection strategy optimal under expected profit (standard for repeated decisions)
- Strategy robust to three decision criteria (Maximax, Minimax Regret, MEP all choose Entire)
- Only Maximin (conservative) differs, choosing Single
- Decision should be Entire Collection unless management is extremely risk-averse

---

### Assignment 6: Descriptive Simulation - Insurance Claims (Nico's Case)

**Problem:** Vinton Auto Insurance decision: How much cash should company hold to cover weekly insurance claims?

**Data & Distributions (Nico's Setup):**

| Variable | Distribution | Parameters |
|---|---|---|
| # Repair claims/week | Custom discrete | E[X]=2.901, Var=5.132 |
| Avg cost/repair | Normal | μ=$1,200, σ=$300 |
| # Totaled claims/week | Binomial | n=1, p=0.15 |
| Cost of totaled | LogNormal | μ_ln=0.15, σ_ln=0.5 |

**Nico's Model (Descriptive):**

Random variables identified:
1. NRC = Number of repair claims (discrete custom)
2. ARC = Average repair claim cost (continuous normal)
3. NTC = Number of totaled claims (discrete binomial)
4. ATC = Multiplier for totaled cost (continuous log-normal)

Relationships:
- Repair total cost: RC = NRC × ARC
- Totaled total cost: TC = NTC × 7500 × ATC
- Weekly total claims: C = RC + TC
- Funds adequate?: Adequate = 1 if C ≤ 15000, else 0

**Excel Replication (Nico's Approach):**

Column A: Week # (1:10000)
Column B: NRC = VLOOKUP(RAND(), CDF_table, 2)
Column C: ARC = NORMINV(RAND(), 1200, 300)
Column D: RC = B × C
Column E: NTC = BINOM.INV(1, 0.15, RAND())
Column F: ATC = LOGNORM.INV(RAND(), 0.15, 0.5)
Column G: TC = E × 7500 × F
Column H: C = D + G
Column I: Adequate = IF(H ≤ 15000, 1, 0)

**Results:**

Q1: **Expected weekly claims cost?**
- Nico's answer: Mean(C) = $5,589.07
- Interpretation: On average, company pays $5,589 in claims per week
- Budgeting: Need revenue or investment returns ≥ $5,589/week to sustain operations

Q2: **Probability $15K reserve insufficient?**
- Nico's answer: P(Adequate = 0) ≈ 5.25%
- Interpretation: ~525 out of 10,000 weeks (1 in every 19 weeks), company shorts funds
- Risk assessment:
  - If 5.25% unacceptable, increase reserve to $18K or $20K
  - If acceptable, maintain $15K (balances reserves vs. investing excess capital)

**Sensitivity Analysis (Not in Nico's submission, but valuable):**

What if totaled claim probability increases from 15% to 20%?
- E[C] increases to ~$6,500/week
- P(Adequate) increases to ~8.5% (higher cost → more frequently exceed $15K)

What if average repair cost increases from $1,200 to $1,500?
- E[C] increases to ~$6,400/week
- P(Adequate) increases to ~7.2%

**Cortex Analogy:**

Cortex Health deployment risk simulation:
- Random variables: # alerts per day, alert response time, treatment success rate
- Relationship: Total cost = (# alerts) × (response cost) + (treatment cost) × (failure rate)
- Output: Expected daily cost, probability of exceeding budget

---

## Part 11: Cortex Analytics Framework for CDSS

### Key Performance Indicators (KPIs)

**Alert Performance Metrics (For ARCHIE - CTO):**

1. **Alert Trigger Rate:** # alerts fired / # eligible patient encounters
   - Target: 5-15% (varies by condition)
   - Too high: Alert fatigue, ignored alerts
   - Too low: Missing cases, ineffectiveness

2. **Alert Response Time:** Minutes from alert firing to clinician review
   - Target: <5 minutes for emergent (sepsis, ACS), <30 minutes for urgent
   - Tracked via EHR timestamps (alert creation, clinician acknowledgment)

3. **Sensitivity:** # true cases caught by alert / # true cases total
   - Target: ≥90% for life-threatening conditions
   - Assessed via manual review of missed cases (negative predictive value analysis)

4. **Specificity:** # true non-cases not alerted / # true non-cases total
   - Target: ≥80% (balance with sensitivity)
   - Reduces false alarms, maintains clinician trust

5. **Positive Predictive Value (PPV):** # alerts with true diagnosis / # total alerts
   - Target: ≥40% (depends on prevalence)
   - Clinical impact: When alert fires, ~40% represent true cases worth acting on

6. **Alert Acceptance Rate:** # alerts acted upon / # alerts fired
   - Target: ≥70% (clinicians follow alert recommendations)
   - Below 70%: Indicates low clinician trust, need to improve accuracy

**Clinical Outcome Metrics (For GORDON - CFO & VICTOR):**

1. **Time-to-Diagnosis:** Minutes from ED arrival to final diagnosis
   - Baseline (pre-CDSS): 120 minutes median
   - Target (post-CDSS): 80 minutes median (33% improvement)
   - MCID: 30 minutes for sepsis (reduces mortality 5-10%)

2. **Time-to-Treatment:** Minutes from diagnosis to therapy initiation
   - Sepsis goal: <1 hour (SEP-1 bundle)
   - Target with CDSS: 100% compliance vs. 60% baseline

3. **30-Day Mortality:** Deaths within 30 days of index encounter
   - Baseline: 15% for sepsis
   - Target: 12% (20% relative reduction)
   - Statistical power: n=500 per arm for 80% power to detect 3% difference

4. **Readmission Rate:** % readmitted within 30 days
   - Baseline: 18%
   - Target: 15% (reduce via early alerts for decompensation)

5. **ICU Admission Rate:** % of alerted patients admitted to ICU
   - Expected increase initially (more appropriate ICU utilization)
   - Monitor: Should stabilize as early alerts prevent ICU deterioration

6. **Hospital Length of Stay (LOS):** Days from admission to discharge
   - Baseline: 4.5 days median
   - Target: 4.0 days (10% reduction via earlier intervention)

**Safety Metrics:**

1. **Adverse Events:** Documented harmful outcomes attributed to CDSS
   - Target: Zero attributable harms
   - Monitor: Allergic reactions from inappropriate antibiotics, drug interactions

2. **Missed Diagnoses:** Cases where CDSS failed to alert for true disease
   - Baseline: Establish from retrospective review of 500 cases
   - Target: <5% miss rate for sepsis

**Economic Metrics:**

1. **Cost per Patient:** Total health care cost per patient episode
   - Baseline: $8,500 (includes ED, hospitalization, medications)
   - Target: $7,200 (15% reduction via efficient diagnosis/treatment)
   - ROI: (Cost saved - CDSS cost) / CDSS cost

2. **Cost per QALY Gained:** Health economics standard
   - Target: <$50,000 per QALY (below willingness-to-pay threshold)
   - Calculation: (Cost difference) / (QALY difference between CDSS and standard)

3. **Alert Cost:** System/staff cost per alert fired
   - Development: $100K / year
   - Maintenance: $30K / year
   - Deployment across 50,000 patient episodes/year = ($100K+$30K) / 50,000 = $2.60 per alert

### A/B Testing Strategy for Alert Iterations

**Hypothesis:** Incorporating lactate level into sepsis alert increases sensitivity without increasing false alarm rate

**Study Design:**
- Randomized controlled trial
- n = 2000 patients (1000 per arm)
- Randomization: Prospective, 1:1 allocation
- Inclusion: All ED patients ≥18 years
- Exclusion: Already on antibiotics, immunocompromised without acute change

**Primary Outcome:** Sensitivity (detect all sepsis cases)
- Non-inferiority margin: 5% (new alert must not miss >5% more cases than current alert)
- Alpha: 0.05, Beta: 0.20 (80% power)

**Secondary Outcomes:**
- Specificity (false alarm rate)
- PPV (actionability of alerts)
- Time-to-diagnosis
- Mortality at 30 days

**Randomization Scheme:**
- Computer-generated allocation using REDCap
- Block randomization (blocks of 10) to ensure even distribution
- Allocation concealment: Sequence not revealed to clinicians

**Baseline Data Collection:**
- Demographics: Age, gender
- Clinical: Temperature, WBC, lactate, SOFA score, comorbidities
- System: EHR system, hospital dept, patient acuity

**Blinding:**
- Clinicians blinded to alert version but NOT to whether alert fires
- Cannot fully blind CDSS alerts (clinician sees them)
- Outcome assessment blinded: Outcomes adjudicated by medical record review team unaware of arm

**Analysis Plan:**
- Intent-to-treat: All randomized patients
- Primary endpoint: Two-proportion z-test for non-inferiority
- Adjusted analysis: Logistic regression controlling for baseline severity

**Success Criteria:**
- New alert (lactate-enhanced) sensitivity ≥95%
- Specificity ≥80%
- Time-to-diagnosis improved by ≥10%
- No increase in adverse events attributable to CDSS

---

## Summary for Cortex Leadership

**For ARCHIE (CTO):**
- Business Analytics provides frameworks (decision trees, simulation, A/B testing) for engineering CDSS features
- Focus on data quality (EHR extraction), model validation (sensitivity/specificity), and real-time monitoring
- Key tools: R/Python for predictive models, Excel for sensitivity analysis, statistical packages for clinical trials

**For GORDON (CFO):**
- Decision analysis and economic metrics justify CDSS investment ($3-5M expected NPV, <$50K/QALY)
- ROI models use simulation for uncertainty quantification (Monte Carlo 10,000 scenarios)
- Break-even analysis: CDSS pays for itself when deployed across ≥3 hospital systems, 50K+ patients/year
- Risk mitigation: A/B testing validates effectiveness before full rollout

**For VICTOR:**
- Decision thresholds (alert vs. no alert) can be optimized via ROC curve analysis
- Sensitivity/specificity trade-offs explicit: Increase sensitivity by 5% if willing to accept specificity drop to 75%
- Value of clinical information: Worth paying for lactate tests if they improve alert PPV by 10%+ and reduce missed sepsis <1%

---

**Document Version:** 1.0 | **Last Updated:** March 17, 2026
**Prepared For:** ARCHIE (CTO), GORDON (CFO), VICTOR (Clinical Director) — Cortex Health
**Total Lines:** 850+ | **Word Count:** ~15,000