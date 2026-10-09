# MMR catch-up — test scenarios

Six patient cases used to test schedule-aware classification of MMR
vaccination records. Each case lists the inputs (date of birth and full vaccination
history) and the expected classifier output (which doses are valid, which
are out of schedule and why, the resulting programme status, and the
eligible-from date for the next slot).

The scenarios are seeded into the prototype at
`lib/create-data.js` (search for `mmrSeedPatients`) and surfaced through
the catch-up session `mmr-catchup-y9y10-current`.

## Dates

All dates are relative, so the scenarios hold in any academic year. A
date of birth is a birthday and a year group in the current academic
year. A vaccination is an age at vaccination (months and days after
date of birth). Eligible from is date of birth plus months, or a dose
plus days. The seed writes the cohort for 2025/26 and shifts it by whole
years to the current academic year, so no age changes.

## Schedule rules (UK MMR)

- **Dose 1** valid from **age 12 months**
- **Dose 2** valid from **age 15 months** _and_ **at least 28 days after
  Dose 1**
- Maximum schedule length: **2 doses**. Any additional given dose is
  classified as `Additional dose`
- Only `Vaccinated` records are classified. Every other outcome,
  including Partially vaccinated and Already vaccinated, goes to the
  encounters table and never counts
- Status is Fully vaccinated only when no doses remain. While doses
  remain, status falls through to triage and consent as usual
- Doses are classified in chronological order (`administeredAt` ascending)
- A non-given record (Absent, Refused, Unwell, Contraindicated) is not
  counted toward the schedule and does not affect classification of later
  given records

### Out-of-schedule reasons (enum)

| Reason                        | Trigger                                                                     |
| ----------------------------- | --------------------------------------------------------------------------- |
| `BeforeAge12Months`           | Given dose where `administeredAt < dob + 12 months` and Dose 1 slot is open |
| `BeforeAge15Months`           | Given dose where `administeredAt < dob + 15 months` and Dose 2 slot is open |
| `LessThan28DaysAfterPrevious` | Given dose where `administeredAt - lastValidGiven.administeredAt < 28 days` |
| `ExtraDose`                   | Given dose arriving when both slots are already filled                      |

### Eligible-from for next slot

```
nextSlot = validDoses.length + 1
if nextSlot > 2:           # schedule complete
  eligibleFrom = null
else:
  minAge = dob + (12 months if nextSlot == 1 else 15 months)
  if lastValidGiven exists:
    eligibleFrom = max(minAge, lastValidGiven.administeredAt + 28 days)
  else:
    eligibleFrom = minAge
```

## Vaccine codes used

| SNOMED              | Brand       | Type                                      |
| ------------------- | ----------- | ----------------------------------------- |
| `13968211000001108` | M-M-RvaxPro | MMR                                       |
| `34925111000001104` | Priorix     | MMR                                       |
| `45480711000001107` | ProQuad     | MMRV (recorded against the MMR programme) |
| `39779611000001104` | MenQuadfi   | MenACWY                                   |
| `7374311000001101`  | Revaxis     | Td/IPV                                    |

---

## Case 1 — Alice Adams

Two valid doses. Dose 2 was recorded with an MMRV product (ProQuad), a
common data-entry error since MMRV is not on the UK schedule. The
classifier still counts it because the programme is MMR.

- **NHS number:** 9990000011
- **Date of birth:** 12 January, Year 9 in the current academic year

### Vaccination history

| #   | Age     | Vaccine           | Source                | Outcome    |
| --- | ------- | ----------------- | --------------------- | ---------- |
| 1   | 12m 14d | M-M-RvaxPro (MMR) | NHS Immunisations API | Vaccinated |
| 2   | 40m 10d | ProQuad (MMRV)    | NHS Immunisations API | Vaccinated |

### Expected classification

| #   | Status | Slot   | Reason |
| --- | ------ | ------ | ------ |
| 1   | Valid  | Dose 1 | –      |
| 2   | Valid  | Dose 2 | –      |

- **Programme status:** Fully vaccinated (2 valid doses, so 0 doses remaining)
- **Eligible from:** `null` (schedule complete)

---

## Case 2 — Bilal Begum

One valid Dose 1, two missed pre-school appointments at the GP, then
refused at the Y9 Doubles + MMR catch-up while parents waited on
consultant advice. Bilal still needs a second MMR dose.

- **NHS number:** 9990000029
- **Date of birth:** 3 March, Year 10 in the current academic year

### Vaccination history (MMR)

| #   | Age              | Vaccine     | Source                | Outcome         | Note                                                                                                                                                                                                                                               |
| --- | ---------------- | ----------- | --------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 12m 14d          | M-M-RvaxPro | NHS Immunisations API | Vaccinated      | –                                                                                                                                                                                                                                                  |
| 2   | 50m 0d           | M-M-RvaxPro | CHIS                  | Absent          | –                                                                                                                                                                                                                                                  |
| 3   | 57m 0d           | M-M-RvaxPro | CHIS                  | Absent          | –                                                                                                                                                                                                                                                  |
| 4   | 171m 9d (Year 9) | M-M-RvaxPro | Recorded in Mavis     | Consent refused | Parents asked their paediatric oncology consultant for advice given Bilal's treatment history before consenting. They had not heard back by the day of the session, so refused consent for now. To be revisited once consultant input is received. |

### Expected classification

| #   | Status      | Slot   | Reason                                   |
| --- | ----------- | ------ | ---------------------------------------- |
| 1   | Valid       | Dose 1 | –                                        |
| 2   | Not counted | –      | Outcome `Absent`, no dose given          |
| 3   | Not counted | –      | Outcome `Absent`, no dose given          |
| 4   | Not counted | –      | Outcome `Consent refused`, no dose given |

- **Programme status:** Needs triage (1 dose remaining; consent given for the catch-up session with a Yes health answer (immune system))
- **Eligible from:** date of birth + 15 months (later than dose 1 + 28 days; long past, so eligible now)
- **Doses remaining:** 1

### Other programme records

| Age      | Year | Programme | Vaccine    | Outcome         | Note                                                                                                                                                                                                                                               |
| -------- | ---- | --------- | ---------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 156m 10d | Y8   | HPV       | Gardasil 9 | Consent refused | Parents unsure whether the HPV vaccine was suitable for Bilal given his oncology history. Asked for more time to discuss with the consultant before consenting; consent not provided in time, so refused for this session.                         |
| 171m 9d  | Y9   | MenACWY   | MenQuadfi  | Consent refused | Parents asked their paediatric oncology consultant for advice given Bilal's treatment history before consenting. They had not heard back by the day of the session, so refused consent for now. To be revisited once consultant input is received. |
| 171m 9d  | Y9   | Td/IPV    | Revaxis    | Consent refused | Parents asked their paediatric oncology consultant for advice given Bilal's treatment history before consenting. They had not heard back by the day of the session, so refused consent for now. To be revisited once consultant input is received. |

---

## Case 3 — Chiamaka Chen

A dose was given at 11 months, before the 12-month minimum. The
classifier marks it out of schedule and the next given dose (at 50
months) becomes Dose 1.

- **NHS number:** 9990000037
- **Date of birth:** 28 November, Year 9 in the current academic year

### Vaccination history

| #   | Age    | Vaccine     | Source                | Outcome    |
| --- | ------ | ----------- | --------------------- | ---------- |
| 1   | 11m 0d | M-M-RvaxPro | NHS Immunisations API | Vaccinated |
| 2   | 50m 0d | M-M-RvaxPro | Recorded in Mavis     | Vaccinated |

### Expected classification

| #   | Status          | Slot   | Reason              |
| --- | --------------- | ------ | ------------------- |
| 1   | Out of schedule | –      | `BeforeAge12Months` |
| 2   | Valid           | Dose 1 | –                   |

- **Programme status:** Due vaccination (1 dose remaining; consent given for the catch-up session, no Yes health answers)
- **Eligible from:** dose 1 + 28 days (later than date of birth + 15 months)
- **Doses remaining:** 1

---

## Case 4 — Dmitri Dixit

A dose was given one day before the first birthday (11m 29d). The
classifier marks it out of schedule. The next given dose at 48m was
recorded as Dose 2 by the original clinician, but the classifier
promotes it to Dose 1 because Dose 1 is unfilled — so the patient
appears to still need a Dose 2.

The parent on the catch-up session has refused MMR with reason
"Already had both doses of the MMR vaccine". Mavis records this reply as
decision Already vaccinated, and consent status is Consent refused. The
parent reports 2 doses while the record holds 1 valid dose.

- **NHS number:** 9990000045
- **Date of birth:** 5 July, Year 9 in the current academic year

### Vaccination history

| #   | Age     | Vaccine     | Source                | Outcome    |
| --- | ------- | ----------- | --------------------- | ---------- |
| 1   | 11m 29d | M-M-RvaxPro | NHS Immunisations API | Vaccinated |
| 2   | 48m 14d | M-M-RvaxPro | NHS Immunisations API | Vaccinated |

### Expected classification

| #   | Status          | Slot   | Reason              |
| --- | --------------- | ------ | ------------------- |
| 1   | Out of schedule | –      | `BeforeAge12Months` |
| 2   | Valid           | Dose 1 | –                   |

- **Programme status:** Has a refusal (1 dose remaining; parent refused MMR for the catch-up session (Already had both doses of the MMR vaccine))
- **Eligible from:** dose 1 + 28 days (later than date of birth + 15 months)
- **Doses remaining:** 1

### Consent

| Date                | Decision | Refusal reason                            | Stored as          |
| ------------------- | -------- | ----------------------------------------- | ------------------ |
| 3 days before today | Refused  | Already had both doses of the MMR vaccine | Already vaccinated |

---

## Case 5 — Eshe Edwards

One clinical Dose 1 event recorded three times — the original GP record
plus two echo duplicates from other feeds, arriving days apart. The
classifier counts the earliest as Dose 1 and marks the duplicates as
out of schedule because they fall within the 28-day interval rule.

- **NHS number:** 9990000053
- **Date of birth:** 15 October, Year 10 in the current academic year

### Vaccination history

| #   | Age    | Vaccine     | Source                              | Outcome    |
| --- | ------ | ----------- | ----------------------------------- | ---------- |
| 1   | 13m 0d | M-M-RvaxPro | NHS Immunisations API (GP)          | Vaccinated |
| 2   | 13m 3d | M-M-RvaxPro | NHS Immunisations API (echo feed)   | Vaccinated |
| 3   | 13m 4d | M-M-RvaxPro | NHS Immunisations API (second echo) | Vaccinated |

### Expected classification

| #   | Status          | Slot   | Reason                        |
| --- | --------------- | ------ | ----------------------------- |
| 1   | Valid           | Dose 1 | –                             |
| 2   | Out of schedule | –      | `LessThan28DaysAfterPrevious` |
| 3   | Out of schedule | –      | `LessThan28DaysAfterPrevious` |

- **Programme status:** Due vaccination (1 dose remaining; consent given for the catch-up session, no Yes health answers)
- **Eligible from:** date of birth + 15 months (later than dose 1 + 28 days)
- **Doses remaining:** 1

---

## Case 6 — Farah Farooq

A single dose recorded with a `2P` sequence label by the source feed
(i.e. the originating system labelled it as the second/pre-school
dose), but no Dose 1 record arrived. The classifier slots it as Dose 1
per the schedule, so the source label and the schedule position
disagree.

- **NHS number:** 9990000061
- **Date of birth:** 15 March, Year 9 in the current academic year

### Vaccination history

| #   | Age    | Vaccine     | Source                | Outcome    | Sequence label |
| --- | ------ | ----------- | --------------------- | ---------- | -------------- |
| 1   | 48m 0d | M-M-RvaxPro | NHS Immunisations API | Vaccinated | `2P`           |

### Expected classification

| #   | Status | Slot   | Reason |
| --- | ------ | ------ | ------ |
| 1   | Valid  | Dose 1 | –      |

- **Programme status:** Due vaccination (1 dose remaining; consent given for the catch-up session, no Yes health answers)
- **Eligible from:** dose 1 + 28 days (later than date of birth + 15 months)
- **Doses remaining:** 1

---

## Cohort session

All six patients are tied to a single co-located session for the
catch-up scenario:

- **Session id:** `mmr-catchup-y9y10-current`
- **School:** Grace Academy Coventry (id `135335`)
- **Date:** 2 weeks after today, with the consent window opened 4 weeks before today
- **Year groups:** Y9 and Y10
- **Programmes:** MMR catch-up + Doubles (MenACWY + Td/IPV) co-located
- **Consents seeded:** consent given for every patient and programme,
  except Dmitri's MMR (Refused, "Already had both doses of the MMR vaccine"). Bilal's MMR
  consent answers Yes to the immune system question
