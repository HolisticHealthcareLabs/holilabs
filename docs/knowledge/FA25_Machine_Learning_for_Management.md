# Machine Learning for Management: Tier 2 Knowledge Document
**Course Code:** 105210 | **Term:** FA25
**Institution:** JHU Carey Business School | **Instructor:** Minghong Xu, PhD.

## Executive Overview

This document is a comprehensive Tier 2 knowledge base for the Cortex Boardroom AI agent system, targeting healthcare AI decision-making. It consolidates the Machine Learning for Management course curriculum with specific applications and implications for healthcare CDSS (Clinical Decision Support System) deployment in the Brazilian market.

**Target Audience:** ARCHIE (CTO), ELENA (CMO/Clinical), and Cortex Health technical leadership
**Use Cases:** ML model selection for clinical workflows, healthcare data integration, regulatory compliance, bias mitigation in healthcare AI

---

## Part 1: Foundational Concepts

### 1.1 ML Fundamentals: Why ML Matters for Healthcare

Machine Learning is fundamentally code that learns patterns from data. In healthcare, ML enables:

- **Clinical Risk Stratification:** Predicting patient deterioration, readmissions, and adverse events
- **Diagnostic Assistance:** Supporting radiologists, pathologists, and clinicians in interpretation
- **Resource Optimization:** Predicting no-shows, optimizing scheduling, reducing operational waste
- **Personalized Medicine:** Tailoring treatment recommendations to individual patient characteristics

The rise of ML in healthcare is driven by three factors:

1. **Better Data:** Electronic Health Records (EHRs), PACS systems, lab integrations create rich longitudinal datasets
2. **Better Computing Power:** Cloud infrastructure enables training complex models on large datasets
3. **Better Methods:** Advances in algorithms, particularly ensemble methods and deep learning

### 1.2 Value Creation vs. Value Destruction

A critical distinction for healthcare leaders: **not all ML projects create value**. Value destruction occurs through:

- Applying ML to problems better solved by rule-based systems or simpler logic
- Poor implementation that fails clinical workflow integration
- Models that cannot be interpreted by clinicians, breaking trust
- Deploying models without addressing underlying data bias
- Failing to meet regulatory requirements (FDA, ANVISA)
- Opportunity cost: delaying deployment of proven solutions

**For Cortex:** The CDSS must prioritize interpretable models that clinicians trust, even if they sacrifice some predictive accuracy for transparency. Logistic regression or decision trees with clear feature importance often outperform black-box models in clinical adoption.

### 1.3 ML in Context: The Technology Stack

ML exists within a nested hierarchy:

- **Technical Layer:** Algorithms and data (the mathematical core)
- **Project Layer:** Teams, infrastructure, data pipelines
- **Organizational Layer:** Business processes, incentives, resource allocation
- **Societal Layer:** Regulatory environment, patient privacy, healthcare equity

For Cortex Health in Brazil:
- Technical: Training models on patient data from healthcare partners
- Project: Integration with hospital EHR systems, clinical validation workflows
- Organizational: Adoption by clinicians, integration with existing decision-making
- Societal: ANVISA compliance, addressing health disparities in underserved Brazilian regions

---

## Part 2: Supervised Learning Deep Dive

Supervised learning algorithms make predictions by learning relationships between input features (X) and known outputs (y). They are the workhorse of healthcare ML.

### 2.1 Regression vs. Classification

**Regression:** Predicting continuous numerical values
- Examples: Patient length of stay, hospital cost, physiologic values
- Evaluation: Mean Squared Error (MSE), Root Mean Squared Error (RMSE), R-squared
- Healthcare use: Predicting 30-day readmission costs, length of stay, time to clinical event

**Classification:** Predicting categorical outcomes (classes)
- Binary classification: Show/No-Show, Sepsis/No Sepsis, Adverse Event/Normal
- Multi-class classification: Disease severity (mild/moderate/severe), triage level
- Evaluation: Precision, Recall, F1-score, ROC-AUC, Confusion Matrix
- Healthcare use: Disease diagnosis, treatment response prediction, risk stratification

### 2.2 Linear Regression: The Foundation

**Concept:** Find a linear relationship y = Wx + b that minimizes Mean Squared Error (MSE)

**Mathematical Formulation:**
- W = weights (feature coefficients)
- b = bias (intercept)
- MSE = mean of squared differences between predictions and actual values
- Training finds W and b that minimize MSE through optimization

**Advantages:**
- Fully interpretable: each coefficient directly tells impact of a feature
- Fast training and inference
- Provides statistical significance testing (p-values)
- Serves as strong baseline for comparison

**Limitations:**
- Assumes linear relationships; may underfit complex patterns
- Sensitive to outliers
- Limited ability to capture feature interactions without manual engineering

**Healthcare Applications:**
- Predicting length of stay based on admission characteristics
- Forecasting patient resource utilization
- Estimating cost impact of interventions
- Linear relationship assumption often violated in patient outcomes

**For Cortex CDSS:**
Linear models work well as interpretable baselines but should be augmented with non-linear methods for complex clinical predictions.

### 2.3 Logistic Regression: Classification Workhorse

**Concept:** Extends linear regression to classification by applying sigmoid function to produce probability between 0 and 1

**Mathematical Formulation:**
```
Probability = sigmoid(Wx + b) = 1 / (1 + e^(-Wx-b))
```

**Key Properties:**
- Output: probability between 0-1 that sample belongs to positive class
- Threshold (typically 0.5): Predicted class = 1 if probability > threshold, else 0
- Interpretable: coefficients show magnitude and direction of feature impact
- Fast: suitable for real-time clinical decision support

**Advantages:**
- Interpretability: Clear feature impact for clinician explanation
- Probabilistic output: Quantifies confidence, useful for risk stratification
- Computational efficiency: Linear complexity, suitable for production deployment
- Statistical foundation: Classical statistical inference available

**Limitations:**
- Assumes linear decision boundary; misses non-linear patterns
- Less accurate than ensemble methods on complex data
- Can struggle with imbalanced data (e.g., rare diseases)

**Healthcare Applications:**
- ICU readmission prediction (binary: readmit/no readmit)
- Sepsis risk stratification (binary: high-risk/low-risk)
- Surgical complication prediction
- Appointment no-show prediction (example: Cortex Group 5 project)

**Group 5 Operating Room No-Show Case Study:**
Nico's group used logistic regression as their interpretable baseline model for predicting surgical no-shows, achieving high transparency in patient engagement targeting. Key findings:
- Booking lead time was highly predictive: longer lead time → higher no-show risk
- Prior no-show history was strong indicator
- Insurance type and demographics influenced no-show patterns
- Model coefficients directly translated to policy changes in patient outreach

**For Cortex CDSS:**
Logistic regression is recommended as the first deployment model for new clinical prediction tasks. It provides clinicians interpretable explanations for each risk prediction, building trust and adoption.

### 2.4 Decision Trees: Non-Linear Pattern Discovery

**Concept:** Build a tree of yes/no rules that recursively split data to maximize information gain

**How Trees Work:**
1. Start with all data at root node
2. Find feature and threshold that best separates positive/negative cases (using information gain)
3. Recursively apply to each subset until leaves are pure or stopping criteria met
4. Prediction: majority class (or average) in leaf node

**Advantages:**
- Fully interpretable: clear decision path for any prediction
- Captures non-linear relationships automatically
- No feature scaling needed
- Robust to outliers and irrelevant features
- Produces feature importance rankings

**Limitations:**
- Single trees prone to overfitting ("memorizing" training data)
- Greedy algorithm may find suboptimal splits
- Unstable: small data changes can dramatically change tree structure
- Typically lower accuracy than ensemble methods

**Healthcare Applications:**
- Clinical decision rules (formalized as trees)
- Triage algorithms
- Treatment pathway selection
- Patient stratification by multiple complex factors

**Cortex Titanic Example:** Decision trees were illustrated using Titanic passenger survival prediction (Nico's notes). Key insight: trees make non-linear relationships explicit. In healthcare, a tree might show: "If Age < 18 AND ChestPain = Atypical THEN Pediatric Pathway," capturing interaction effects clinicians recognize.

### 2.5 Ensemble Methods: Combining Weak Learners

**Random Forests:** Collection of independent trees, each trained on random data subset (bagging)

**How Random Forests Work:**
1. Create B random samples from training data (bootstrap samples)
2. Train separate decision tree on each sample
3. For prediction: average predictions from all trees (regression) or majority vote (classification)

**Advantages:**
- Dramatically reduces overfitting compared to single trees
- Captures complex non-linear patterns
- Provides feature importance scores
- Robust and practical for structured data
- Less tuning required than some methods

**Limitations:**
- Less interpretable than single trees
- Still cannot explain individual predictions easily
- Slower inference than linear models
- "Black box" for clinicians unless feature importance examined

**Use Cases:**
- When accuracy is paramount and interpretability is secondary
- Complex healthcare datasets with many features
- Tabular clinical data from EHRs

### 2.6 Gradient Boosting Machines (GBMs): Maximum Accuracy

**Concept:** Build trees sequentially, each correcting errors of previous trees (boosting)

**How GBMs Work:**
1. Train first tree on all data, computing residuals (errors)
2. Train second tree to predict residuals from first tree
3. Add prediction from new tree (scaled by learning rate) to ensemble
4. Repeat until residuals minimized or max iterations reached
5. Final prediction: sum of all tree predictions

**XGBoost:** Optimized GBM implementation, industry standard

**Advantages:**
- Highest predictive accuracy for tabular data
- Captures complex feature interactions
- Feature importance ranking available
- Fast inference despite ensemble structure
- Robust to outliers

**Limitations:**
- "Black box" nature makes clinician explanation difficult
- Risk of overfitting if not carefully regularized
- Requires tuning multiple hyperparameters
- Slow training on large datasets

**Healthcare Applications:**
- Complex disease prediction (e.g., readmission incorporating 50+ clinical features)
- Treatment outcome modeling
- Sepsis early warning systems
- Adverse event prediction

**For Cortex CDSS:**
Gradient boosting recommended as the high-accuracy production model, complementing the interpretable logistic regression baseline. The dual-model approach (Nico's recommendation from Group 5):

**Dual-Model Strategy:**
1. **Logistic Regression Model:** Deployed for explainability and clinician understanding
2. **Gradient Boosting Model:** Actual prediction engine, higher accuracy for alerts

This allows clinicians to understand decision logic while maintaining superior predictive performance.

### 2.7 Support Vector Machines (SVMs)

**Concept:** Find the hyperplane that maximally separates positive and negative cases with maximum margin

**Key Features:**
- Linear and non-linear (kernel) variants
- Maximizes margin between classes
- Effective with high-dimensional data
- Produces probabilistic output with calibration

**Advantages:**
- Theoretically well-founded
- Good generalization performance
- Handles high-dimensional data
- Versatile kernels for different data types

**Limitations:**
- Interpretability challenging
- Slower training on large datasets (O(n²) or O(n³))
- Requires careful feature scaling
- Less practical than GBMs for most business applications

**Healthcare Applications:**
- Medical image classification (especially with kernel methods)
- Gene expression analysis
- Time series classification for physiologic signals

---

## Part 3: Unsupervised Learning

Unsupervised learning finds hidden structures in data without labeled outcomes.

### 3.1 Clustering: Patient Segmentation

**K-Means Clustering:**
- Partition data into K clusters minimizing within-cluster variance
- Iterative: assign points to nearest centroid, update centroids
- Fast but requires specifying K in advance

**Applications:**
- Patient phenotyping: Identify distinct patient subtypes from EHR data
- Risk stratification: Group patients by predicted risk level
- Personalized medicine: Find patient subgroups with different treatment responses

**Hierarchical Clustering:**
- Build tree of nested clusters (dendrogram)
- Flexible: choose cluster granularity post-hoc
- Interpretable structure

**DBSCAN:**
- Density-based clustering (no need to specify cluster count)
- Identifies clusters of arbitrary shape
- Finds outliers/anomalies automatically

**Healthcare Example:**
Using K-means to identify distinct heart failure phenotypes in a patient population, revealing that "typical" heart failure may have 3-4 distinct subtypes requiring different management strategies.

### 3.2 Dimensionality Reduction

**Problem:** Healthcare data often has many features (100+), causing:
- Overfitting risk
- Computational burden
- Difficulty visualizing patterns
- "Curse of dimensionality"

**Principal Component Analysis (PCA):**
- Find new features (principal components) that capture maximum variance
- Rotate data into space where features are uncorrelated
- Typically reduces dimensions while retaining 90%+ variance

**t-SNE:**
- Non-linear dimensionality reduction
- Preserves local structure (nearby points stay nearby)
- Excellent for visualization
- Not suitable for downstream prediction (non-linear)

**Applications:**
- Visualizing high-dimensional patient data
- Feature compression for interpretation
- Preprocessing to reduce model complexity

### 3.3 Anomaly Detection

**Problem:** Detecting unusual/abnormal patient states or data quality issues

**Methods:**
- Isolation Forests: Isolate outliers by random partitioning
- One-Class SVM: Learn boundary around normal data
- Autoencoders: Neural networks that compress/reconstruct, flag high reconstruction error

**Healthcare Applications:**
- Detecting data entry errors in EHR
- Identifying unusual vital sign patterns (potential clinical deterioration)
- Fraud detection in healthcare claims
- Equipment malfunction detection in clinical devices

---

## Part 4: Model Evaluation Mastery

Evaluation metrics are critical for healthcare ML. Different clinical contexts require different optimization targets.

### 4.1 The Confusion Matrix: Foundational Metrics

For binary classification, four outcome types:

| | Predicted Positive | Predicted Negative |
|---|---|---|
| **Actually Positive** | True Positive (TP) | False Negative (FN) |
| **Actually Negative** | False Positive (FP) | True Negative (TN) |

**Healthcare Interpretation:**
- TP: Correctly identified at-risk patient → appropriate intervention
- FN: Missed at-risk patient → patient deteriorates (DANGEROUS)
- FP: Over-flagged low-risk patient → unnecessary intervention (inefficient)
- TN: Correctly cleared low-risk patient

### 4.2 Key Classification Metrics

**Accuracy:** (TP + TN) / (TP + FP + FN + TN)
- Overall fraction correct
- Misleading if data imbalanced (e.g., 99% negative class)
- Not recommended as sole metric for healthcare

**Precision:** TP / (TP + FP)
- Of patients flagged as positive, what fraction actually are?
- High precision: minimize false alarms
- Critical when intervention is costly/risky

**Recall (Sensitivity):** TP / (TP + FN)
- Of actual positive cases, what fraction did we identify?
- High recall: minimize missed cases
- CRITICAL in healthcare: missing a sepsis case is worse than false alarm

**Specificity:** TN / (TN + FP)
- Of actual negative cases, what fraction did we correctly identify?
- Complement of false positive rate

**F1-Score:** 2 * (Precision * Recall) / (Precision + Recall)
- Harmonic mean of precision and recall
- Useful when precision-recall tradeoff needed

### 4.3 Precision-Recall Tradeoff

A fundamental tradeoff exists: improving precision typically decreases recall and vice versa. Controlled by **classification threshold**.

**Example: Sepsis Prediction Model**

| Threshold | Precision | Recall | Interpretation |
|---|---|---|---|
| 0.9 (conservative) | 95% | 40% | Most flagged cases are true sepsis, but miss 60% |
| 0.5 (balanced) | 80% | 75% | Reasonable balance |
| 0.1 (aggressive) | 60% | 95% | Catch nearly all sepsis, but many false alarms |

**Clinical Decision:** Must depend on:
- Severity of missing positives (sepsis = life-threatening → high recall)
- Cost of false positives (ICU admission = resource intensive → high precision)
- Provider tolerance for alerts (alert fatigue → push toward precision)

**For Cortex CDSS:** Operating room no-shows example showed importance of choosing threshold based on business logic. False negatives (missing a likely no-show) cost revenue. False positives cost ineffective outreach. Nico's group optimized for recall to capture risky patients.

### 4.4 ROC Curve and AUC

**ROC (Receiver Operating Curve):**
- X-axis: False Positive Rate (1 - Specificity)
- Y-axis: True Positive Rate (Recall)
- Line plots all precision-recall tradeoffs as threshold varies
- Perfect model: curve goes to (0,1) corner

**AUC (Area Under Curve):**
- Summarizes ROC curve as single number (0 to 1)
- AUC = 0.5: Random guessing
- AUC = 1.0: Perfect classification
- AUC = 0.9+: Excellent discrimination
- AUC = 0.8-0.9: Good discrimination
- AUC = 0.7-0.8: Acceptable for screening

**Interpretation:**
- AUC represents probability that model ranks random positive case higher than random negative case
- Threshold-independent measure of separability

**For Cortex:** Minimum AUC targets should be set based on clinical context. Diagnostic models may require AUC > 0.85 for FDA approval. Screening models might accept AUC > 0.75.

### 4.5 Cross-Validation: Honest Performance Estimation

**Problem:** Testing on the same data used for training gives overly optimistic results

**Solution: K-Fold Cross-Validation**
1. Divide data into K folds (typically K=5 or K=10)
2. For each fold i:
   - Train model on other K-1 folds
   - Evaluate on fold i
3. Report mean ± std of K performance estimates

**Advantages:**
- Uses all data for both training and evaluation
- Reduces variance in performance estimate
- Detects overfitting (train-test gap indicates problem)

**Stratified K-Fold:** For imbalanced data (e.g., rare disease), preserve class distribution in each fold

**Time Series Considerations:** For temporal data (patient trajectories), must use temporal cross-validation (train on past, test on future), not random folds

### 4.6 Train/Validation/Test Split: The Three-Way Split

**Correct Data Usage:**

```
Raw Data
   ↓
[Preprocessing applied consistently]
   ↓
Training Set (60%)  → Feature engineering, parameter selection
Validation Set (20%) → Hyperparameter tuning, model selection
Test Set (20%)      → Final, single unbiased evaluation
```

**Critical Rule:** Never touch test set during development
- Test set sees model and data processing only once
- Provides true out-of-sample performance estimate
- Prevents data leakage and overfitting

**Hyperparameters vs. Parameters:**
- Parameters: Learned during training (e.g., logistic regression coefficients)
- Hyperparameters: Set before training (e.g., learning rate, tree depth, number of boosting rounds)

**Validation set used to:** Select best hyperparameter values
**Test set used to:** Report final performance

### 4.7 Overfitting and Underfitting

**Overfitting:** Model memorizes training data noise, fails on new data
- Train error: very low
- Test error: much higher
- Causes: Model too complex, too much training time, not enough regularization

**Underfitting:** Model too simple to capture real patterns
- Train error: high
- Test error: similarly high
- Causes: Model too simple, insufficient training, wrong algorithm

**Diagnostic Approach:**
- If train and test error both high → UNDERFITTING (increase model complexity)
- If train error low but test error high → OVERFITTING (reduce model complexity, add regularization)
- If train and test error both low → GOOD FIT

**Solutions for Overfitting:**
- Reduce model complexity (shallower trees, fewer boosting rounds)
- Regularization (L1/L2 penalties for linear models)
- More training data
- Early stopping (for iterative methods)
- Cross-validation to detect problem early

---

## Part 5: Healthcare ML Applications

### 5.1 Clinical Risk Stratification

**Goal:** Identify high-risk patients for targeted intervention

**Common Targets:**
- 30-day readmission (rehospitalization)
- Sepsis development in hospital
- Cardiac adverse events
- Surgical complications
- Patient deterioration (NEWS score prediction)

**Approach:**
1. Define outcome clearly (readmitted yes/no within 30 days)
2. Collect features from EHR (demographics, comorbidities, prior admissions, lab values)
3. Train classification model
4. Validate on held-out patients
5. Deploy with threshold optimized for clinical workflow

**Key Challenge:** Class imbalance (e.g., 5% of patients readmitted)
- Solutions: Adjust classification threshold, use class weights, SMOTE oversampling

### 5.2 Sepsis Early Warning Systems

**Clinical Context:** Sepsis requires rapid recognition and treatment. 6-hour "golden window" critical for outcomes

**ML Approach:**
- Input: Vital signs, lab values, clinical notes (EHR time series)
- Output: Probability of sepsis within next 2-4 hours
- Evaluation: Maximize recall (catch cases early) while minimizing false alarms (alert fatigue)

**Data Challenges:**
- Vital signs measured at irregular intervals
- Missing data common
- Labels often delayed (clinician manually documents sepsis)

**Models Used:**
- Gradient boosting on engineered features (current standard)
- RNNs/LSTMs on raw time series (research phase)
- Deep learning on multimodal data (images + time series)

**For Cortex:** Sepsis prediction highly relevant for Brazilian hospitals. Early warning system could dramatically improve outcomes in resource-constrained settings.

### 5.3 Appointment No-Show Prediction

**Business Context:** No-shows waste clinical resources and disrupt patient care

**Cortex Group 5 Project (Nico's Work):**

**Problem Definition:**
- Surgical appointment no-shows cost hospital system millions annually
- Lost revenue from unfilled OR blocks
- Inefficient resource allocation

**Data & Features:**
- Booking lead time (days from booking to appointment)
- Prior no-show rate
- Insurance type
- Patient demographics
- Appointment characteristics (day of week, appointment type)

**Modeling Approach:**
1. Logistic Regression: Establish interpretable baseline
2. Gradient Boosting (XGBoost): High-accuracy prediction engine

**Key Findings:**
- Longer booking lead time → higher no-show risk (counter-intuitive but data-driven)
- Prior no-show history: strong predictor (patient behavior patterns)
- Day-of-week effects: Mondays more no-shows
- Insurance status: Medicaid patients higher no-show rates

**Deployment Strategy:**
- Dual-model approach: Explain with logistic regression, predict with XGBoost
- Optimize for recall: Better to over-predict no-shows (some unnecessary outreach) than miss them
- Threshold tuning: Set classification threshold to maximize revenue capture

**Business Impact:**
- 25-40% reduction in no-show rate estimated
- Recaptured revenue from filled slots
- Improved patient access through better scheduling
- Data-driven policy changes (e.g., timing of confirmatory calls)

### 5.4 Length of Stay Prediction

**Goal:** Predict how long patient will remain hospitalized

**Applications:**
- Resource planning (bed management, staffing)
- Early discharge planning (identify patients ready for discharge)
- High-risk patient identification (if LOS > 14 days, increased complications risk)

**Modeling:**
- Regression task (continuous outcome)
- Input: admission characteristics, diagnoses, comorbidities, initial labs
- Early prediction: use only first 24-48 hours in hospital

**Challenges:**
- Right-censored data: Some patients still hospitalized at observation end
- Outcome evolves over time
- Clinical intervention decisions influence LOS

### 5.5 Medical Image Analysis

**Domains:**
- Radiology: Chest X-ray interpretation, CT scan analysis
- Pathology: Histopathology slide analysis
- Dermatology: Skin lesion classification

**Approaches:**
- Convolutional Neural Networks (CNNs): Extract features from images
- Transfer Learning: Pre-trained models (ImageNet) adapted to medical domain
- Ensemble: Combine radiologist + ML predictions

**Regulatory Considerations:**
- FDA 510(k) pathway for diagnostic devices
- Clinical validation required on diverse patient populations
- Bias assessment across demographics

**For Cortex:** Image analysis likely secondary priority compared to EHR-based CDSS, but valuable for radiology/pathology integration.

### 5.6 Clinical NLP: Extracting Signals from Notes

**Challenge:** 30-50% of clinical data locked in unstructured physician notes

**Applications:**
- Phenotyping: Identify patients with specific conditions from note text
- Outcome prediction: Notes often contain clinical judgments predictive of outcomes
- Quality measurement: Extract required data for compliance/quality reporting

**NLP Pipeline:**
1. Tokenization: Break text into words/sentences
2. Named Entity Recognition: Identify medical concepts (drugs, diagnoses, procedures)
3. Relation Extraction: Link concepts ("patient started diabetes medication")
4. Feature engineering: Convert to structured features for ML
5. Classification/Prediction: Standard ML model

**Challenges:**
- Clinical abbreviations and spelling variations
- Negation handling ("no shortness of breath")
- HIPAA compliance (de-identification required)

---

## Part 6: ML for Clinical Decision Support Systems

### 6.1 CDSS Architecture

**Traditional Rule-Based CDSS:**
- If-then rules programmed by clinical experts
- Example: "If BNP > 100 AND systolic BP < 90, then recommend IV fluids"
- Advantages: Interpretable, auditable, explicit clinical logic
- Disadvantages: Brittle, doesn't learn, labor-intensive to maintain

**ML-Enhanced CDSS:**
- Rules learned from data, discovered through algorithms
- Example: Model learns that combination of 12 lab values predicts sepsis
- Advantages: Captures complex patterns, learns from data, adapts
- Disadvantages: Less immediately interpretable, requires validation

**Hybrid Approach (Recommended for Cortex):**
- Combine rule-based logic (for obvious cases) with ML predictions
- Use ML for edge cases and complex pattern recognition
- Fall-back to clinical judgment when model uncertain

### 6.2 Alert Thresholding in Clinical Context

**Key Challenge:** Too many alerts causes "alert fatigue" → clinicians ignore all alerts

**Optimization Goal:** Maximize true positives (caught adverse events) while minimizing false positives (alert fatigue)

**Threshold Selection Process:**
1. Measure baseline alert fatigue tolerance (e.g., max 2 alerts per patient per day)
2. Adjust model threshold to hit this rate
3. Measure positive predictive value (% alerts that are true positives)
4. If PPV too low, either improve model or adjust workflow

**Example: ICU Sepsis Alert System**
- Model produces sepsis probability for each patient each hour
- Hospital can tolerate ~5% false positive rate in ICU (already high alert environment)
- Set threshold to 30% (instead of default 50%) to achieve higher sensitivity
- Trade: More false alarms, but fewer missed cases

### 6.3 Drug-Drug Interaction Prediction

**Problem:** EHR systems have rule-based DDI checkers, but:
- Many genuine interactions missed (low sensitivity)
- Many false alarms for interactions that don't matter clinically (low precision)
- Can't learn patterns from clinical data

**ML Approach:**
- Input: Pair of drugs, patient characteristics, lab values
- Output: Probability of adverse interaction
- Training data: Historical cases where interaction did/didn't occur

**Applications:**
- Real-time alert when prescribing second drug
- Rank-order risks to clinician
- Account for patient factors (renal function, age, liver disease)

### 6.4 Clinical Decision Rules vs. ML Models

**Clinical Decision Rule Example:** APACHE score for ICU mortality
- Fixed formula: points assigned based on vital signs, labs, age
- No learning or adaptation
- Interpretable: clinicians understand calculation

**ML Model Equivalent:**
- Learns weights for same inputs from data
- Adapts as new data accumulates
- May capture non-linear relationships

**Which to Choose?**

| Factor | CDR | ML |
|---|---|---|
| Interpretability | Excellent | Good with feature importance |
| Validation | Requires separate study | Cross-validation + test set |
| Accuracy | Fixed | Improves with more data |
| Maintenance | Manual updates required | Automatic retraining |
| Clinical acceptance | High | Lower until proven |
| Regulatory path | Well-established | Evolving (FDA guidance) |

**Recommendation for Cortex:**
- Start with formalizing existing clinical rules as ML baseline
- Compare against data-driven ML approach
- Deploy better-performing approach
- Maintain interpretability via feature importance and SHAP values

---

## Part 7: Model Deployment & MLOps for Healthcare

### 7.1 Train-Serve Skew

**Problem:** Model performs well in development, fails in production

**Causes:**
- Data preprocessing different in training vs. serving
- Different data sources (training on historical data, serving on real-time data)
- Code bugs in production pipeline
- Feature engineering not replicated

**Example:** Sepsis model trained on data from 2023, deployed in 2024, where lab testing procedures changed
- Threshold values shifted
- Missing data patterns different
- Model performance degrades

**Prevention:**
- Version control data preprocessing code
- Unit tests for data pipeline
- Monitor input feature distributions
- Regular model retraining

### 7.2 Data Drift and Model Monitoring

**Concept:** Patient populations change over time

**Types of Drift:**
- **Feature drift:** Input distributions shift (e.g., new patient demographic)
- **Label drift:** Output distribution changes (e.g., sepsis rate increases seasonally)
- **Covariate shift:** Relationship between features and outcome changes (e.g., new treatment guideline adopted)

**Monitoring Approach:**
1. Track feature distributions (compare to training distribution)
2. Track model predictions (should remain relatively constant if data hasn't changed)
3. Compare model predictions to clinical outcomes (retraining trigger)
4. Alert when AUC degrades below threshold

**Retraining Triggers:**
- Automated: Monthly retraining with recent data
- Event-based: New treatment protocol, patient population change
- Performance-based: AUC drops below 0.80

### 7.3 A/B Testing in Clinical Settings

**Goal:** Test new ML model against current standard before full deployment

**Standard A/B Test:**
- Randomize patients to receive recommendations from Model A (current) vs Model B (new)
- Measure clinical outcomes (e.g., readmission rate, adverse events)
- If Model B significantly better → full deployment

**Ethical Considerations in Healthcare:**
- Cannot randomize to "worse" condition
- Requires IRB approval
- Might consider cluster randomization (by hospital unit) instead of individual randomization

**Alternative: Shadow Deployment**
- Run new model on all patients but don't use recommendations
- Compare predictions to clinical outcomes
- Builds evidence for deployment without affecting patient care

### 7.4 Model Versioning and Governance

**Essential Infrastructure:**
- Version control: Track model coefficients, training data, hyperparameters
- Metadata: Document model purpose, performance metrics, approval status
- Audit trail: Who trained model, when, on what data

**Approval Workflow:**
1. Data Scientist: Train and validate model
2. Clinical Validation: Test on independent dataset, compare to current standard
3. Compliance Review: Check HIPAA, ANVISA requirements
4. Clinical Leadership: Approve for deployment
5. Operations: Deploy with monitoring

---

## Part 8: Explainability and Trust (XAI)

### 8.1 Why Explainability Matters in Healthcare

Clinical context requires explainability:
- Clinicians need to understand recommendations to adopt them
- Patients have right to understand clinical decisions affecting them
- Regulatory requirement (ANVISA, FDA) for some applications
- Identifying bias requires understanding what model learned

### 8.2 Feature Importance

**Permutation Feature Importance:**
- Randomly shuffle each feature, measure performance drop
- Features that damage performance when shuffled are important
- Model-agnostic: works with any model

**Coefficient-Based (Linear Models):**
- Logistic regression: coefficients directly show impact
- Positive coefficient: feature associated with positive class
- Magnitude: size of effect

**Tree-Based Feature Importance:**
- GBM: features ranked by contribution across all trees
- Random Forests: average importance across trees

**Limitation:** Shows which features matter, not how they matter

### 8.3 SHAP (SHapley Additive exPlanations) Values

**Concept:** Game theory approach to explain predictions
- For each prediction, calculate contribution of each feature
- Based on Shapley values: average marginal contribution across all possible feature coalitions

**Output:**
- For a specific patient prediction, show which features pushed probability up vs down
- Quantify magnitude of each feature's contribution

**Example: Sepsis Model**
```
Patient X, Predicted Sepsis Probability = 72%

Features pushing UP (toward sepsis):
  - WBC count (19,000): +15%
  - Lactate (3.2): +12%
  - Temperature (39.2°C): +8%

Features pushing DOWN (toward healthy):
  - SpO2 (96%): -2%
  - BP (128/72): -1%

Base rate: 37% + contributions = 72%
```

**Advantages:**
- Locally interpretable: explains each prediction
- Consistent: accounts for all features
- Theoretically grounded

**Disadvantages:**
- Computationally expensive for large models
- Still requires interpretation by clinician
- Can be over-complex for high-dimensional data

### 8.4 LIME (Local Interpretable Model-agnostic Explanations)

**Approach:** Approximate complex model locally with simple interpretable model

**For a specific prediction:**
1. Perturb input features randomly
2. Get model predictions on perturbed data
3. Fit simple linear model to explain relationship
4. Report linear model coefficients

**Advantages:**
- Fast computation
- Works with any model
- Intuitive linear explanations

**Disadvantages:**
- Local approximation may not capture true model behavior
- Explanations can be unstable

### 8.5 Clinical Workflow Integration

**Design Principle:** Make explainability part of interface, not afterthought

**Example Interface:**

```
SEPSIS ALERT - Probability: 72%

Risk Factors (push toward sepsis):
  [1] Elevated WBC: 19,000 [normal < 11,000]
  [2] High lactate: 3.2 [normal < 2.0]
  [3] Fever: 39.2°C [normal < 37.5°C]

Protective Factors (push toward healthy):
  [1] Normal oxygen: SpO2 96%
  [2] Stable BP: 128/72

Clinical Note: Model flagged this patient based on classic sepsis
presentation (fever + elevated lactate + high WBC). Recommend
immediate assessment for infection source.

Next Review: If lactate trends down and WBC stable, risk drops.
```

---

## Part 9: Bias, Fairness, and Equity in Healthcare ML

### 9.1 Sources of Bias in Healthcare ML

**Training Data Bias:**
- Historical data reflects past discrimination (e.g., women undertreated for cardiac symptoms)
- Model learns and perpetuates these biases
- Underrepresented groups underdiagnosed

**Example:** Sepsis model trained on hospital data where sepsis more aggressively treated in affluent neighborhoods → model learns to predict sepsis less in poor neighborhoods

**Feature Bias:**
- Using protected characteristics directly (race, gender): Illegal and unethical
- Using proxy variables: Zip code (proxy for race), BMI (proxy for socioeconomic status)
- Structural features: Insurance type correlates with race and wealth

**Label Bias:**
- Outcome labels biased (if treatment recommendations biased, outcomes will be)
- Example: ICU admission likelihood in training data reflects clinician bias, not actual need

**Measurement Bias:**
- Different populations measured differently
- Example: Troponin levels measured more frequently in some populations → more diagnoses

### 9.2 Fairness Definitions

**Demographic Parity:**
- Model performs equally across demographic groups
- Example: Sepsis model has 75% sensitivity in Black patients and 75% in White patients
- Problem: May require unequal thresholds (some see as unfair)

**Equalized Odds:**
- False positive rate and false negative rate equal across groups
- Fairer in practice: don't over-alert one group, under-alert another

**Calibration:**
- When model predicts 70% probability for a case, ~70% of similar cases actually positive
- Check calibration separately for each demographic group
- If model says 70% for Black patients but only 50% actually positive → biased

### 9.3 Bias Detection and Mitigation

**Detection:**
1. Disaggregate performance metrics by demographic group
2. Look for large disparities (e.g., 80% sensitivity White vs. 60% Black)
3. Check calibration curves separately by group
4. Examine feature importance differences by group

**Mitigation:**
1. **Data augmentation:** Collect more data from underrepresented groups
2. **Reweighting:** Up-weight minority group examples during training
3. **Threshold adjustment:** Different thresholds for different groups (controversial)
4. **Algorithmic fairness:** Add fairness constraints to loss function

### 9.4 Brazilian Healthcare Context

**Relevant Disparities:**
- Access disparities (urban vs. rural, private vs. public healthcare)
- Ethnic disparities (Black and Indigenous populations: worse outcomes)
- Socioeconomic disparities (wealth-health gradient)
- Regional disparities (Northeast vs. Southeast)

**For Cortex:** Must:
1. Validate models on diverse patient populations across Brazil
2. Identify if model performs differently in rural vs. urban settings
3. Assess for racial/ethnic bias in predictions
4. Design equitable deployment (don't concentrate in affluent regions)

**ANVISA Requirements:** Likely to require demographic stratification in clinical validation studies

---

## Part 10: Advanced Topics

### 10.1 Neural Networks and Deep Learning

**Concept:** Layered networks of simple mathematical units, inspired by neurobiology

**Architecture:**
- Input layer: Features from data
- Hidden layers: Learn hierarchical feature representations
- Output layer: Final prediction

**Advantages:**
- Learns hierarchical representations automatically
- Excellent for images, text, sequences
- Flexible: adapt to many problem types

**Limitations:**
- Black box: hard to interpret
- Requires large amounts of data
- Computationally expensive to train
- Prone to overfitting if not regularized

**Healthcare Applications:**
- Image classification (X-rays, CT scans)
- ECG/EEG time series analysis
- Clinical NLP on unstructured text
- Multi-modal learning (images + text + structured data)

### 10.2 Recurrent Neural Networks (RNNs) and LSTMs

**Problem:** Sequential healthcare data (vital signs over time) has dependencies

**RNN Approach:**
- Process sequence one step at a time
- Hidden state carries information from previous steps
- Can capture temporal patterns

**LSTM (Long Short-Term Memory):**
- Improved RNN architecture
- Addresses vanishing gradient problem
- Better at learning long-term dependencies

**Healthcare Applications:**
- ICU patient deterioration prediction from vital signs
- Sepsis onset prediction from streaming lab values
- Patient trajectory modeling

**Challenges:**
- Irregular sampling: Vital signs not measured at fixed intervals
- Data engineering: Converting EHR to time series format
- Interpretability: Black box outputs

### 10.3 Ensemble Methods Beyond Random Forests

**Stacking:**
- Train multiple diverse base models
- Train meta-model to combine their predictions
- Example: Combine logistic regression + SVM + gradient boosting

**Blending:**
- Simpler than stacking
- Train models on training data, combine on validation set

**Advantages:**
- Can combine different model types
- Often outperforms individual models

**Disadvantage:**
- More complex training pipeline

### 10.4 Reinforcement Learning in Healthcare

**Concept:** Algorithm learns policy (sequence of actions) by trial and error

**Example:** Ventilator management policy
- State: Current patient vitals, settings
- Action: Adjust FiO2, PEEP, rate
- Reward: Positive reward for extubation success, negative for complications

**Challenges:**
- Requires careful reward engineering
- Offline setting: Can't experiment on real patients
- Temporal credit assignment: Which action caused which outcome?

**Current State:** Research stage, not production-ready for most clinical applications

---

## Part 11: The ML Development Lifecycle

### 11.1 The 15-Step Recipe

From Nico's Machine Learning Notes, the structured approach to building production ML systems:

**1. Specify the Problem**
- Define outcome clearly (e.g., "readmitted within 30 days: yes/no")
- Identify stakeholders and success criteria
- Determine if ML is the right approach (vs. rule-based logic or domain expertise)

**2. Collect the Data**
- Source historical data matching problem definition
- Ensure data completeness (missing data tolerance?)
- Plan data governance and HIPAA compliance

**3. Split the Data**
- Typical split: 60% train, 20% validation, 20% test
- Stratified split for imbalanced data
- Temporal split for time series data

**4. Understand and Explore the Data**
- Summary statistics (mean, std, min, max for each feature)
- Visualizations: distributions, correlations, missing patterns
- Identify outliers and anomalies
- Check for data quality issues

**5. Preprocess Data and Construct Features**
- Handle missing values (imputation, deletion, modeling)
- Encode categorical variables (one-hot encoding)
- Normalize/standardize numerical features
- Create domain-informed features (e.g., patient age group)
- Avoid data leakage (don't use information from future)

**6. Select a Machine Learning Approach**
- Match algorithm to problem type (classification, regression)
- Consider accuracy requirements, interpretability, speed tradeoffs
- Start simple (logistic regression, decision tree)

**7. Select Hyperparameters**
- Set learning rate, regularization strength, tree depth, etc.
- Use validation set to evaluate choices
- Document all hyperparameter choices

**8. Train the Model**
- Fit algorithm on training data
- Monitor training progress (loss function convergence)

**9. Evaluate on Validation Data**
- Compute relevant metrics (precision, recall, AUC, etc.)
- Check for overfitting (train-validation gap)
- Compute confidence intervals (via cross-validation)

**10. If Validation Performance Weak, Iterate**
- Diagnose problem: underfitting vs. overfitting
- Try different algorithm, collect more data, engineer better features
- Repeat steps 6-9

**11. Train Final Model**
- Once satisfied with validation performance
- Retrain on combined training + validation data
- This maximizes information used for final model

**12. Evaluate on Test Data**
- Single, unbiased evaluation on held-out data
- This is ground truth for model's future performance
- Do not iterate based on test results

**13. If Test Performance Weak, Get New Test Data**
- If you change model based on test results, it's no longer unbiased test set
- Collect new test data to properly evaluate
- Or accept model and understand its limitations

**14. Deploy the Model**
- Package model for production (containerization)
- Integrate with clinical workflows
- Set up monitoring and alerting
- Document usage and limitations

**15. Monitor the Model**
- Track model performance on new data
- Detect data drift and trigger retraining
- Maintain version control and audit trail
- Regular retraining cadence (monthly, quarterly)

---

## Part 12: Cortex Health ML Architecture Implications

### 12.1 CDSS Platform Architecture

**Cortex Boardroom Components:**

**Real-Time Alert Engine:**
- Input: Patient vital signs, labs, orders from EHR
- Models: Ensemble of logistic regression (explainability) + gradient boosting (accuracy)
- Output: Risk scores and alerts for clinician display
- Latency: <1 second for alerts to appear

**Decision Support Reasoning:**
- SHAP values explain to clinician why alert triggered
- Links to clinical evidence and guidelines
- Recommendations based on risk profile

**Integration Points:**
- EHR API: Pull patient data, validate data quality
- Hospital workflows: Integrate alerts into existing review processes
- Audit logs: Track all model predictions for compliance

### 12.2 Data Requirements

**Minimum for Model Training:**
- 1000+ examples per outcome class (more for rare outcomes)
- Temporal data: At least 1-2 years to capture seasonal variation
- Feature-complete: Each feature present in >80% of records
- Labeling: Clear ground truth labels (clinical diagnoses, outcomes)

**For Cortex Launch:**
- Partner hospitals: Minimum 3-5 to provide diverse patient populations
- Outcome: Start with common predictions (e.g., readmission) before rare events
- Timeline: 6 months data collection before first model training

### 12.3 Regulatory Strategy

**ANVISA Pathway:**
- Software as Medical Device (SaMD) classification likely
- Clinical validation study required
- Post-market surveillance plan
- Labeling must specify performance, limitations, intended use

**Suggested Strategy:**
1. Develop models in partnership with pilot hospitals
2. Run clinical validation study (retrospective or prospective)
3. Submit to ANVISA with validation evidence
4. Gradual rollout across Brazil based on regulatory approval

### 12.4 Bias and Fairness in Cortex Context

**Brazilian-Specific Disparities to Address:**
- Geographic (rural vs. urban access)
- Ethnic (explicit data on self-reported race)
- Socioeconomic (insurance status as proxy)
- Regional (different healthcare infrastructure)

**Validation Plan:**
- Stratify all performance metrics by region, ethnicity, insurance type
- Identify disparities in model accuracy
- If >5% difference in sensitivity by group → requires mitigation
- Continuous monitoring post-deployment

**Fairness Goals:**
- Equal sensitivity across ethnic/geographic groups (minimize missed cases)
- Equal specificity (minimize unnecessary alerts)
- Calibration across groups (predicted probabilities accurate for each group)

---

## Part 13: Key Takeaways for Cortex Leadership

### For ARCHIE (CTO):

1. **Model Selection:** Start with interpretable models (logistic regression), augment with gradient boosting. Dual-model approach provides explainability + accuracy.

2. **Data Infrastructure:** Invest in EHR data integration and quality. ML accuracy limited by data quality.

3. **MLOps:** Build monitoring and retraining infrastructure early. Data drift and model decay are production problems.

4. **Deployment:** Shadow deployment before full launch. Validate on Brazilian patient populations before commercialization.

### For ELENA (CMO/Clinical):

1. **Trust and Adoption:** Clinicians need to understand recommendations. Invest in explainability (SHAP values, feature importance).

2. **Clinical Validation:** Partner with leading hospitals for prospective validation studies. Regulatory approval path depends on evidence.

3. **Workflow Integration:** Alerts must fit into existing clinical workflows, not disrupt. Alert fatigue kills adoption.

4. **Equity:** Explicitly validate models across patient populations. Bias can harm underserved communities if not addressed.

### General:

1. **Value Over Accuracy:** A 75% AUC model that improves patient outcomes beats a 95% AUC model that clinicians ignore.

2. **Start Small:** Begin with one well-defined prediction task (e.g., readmission), validate thoroughly, then expand.

3. **Continuous Learning:** ML systems degrade over time. Plan for ongoing monitoring and retraining.

4. **Ethical Foundation:** Build bias detection and fairness monitoring into product from day one. Regulatory requirements will increase.

---

## Appendix A: Key Formulas

**Linear Regression:**
```
y = Wx + b
MSE = (1/n) * Σ(y_pred - y_actual)^2
```

**Logistic Regression:**
```
P(y=1|x) = 1 / (1 + e^(-Wx-b))
```

**Precision, Recall, F1:**
```
Precision = TP / (TP + FP)
Recall = TP / (TP + FN)
F1 = 2 * (Precision * Recall) / (Precision + Recall)
```

**Gradient Descent:**
```
W_new = W_old - learning_rate * gradient(Loss, W)
```

---

## Appendix B: Recommended Reading

**Textbooks:**
- "Machine Learning for Managers" by Paul Geertsema (course primary text)
- "Introduction to Machine Learning with Python" by Andreas Müller and Sarah Guido

**Healthcare-Specific:**
- FDA guidance on software as medical device
- ANVISA guidelines for AI/ML in healthcare

**Key Research:**
- SHAP paper: Lundberg & Lee (2017)
- Feature importance: Breiman (2001)

---

## Appendix C: Tools and Platforms

**ML Development:**
- Python (scikit-learn, XGBoost, pandas)
- R (caret, tidymodels)
- Jupyter notebooks for exploration

**Explainability:**
- SHAP (Python)
- LIME (Python)
- ELI5 (Python)

**Clinical Integration:**
- HL7 FHIR standards for EHR interoperability
- RESTful APIs for model serving
- Docker containerization for deployment

**Monitoring:**
- Prometheus for performance metrics
- Grafana for visualization
- ELK stack for log aggregation

---

**Document Version:** 2.0
**Last Updated:** March 2026
**Status:** Tier 2 Knowledge Base - Cortex Boardroom
**Audience:** ARCHIE (CTO), ELENA (CMO/Clinical), Cortex Health Technical Leadership

This comprehensive knowledge base synthesizes JHU MBA ML curriculum with healthcare-specific applications. Regular updates recommended as regulatory landscape evolves and new techniques emerge.
