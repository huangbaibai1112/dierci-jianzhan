# Senior Dating Over 50 · Agent Development & Editorial Guidelines

> **CRITICAL WORKSPACE RULE FOR ALL AGENTS & DEVELOPERS:**  
> This project operates in the mature dating space (adults aged 50 and older). When writing code, editing templates, composing marketing copy, writing blog articles, crafting SEO content, or generating responses, **all agents must strictly adhere to the negative keywords and editorial rules below.**

---

## 1. Zero-Tolerance Negative & Infringing Keyword List (侵权词与违规词禁令)

All agents must strictly cross-reference **`banned-keywords.txt`** and **`侵权词.txt`**. Any article, page copy, blog post, or code containing these words will be rejected by `python build.py`.

### 1.1 Competitor Brand Names & Trademarks (竞品商标，严禁使用)
- **Seeking Ecosystem:** `Seeking`, `Seeking.com`, `SeekingArrangement`, `Seeking Arrangements`, `SeekingArrangements`, `SeekingArrangement.com`, `Seeking Millionaire(s)`, `Seeking Elite`, `Seeking Hypergamy`, `Seeking Society`, `Ask Brandon Wade`, `Secret Doors`, `Secret RSVP`, `Secret Benefits`, `SecretBenefits`.
- **Other Dating Competitors:** `OurTime`, `DateMyAge`, `SeniorsMeet`, `SeniorPeopleMeet`, `Luxy`, `Spark` (*Spark Networks*), `Popsugar`, `Meupatrocinio`, `Universosugar`, `RichMeetBeautiful`, `Miss Travel`, `Black Elite Speed Dating`, `Blackbabyboomermeet`.
- **Root Keywords:** Do not use `seek`, `seeks`, or the acronym `SA`.

### 1.2 Transactional & Sugar Dating Vocabulary (交易化/糖恋词汇，严禁使用)
- **Arrangement Language:** `Arrangement`, `Arrangements`, `Arrangement Dating`, `Arrangement Seekers`, `Mutually Beneficial Arrangement(s)`, `Mutually Beneficial Relationship(s)`, `Mutually Beneficial Dating`.
- **Sugar Terminology:** `Sugar Daddy`, `SugarDaddies`, `Sugar Dad(s)`, `Sugar Mom(my)`, `Sugar Baby`, `Sugar Date`, `Sugar Dating`, `Sugar Daters`, `Sugar Chat`, `Positive Sugar`, `Dont Sugar Seek`, `Lets Talk Sugar`.
- **Transactional Slogans & Concepts:** `Paid Relationship`, `Get Paid To Date`, `Get Paid For Dating`, `Bribe Your Way To A Date`, `Everyone Has A Price`, `Whats Your Price`, `First Date Guarantee`, `Firstdate`, `Relationship On Your Term(s)`, `You Know What You Want`, `The Online Dating Shortcut`, `Know Your Worth`, `Dating Up`, `Just Date Up`, `Start Dating Up`, `Power Dating`, `Empowered Dating`, `Empowered Relationships`, `Honest Empowered Dating`, `Master Dater`, `Upgrade Your`, `Upgrade Your Relationships`, `One Good Catch`, `Hypergamy`, `Hypergamy Dating`, `Experience Hypergamy`, `What Is Hypergamy`, `Gaydaddy`, `Besecret`.

### 1.3 Hate Speech, Exploitative & Illegal Content (违法违规词汇，零容忍)
- Any derogatory slurs, sexually explicit/exploitative terms, or prohibited keywords listed in section 5 of `banned-keywords.txt`.

### 1.4 AI Clichés & Banned Wording (AI套话禁令)
- Cross-reference **`ai-banned-wording.txt`**. Do not use cliché marketing jargon such as:  
  `seamless`, `seamlessly`, `unlock`, `unlocking`, `elevate`, `elevating`, `journey`, `meaningful connection`, `testament`, `game-changer`, `beacon`, `tapestry`, `dive into`, `delve`, `empowers`, `provides`, etc.

---

## 2. Editorial Principles for Article & Copy Writing (文案与文章撰写规范)

When composing articles, newsletters, help center guides, or landing pages for this project, always adhere to the following core platform values:

1. **Strict 50+ Age Gate (专属 50+ 准入门槛):**
   - The platform is strictly reserved for adults aged 50 and older. Never dilute this with generic "all ages welcome" phrasing.
2. **100% Real-Person Human Selfie & Video Audit (真人视频与自拍审核):**
   - Emphasize safety, physical authenticity, and human review that eliminates synthetic bots, catfishes, and dishonest profiles.
3. **In-App Call Shield (电话隐私隐匿系统):**
   - Highlight that members can make voice and video calls within the app without ever exposing their real mobile phone number, personal billing data, or area code.
4. **09:00 AM Daily Curated Introductions (晨间定额推荐):**
   - Focus on intentional, unhurried matching delivered with morning tea, completely replacing the anxiety and swipe fatigue of generic swipe apps.
5. **Daylight 1-on-1 Coffee Meetup Horizon (白昼一对一低压咖啡会面):**
   - Frame first meetings as casual, low-pressure 45-minute daytime check-ins at public venues (cafes, museums, botanical gardens) with independent transport plans.
6. **Silver Select VIP Discretion (尊享会员的克制与从容):**
   - Emphasize private browsing, unlimited rewinds (no accidental lost connections), read receipts, and an uncluttered, ad-free environment.

---

## 3. Mandatory Verification Checklist for Agents

Before completing any task that modifies or creates code, copy, or articles:
1. Run **`python build.py`** to execute the automatic dual-dictionary audit against `banned-keywords.txt` and `ai-banned-wording.txt`. The audit must report:
   ```text
   -> Audit Passed: 0 banned words, 0 AI cliches detected.
   ```
2. If touching layout or stylesheets, verify mobile 360px–480px responsive viewports (`scrollWidth === clientWidth`) to ensure zero horizontal scroll.
