# MMR catch-up — test scenarios

Seven patient cases used to test schedule-aware classification of MMR
vaccination records, plus two design variants of case 7 (7A and 7B). Each case lists the inputs (date of birth and full vaccination
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
  including Partially vaccinated and Already had the vaccine, goes to
  the encounters table and never counts as a dose
- Status is Fully vaccinated only when no doses remain. While doses
  remain, status falls through to triage and consent as usual
- Known gap (case 7): an Already had the vaccine record is not
  classified, but for MMR sets Fully vaccinated whatever the dose count,
  as `already_had` does in Mavis. The prototype uses the same outcome when
  a previous vaccination is recorded, so recording one previous MMR
  vaccination also sets Fully vaccinated. In Mavis that flow records an
  administered dose that counts toward the schedule
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

| #   | Age     | Vaccine           | Source                                                       | Outcome    |
| --- | ------- | ----------------- | ------------------------------------------------------------ | ---------- |
| 1   | 12m 14d | M-M-RvaxPro (MMR) | NHS Immunisations API: SystmOne (used by GPs and NHS trusts) | Vaccinated |
| 2   | 40m 10d | ProQuad (MMRV)    | NHS Immunisations API: SystmOne (used by GPs and NHS trusts) | Vaccinated |

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

| #   | Age              | Vaccine     | Source                                  | Outcome         | Note                                                                                                                                                                                                                                               |
| --- | ---------------- | ----------- | --------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 12m 14d          | M-M-RvaxPro | NHS Immunisations API: EMIS (GP system) | Vaccinated      | –                                                                                                                                                                                                                                                  |
| 2   | 50m 0d           | M-M-RvaxPro | CHIS                                    | Absent          | –                                                                                                                                                                                                                                                  |
| 3   | 57m 0d           | M-M-RvaxPro | CHIS                                    | Absent          | –                                                                                                                                                                                                                                                  |
| 4   | 171m 9d (Year 9) | M-M-RvaxPro | Recorded in Mavis                       | Consent refused | Parents asked their paediatric oncology consultant for advice given Bilal's treatment history before consenting. They had not heard back by the day of the session, so refused consent for now. To be revisited once consultant input is received. |

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

| #   | Age    | Vaccine     | Source                                                       | Outcome    |
| --- | ------ | ----------- | ------------------------------------------------------------ | ---------- |
| 1   | 11m 0d | M-M-RvaxPro | NHS Immunisations API: SystmOne (used by GPs and NHS trusts) | Vaccinated |
| 2   | 50m 0d | M-M-RvaxPro | Recorded in Mavis                                            | Vaccinated |

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

| #   | Age     | Vaccine     | Source                                  | Outcome    |
| --- | ------- | ----------- | --------------------------------------- | ---------- |
| 1   | 11m 29d | M-M-RvaxPro | NHS Immunisations API: EMIS (GP system) | Vaccinated |
| 2   | 48m 14d | M-M-RvaxPro | NHS Immunisations API: EMIS (GP system) | Vaccinated |

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

One clinical Dose 1 event recorded three times, each with a different
date: the GP record from the NHS Immunisations API on the day, a CHIS
entry keyed in a few days later and uploaded by the SAIS team, and a
previous area's CHIS or SAIS file uploaded after the child moved. Mavis
only treats records as duplicates when the date matches, so all three
stay. The
classifier counts the earliest as Dose 1 and marks the duplicates as
out of schedule because they fall within the 28-day interval rule.

- **NHS number:** 9990000053
- **Date of birth:** 15 October, Year 10 in the current academic year

### Vaccination history

| #   | Age    | Vaccine     | Source                                                       | Outcome    |
| --- | ------ | ----------- | ------------------------------------------------------------ | ---------- |
| 1   | 13m 0d | M-M-RvaxPro | NHS Immunisations API: SystmOne (used by GPs and NHS trusts) | Vaccinated |
| 2   | 13m 3d | M-M-RvaxPro | Uploaded as a historical vaccination                         | Vaccinated |
| 3   | 13m 4d | M-M-RvaxPro | Uploaded as a historical vaccination                         | Vaccinated |

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

| #   | Age    | Vaccine     | Source                                                       | Outcome    | Sequence label |
| --- | ------ | ----------- | ------------------------------------------------------------ | ---------- | -------------- |
| 1   | 48m 0d | M-M-RvaxPro | NHS Immunisations API: SystmOne (used by GPs and NHS trusts) | Vaccinated | `2P`           |

### Expected classification

| #   | Status | Slot   | Reason |
| --- | ------ | ------ | ------ |
| 1   | Valid  | Dose 1 | –      |

- **Programme status:** Due vaccination (1 dose remaining; consent given for the catch-up session, no Yes health answers)
- **Eligible from:** dose 1 + 28 days (later than date of birth + 15 months)
- **Doses remaining:** 1

---

## Case 7 — Gita Gill (known gap)

> **Known gap.** This case demonstrates current behaviour, not intended
> behaviour.

In production Mavis, `already_had` is a legacy marker that the child is
done, now created mainly by imports (already had elsewhere). It has no
dose date, skips the dose maths and gives a vaccinated status, so a
vaccinated child can show 0 of 2 doses. This case reproduces that state.

Gita has no dose records. One Already had the vaccine record was imported
from CHIS, dated on the import date. It fills no dose slot.

- **NHS number:** 9990000079
- **Date of birth:** 20 January, Year 10 in the current academic year

### Vaccination history

| #   | Date                                                                 | Vaccine | Source | Outcome                 |
| --- | -------------------------------------------------------------------- | ------- | ------ | ----------------------- |
| 1   | 10 June in the previous academic year (import date, not a dose date) | –       | CHIS   | Already had the vaccine |

### Expected classification

| #   | Status      | Slot | Reason                                           |
| --- | ----------- | ---- | ------------------------------------------------ |
| 1   | Not counted | –    | Outcome `Already had the vaccine`, no dose given |

### Expected page (current behaviour)

- **Programme status:** Fully vaccinated (set by the Already had the
  vaccine record, whatever the dose count)
- **Status note:** Vaccinated on the import date (there is no valid dose
  to date it from)
- **Doses complete:** 0 of 2 doses complete
- **Dose rows:** Dose 1 shows Eligible from date of birth + 12 months
  (long past); Dose 2 shows dashes
- **Encounters card:** shown, with one row: the import date, Already had
  the vaccine, Child health information service
- **Doses remaining:** 2
- **Consent:** given for the catch-up session, like the other cohort
  patients

---

## Case 7A — Gita Gill A (design variant of case 7)

> **Design variant.** This case demonstrates a design option for case 7,
> not expected behaviour. It is prototype-only scaffolding: the patient
> record carries `designVariant: "A"`, which chooses how the MMR page
> shows the Vaccination record card.

A copy of case 7 with the same dates, record and consent. The
classifier and status logic are unchanged, so the classification,
programme status, status note and doses remaining are as case 7.

- **NHS number:** 9990000087
- **Date of birth:** 20 January, Year 10 in the current academic year

### Page (variant A: filled dose rows)

- **Status note:** as case 7
- **Doses complete:** 0 of 2 doses complete, as case 7
- **Dose rows:** both filled, with no Eligible from on either row

| Dose   | Vaccination date | Age     | Source                    |
| ------ | ---------------- | ------- | ------------------------- |
| Dose 1 | Unknown          | Unknown | Parent or guardian report |
| Dose 2 | Unknown          | Unknown | Parent or guardian report |

- **Encounters card:** as case 7

---

## Case 7B — Gita Gill B (design variant of case 7)

> **Design variant.** This case demonstrates a design option for case 7,
> not expected behaviour. It is prototype-only scaffolding: the patient
> record carries `designVariant: "B"`, which chooses how the MMR page
> shows the Vaccination record card.

A copy of case 7 with the same dates, record and consent. The
classifier and status logic are unchanged, so the classification,
programme status, status note and doses remaining are as case 7.

- **NHS number:** 9990000095
- **Date of birth:** 20 January, Year 10 in the current academic year

### Page (variant B: explanation in place of the doses)

- **Status note:** as case 7
- **Doses complete and vaccinations table:** not shown. In their place,
  inset text using the name from the patient record: "Gita Gill B was
  reported as vaccinated by a parent via CHIS. We do not hold the dates
  of any doses."
- **Encounters card:** as case 7

---

## Cohort session

All seven patients, and the two case 7 design variants, are tied to a
single co-located session for the catch-up scenario:

- **Session id:** `mmr-catchup-y9y10-current`
- **School:** Grace Academy Coventry (id `135335`)
- **Date:** 2 weeks after today, with the consent window opened 4 weeks before today
- **Year groups:** Y9 and Y10
- **Programmes:** MMR catch-up + Doubles (MenACWY + Td/IPV) co-located
- **Consents seeded:** consent given for every patient and programme,
  except Dmitri's MMR (Refused, "Already had both doses of the MMR vaccine"). Bilal's MMR
  consent answers Yes to the immune system question
