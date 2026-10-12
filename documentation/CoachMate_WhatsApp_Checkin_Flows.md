# CoachMate – WhatsApp Check-in Flowcharts

Oct 12, 2026 · Drawn from the built code (`app/api/whatsapp/route.ts`, `lib/bot-delivery.ts`, `lib/bot-matcher.ts`, `lib/checkin-flow.ts`, `lib/retention-purge.ts`, `lib/roster-sync.ts`) after the end-to-end sandbox test · Rules: `CLAUDE.md`, "BotMatcher / BotDelivery Boundary Split"

Three charts, one question each:

1. **Process:** what happens to one incoming WhatsApp message.
2. **Data flow:** which component sees and stores which data.
3. **Retention:** when stored check-in data is deleted.

## 1. Process: one incoming message

Every reply is fixed, templated text (`lib/bot-consent.ts`, `lib/checkin-flow.ts`). Claude only returns a goal number.

```mermaid
flowchart TD
    In(["Player sends a WhatsApp message"]) --> Sig{"Valid Twilio signature?"}
    Sig -- no --> Rej["403, nothing processed"]
    Sig -- yes --> Who{"Number belongs to a player<br/>on the roster?"}
    Who -- no --> Silent1["No reply, nothing stored"]

    subgraph BD["BotDelivery: phone number + consent"]
        Who
        Kw{"Message is STOP or START?"}
        Stop["STOP: set opt-out date (first STOP only)<br/>delete pending draft now"]
        Start["START: opt in, store consent version<br/>cancel pending STOP deletion"]
        Cons{"Consent state"}
        Silent2["Opted out: no reply, nothing stored"]
        Invite["Not opted in: send consent text<br/>message not stored"]
    end

    Who -- yes --> Kw
    Kw -- STOP --> Stop --> ROut["Reply: opted out"]
    Kw -- START --> Start --> RIn["Reply: opted in"]
    Kw -- neither --> Cons
    Cons -- opted out --> Silent2
    Cons -- not opted in --> Invite
    Cons -- opted in --> Hand["Pass on player ID + message text only"]

    subgraph BM["BotMatcher: player ID + goals"]
        Load["Load active goals + unexpired draft"]
        Draft{"Pending draft?"}
        Ans{"Reply to the draft"}
        Save["Store check-in: player ID, goal ID,<br/>text, time. Delete draft"]
        Disc["Delete draft"]
        Pick["Link draft to that goal"]
        Goals{"Has active goals?"}
        Len{"Up to 1000 characters?"}
        AI["Claude: which goal is this about?<br/>sends goal texts + message only"]
        Match{"Clear match?"}
        DraftG["Save draft with goal<br/>(replaces any old draft, 24 h)"]
        DraftN["Save draft without goal<br/>(replaces any old draft, 24 h)"]
    end

    Hand --> Load --> Draft
    Draft -- yes --> Ans
    Ans -- YES, goal known --> Save --> RSaved["Reply: shared with your coach"]
    Ans -- YES, no goal yet --> RPick
    Ans -- NO --> Disc --> RDisc["Reply: discarded, nothing saved"]
    Ans -- valid goal number --> Pick --> RShare
    Ans -- anything else --> Goals
    Draft -- no --> Goals
    Goals -- no --> RNoGoal["Reply: no active goal, nothing saved"]
    Goals -- yes --> Len
    Len -- no --> RLong["Reply: too long, nothing saved"]
    Len -- yes --> AI --> Match
    Match -- yes --> DraftG --> RShare["Reply: this sounds like goal X.<br/>Share with your coach? YES / NO / other number"]
    Match -- "no, or Claude unavailable" --> DraftN --> RPick["Reply: which goal is it about?<br/>numbered list, or NO"]
```

Not shown: if the database or anything else fails inside BotMatcher, the player gets "can't process updates right now, nothing was saved".

## 2. Data flow: who sees and stores what

The webhook route is the only place that holds both the phone number and the message text. It resolves the player ID and passes the text on.

```mermaid
flowchart TB
    subgraph EXT["Outside CoachMate"]
        direction LR
        Phone(("Player's phone")) <-->|message text| Meta["WhatsApp (Meta)"] <--> Twilio["Twilio sandbox (US)<br/>keeps its own message copies"]
        Sheet["Google Sheet: Roster<br/>player_id, name, jersey, phone"]
    end

    subgraph VERCEL["Vercel: one CoachMate deployment"]
        Route["Webhook /api/whatsapp<br/>checks Twilio signature"]
        BD["BotDelivery<br/>sees: phone, player ID, consent"]
        BM["BotMatcher<br/>sees: player ID, message, goal texts"]
        Sync["Roster sync<br/>(manual + daily job)"]
        App["Coach web app<br/>Player Detail"]
    end

    subgraph SUPA["Supabase"]
        direction LR
        Contacts[("player_contacts<br/>player ID → phone")]
        Players[("players<br/>roster, removed_at")]
        Consents[("whatsapp_consents<br/>opt-in/out times,<br/>wording version")]
        Goals[("goals<br/>goal texts,<br/>player name removed")]
        Drafts[("checkin_drafts<br/>max 1 per player, 24 h")]
        Checkins[("goal_checkins<br/>YES-confirmed texts")]
    end

    Claude["Claude API (Anthropic, US)<br/>sees: goal texts + message<br/>no player ID, name or phone"]

    Twilio <-->|"in: phone + message text<br/>out: reply (TwiML)"| Route
    Route <-->|"phone + message text / reply"| BD
    BD <-->|"player ID + message text (opted-in only)<br/>back: fixed reply text"| BM
    BD -.->|"on STOP: discardDraft(player ID)"| BM
    BM <-->|"goal texts + message / goal number"| Claude

    BD -->|"phone → player ID"| Contacts
    BD -->|"roster status only"| Players
    BD <-->|"read / set consent"| Consents
    BM -->|"read active goals"| Goals
    BM <-->|"draft text + goal ID"| Drafts
    BM -->|"on YES: text + goal ID"| Checkins

    Sheet -->|"one-way pull"| Sync
    Sync --> Players
    Sync -->|"phone column"| Contacts
    App -->|"reads goals + shared check-ins only"| Goals
    App --> Checkins
```

What the coach never sees: phone numbers, drafts, and whether or when a player joined or sent STOP (decided 2026-10-12).

The split is enforced in code (`lib/bot-boundary.test.ts`), not by the database: both sides use the same service-role key in one deployment. This is an accepted residual risk (`CLAUDE.md`, "Residual risk").

## 3. Retention: when check-in data is deleted

The daily job (`/api/cron/retention`, 03:00 UTC) first runs the roster sync, then the purge. A manual sync from the app applies roster removals at once.

```mermaid
flowchart TB
    subgraph DRAFT["Draft (checkin_drafts)"]
        direction LR
        D(["Draft saved"])
        D -->|YES| DMove["Moved to goal_checkins,<br/>draft deleted"]
        D -->|NO| DDel1["Deleted"]
        D -->|new message| DDel2["Replaced"]
        D -->|STOP| DDel3["Deleted immediately"]
        D -->|"roster removal<br/>or phone change"| DDel4["Deleted at sync"]
        D -->|"24 h pass"| DExp["Ignored by the bot at once,<br/>deleted by the next daily job"]
    end

    subgraph CHECKIN["Shared check-in (goal_checkins)"]
        direction LR
        C(["Check-in stored"])
        C -->|"stays on roster,<br/>no STOP"| CKeep["Kept"]
        C -->|"first STOP"| Grace{"START within<br/>7 days?"}
        Grace -- yes --> CKeep
        Grace -- no --> CDel1["Deleted by the daily job<br/>7–8 days after STOP"]
        C -->|"removed from roster"| CDel2["Deleted at sync<br/>(within a day)"]
    end

    subgraph OTHER["Goals, contacts, consent"]
        direction LR
        R(["Player removed<br/>from roster"]) --> GDel["Goals + phone deleted,<br/>opt-in reset, earlier STOP kept"]
        P(["Phone changed or<br/>removed in Sheet"]) --> PReset["Phone entry replaced, opt-in reset,<br/>draft deleted: new number must send START"]
    end

    DRAFT ~~~ CHECKIN ~~~ OTHER
```

Whole rows are deleted: there is no separate step that redacts third-party names inside a check-in. Copies held by Twilio, WhatsApp (Meta) and Anthropic follow their own retention rules, not these.
