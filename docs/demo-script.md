# Rick - 2-Minute Demo Script

**Total runtime: ~2:00.** A churn-rescue walkthrough that ends with a live call.
Stage directions are in _italics_. Spoken lines are in quotes. Times are cumulative.

> **Before you start**
> - Open the app on the **Landing** page (`/`), light theme, window maximised.
> - Have the phone you will call (or the Twilio test number) on the desk, ringer up.
> - Seed data is fine - no live API needed. The demo account is **Pemberton & Co**.

---

## 0:00 - 0:15 · The hook (15s)

_On the Landing page._

> "Most CRMs celebrate the deal and go quiet. Everything that actually keeps
> revenue - renewals, expansion, churn rescue - falls into a spreadsheet.
> Rick is the cockpit for everything **after** the close. It's an add-on built
> on Attio."

_Click **Open the Cockpit**._

---

## 0:15 - 0:35 · Triage at a glance (20s)

_On the Health Dashboard. Gesture across the four columns._

> "The moment a deal closes in Attio, the account syncs in and Rick watches it
> for risk and expansion signals - then triages every account Red, Amber, Green.
> Three accounts are Red right now, $418k of ARR at risk."

_Drag any card one column over and back._

> "It's a living board - a CSM can reclassify in one drag."

---

## 0:35 - 0:55 · The signal (20s)

_Click the red **Pemberton & Co** card to open the account._

> "Pemberton renews in **9 days**. Rick caught two signals: a plan downgrade
> staged in Stripe, and exec satisfaction dropping after a billing incident.
> That combination is what flipped it Red - $142k on the line."

_Point at the Active Signals panel, then the seat-usage trend sliding down._

---

## 0:55 - 1:30 · Place the call (35s) ← the centrepiece

_Back to the dashboard, open the **Action Agent** (floating button, bottom-right).
The Pemberton item is at the top with a pre-written script._

> "The Action Agent already drafted the call. I can schedule it for later -"

_Click **Place Call**. In the scheduler, hover the presets (In 1 hour, Tomorrow 9 AM)._

> "- or place it now."

_Select **Call now**, click **Place Call**. The phone rings; pick up on speaker._

**The voice agent says (≈25s):**

> "Hi James, it's Rae calling from Rick on behalf of your account team. I noticed
> last week's billing issue and that a downgrade was scheduled for next cycle - I
> wanted to personally make it right. We've already applied a credit, and I'd love
> to walk you through where we're taking the integration next quarter. Do you have
> two minutes, or should I find a better time?"

_Let it land, then hang up._

> "That call went out through Twilio, and the outcome writes straight back to the
> account in Attio."

---

## 1:30 - 1:50 · The Call Log (20s)

_Click **Call Log** in the left rail._

> "Every call lives here - past, live, and scheduled. You can see the one we just
> placed, the calls already completed with their outcomes and talk time, and the
> ones queued for later. Any scheduled call can be fired early or cancelled."

_Point at a `Scheduled` row's **Call now** / **Cancel** buttons._

---

## 1:50 - 2:00 · Close (10s)

> "So: Attio closes the deal, Rick runs everything after it - detect, triage, and
> act, before the renewal slips. One add-on, your whole post-sale motion."

_End on the dashboard._

---

## Backup / Q&A pocket answers

- **"Is the call real?"** Yes - it dispatches via Twilio. Without a number wired
  it still logs the call and shows the confirmation toast, so the demo never breaks.
- **"How is health decided?"** Signals carry a severity weight (major 10, medium 5,
  minor 2). A major risk or a risk weight of 7+ is Red, 2+ is Amber, else Green -
  the same rule the board, the agent, and the API share. _(See `/how-it-works`.)_
- **"Does it replace our CRM?"** No. Attio stays the system of record; Rick reads
  the customer in and writes outcomes back over a signed webhook connector.
  _(See `/attio`.)_
- **If the call can't connect:** click **Place Call → Call now**, let the toast
  confirm dispatch, and narrate the script yourself. Then continue to the Call Log.

---

### Timing cheat-sheet

| Beat | Ends at | Length |
|------|---------|--------|
| Hook | 0:15 | 15s |
| Triage board | 0:35 | 20s |
| The signal | 0:55 | 20s |
| **Place the call** | 1:30 | 35s |
| Call Log | 1:50 | 20s |
| Close | 2:00 | 10s |
