# WorkProof — 4-Minute Demo Video Script & Production Guide

**Target length:** 4:00 (hard cap — Demo Day rule)
**Format:** Screen recording with voice-over (no face required)
**Audience:** Demo-Day judges. Product-focused — no file names, no code identifiers, no dev jargon.
**Pace:** ~150 words/minute → script lands around **3:55** read at a natural pace.

---

## 0. Before You Record — Setup Checklist

1. Have the app running and confirm all three tabs work: **Home**, **My Claims**, **Verify**, **Discover**.
2. Pre-seed one or two example claims so the *Discover* tab isn't empty on camera.
3. Open Chrome (or Brave) at the home page. Zoom to **110%** so text is readable on stream. Hide the bookmarks bar.
4. macOS **Do Not Disturb on**. Quit Slack / Discord / Mail — no notifications mid-take.
5. Mic check: record 10 seconds, listen back. If you hear room echo, record under a duvet (sounds silly, works).
6. Recording tool: **`Cmd + Shift + 5` → Record Selected Portion** → choose the browser window region.

---

## 1. The Script (read aloud, time-coded)

> **How to use this:** the **bold timestamps** are when the next scene should be visible. Words in *(parentheses)* are stage directions — not spoken. Practice once with a stopwatch and aim to land on **3:55**, never over **4:00**.

---

### **[0:00 – 0:20]  Hook**
*(On screen: home page hero. Stay still — no clicks.)*

> "I'm [YOUR NAME], and this is **WorkProof** — employment verification powered by zero-knowledge proofs and AI, on the Midnight Network.
>
> Every résumé you've ever read is built on trust. Self-reported claims, an unverified LinkedIn, a reference call no one ever makes. Recruiters guess; candidates have to overshare to be believed. WorkProof fixes both sides at once."

---

### **[0:20 – 0:45]  How it works**
*(Scroll slowly down the home page so the three-step protocol section is visible.)*

> "The protocol is three steps. A **candidate** commits a claim — and their identity is cryptographically hidden the moment they hit submit. A **verifier** confirms a credibility signal — an HR email match, a LinkedIn cross-check, a document, or a coworker endorsement. A **recruiter** sees a trust score and the signals behind it — but never any raw personal data. Three roles, one shared truth, zero blind trust."

---

### **[0:45 – 1:20]  Step 1 — Submit a claim**
*(Click "My Claims". Fill the form on camera, narrating as you type.)*

> "I'm the candidate. I open *My Claims*. I enter my email, the company — Deloitte — my role, and the dates I worked there.
>
> Nothing private has been sent. The app hashes my email and the company name in the browser before anything leaves the page. Only proofs and hashes touch the network."
>
> *(Click Submit. Wait for the result card.)*
>
> "Submit. A zero-knowledge proof is generated right here — committing the claim cryptographically, without exposing my identity or the exact duration on chain."

---

### **[1:20 – 2:05]  Step 2 — The AI trust score appears  *(this is the headline)***
*(Stay on the result card. Let the viewer read the trust score and tags.)*

> "And here's where the AI takes over. The app returns a trust score — between zero and one hundred — and a list of explainability tags telling me **exactly why** the score is what it is.
>
> Right now the score is low — and that's correct. I just self-claimed this; nobody has confirmed it. The AI is being honest about what's missing — *email domain unverified*, *LinkedIn not provided*, *no peer endorsements*. No black box, no mystery number, just a transparent credibility readout a recruiter or compliance officer can audit.
>
> The scorer combines five signal channels — email-domain match, LinkedIn consistency, duration realism, peer endorsements, and adversarial-pattern detection. It's deterministic, privacy-preserving — it only ever sees hashed data — and anti-gameable. Suspicious patterns *lower* the score; you can't pump it up by spamming claims."

---

### **[2:05 – 2:40]  Step 3 — Verify the claim, watch the AI react live**
*(Click "Verify". Paste the Claim ID. Pick "Email Domain". Type `deloitte.com`. Submit.)*

> "Now I switch hats. I'm an HR verifier at Deloitte. I open *Verify*, look up the claim, pick a verification type — email domain — and submit.
>
> Watch the screen. The audit log on the right updates in real time. The trust score moves up — the AI just added thirty points for the matching email domain — and the *email domain unverified* tag drops off the explainability list. The credibility model is updating live, signal by signal, in front of you."

---

### **[2:40 – 3:15]  Step 4 — Recruiter view**
*(Click "Discover". Scroll the proven-claims list slowly.)*

> "Final hat: the recruiter. I open *Discover*. Recruiters never log in as the candidate — they only inspect.
>
> Every row shows the trust score, the confidence band — high, medium, or low — and the verification signals behind it. But notice what's *not* here: no email, no real company name, no résumé I can forge. The recruiter sees the proof and the AI's verdict — not the person. Privacy and trust at the same time."

---

### **[3:15 – 3:55]  Why this matters & close**
*(Cut back to the home page. Hold the final frame.)*

> "Three takeaways. One — this is a real, working product. You just watched the end-to-end flow. Two — the AI is the differentiator: explainable, deterministic, privacy-preserving, anti-gameable. A trust score a recruiter, an HR team, and a regulator can all stand behind. Three — Midnight is the right substrate: the blockchain proves *what happened*, the AI scores *how much to trust it*, the audit log binds the two.
>
> WorkProof is fully working today. I'd love to take it to recruiting platforms and background-check providers next. I'm [YOUR NAME] — thanks for watching, questions next."

*(Stop recording at 3:58.)*

---

## 2. Shot List (cheat sheet)

| # | Time     | Tab        | Action                                                      |
|---|----------|------------|-------------------------------------------------------------|
| 1 | 0:00     | Home       | Static hero — no clicks                                     |
| 2 | 0:20     | Home       | Slow scroll to the three-step protocol                      |
| 3 | 0:45     | My Claims  | Fill the form on camera → Submit → response card            |
| 4 | 1:20     | My Claims  | Hold on the trust score + tags (the AI moment)              |
| 5 | 2:05     | Verify     | Paste Claim ID → submit email-domain signal → score updates |
| 6 | 2:40     | Discover   | Scroll proven-claims list                                   |
| 7 | 3:15     | Home       | Hold final frame                                            |

---

## 3. Recording Workflow

1. **Rehearse the script twice with a stopwatch.** Mark anything that runs long — cut it, don't speed up.
2. **Record audio first** (QuickTime → File → New Audio Recording). One clean take.
3. **Record the screen silently**, hitting each shot at the timestamp above. Play the audio in your headphones as a timing track.
4. **Edit in iMovie / DaVinci Resolve / CapCut.** Audio on track 1, screen capture on track 2, trim screen segments to match.
5. **Export 1080p, H.264, MP4, ≤ 200 MB.**
6. **Sanity check.** Watch it once with a friend. If they can't say in one sentence what WorkProof does after watching, re-record the 0:00–0:45 section.
7. **Upload to your Drive folder.** Tag the organizer in Discord.

---

## 4. Common Mistakes to Avoid

- **Don't read it monotone.** Inflect on *prove*, *without*, *trust*, *explainable*, *live*.
- **Don't show your IDE, your terminal, or your file tree.** Judges are evaluating the product, not the code structure.
- **Don't use code-y language on camera** — no class names, file paths, circuit names, or library versions. Save those for Q&A.
- **Don't talk over a wallet popup.** Pause for one second if the wallet UI appears.
- **Don't go over 4:00.** They will cut you off mid-sentence on stream.
- **Don't apologize on camera.** If something looks off, narrate around it confidently.

---

## 5. If Something Breaks Mid-Recording

| Problem                          | Fast workaround                                                                 |
|----------------------------------|----------------------------------------------------------------------------------|
| Backend errors on submit         | Switch to the pre-seeded claim and continue — the demo flow still works         |
| Wallet hangs                     | Refresh — the built-in demo wallet auto-connects in under a second              |
| AI score doesn't move on verify  | Click *Verify* again with a different signal type — same script line still fits |
| You stumble on a word            | Keep going. Edit out the gap in iMovie. Don't restart the take.                 |

---

Good luck. The script lands at **3:55** at a natural pace — leave the last 5 seconds for a clean final frame on the home page.
