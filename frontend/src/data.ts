// Stage data, callouts, prompts, and reference tables.
// Mirrored from the legacy single-file build, now typed.
import type {
  Country, CountryNote, CareerField, Partnership, Relation, Stage
} from './types';

// ---- Country-specific ----
export const COUNTRY_NOTES: Partial<Record<Country, CountryNote>> = {
  US: { lifeExp: { male: 76, female: 81 }, retireMedian: 64 },
  CA: { lifeExp: { male: 80, female: 84 }, retireMedian: 64 },
  UK: { lifeExp: { male: 79, female: 83 }, retireMedian: 65 },
  AU: { lifeExp: { male: 81, female: 85 }, retireMedian: 65 },
  DE: { lifeExp: { male: 78, female: 83 }, retireMedian: 64 },
  FR: { lifeExp: { male: 79, female: 85 }, retireMedian: 62 },
  JP: { lifeExp: { male: 81, female: 87 }, retireMedian: 69 },
  IN: { lifeExp: { male: 70, female: 73 }, retireMedian: 60 },
  BR: { lifeExp: { male: 73, female: 79 }, retireMedian: 62 },
  MX: { lifeExp: { male: 73, female: 78 }, retireMedian: 65 },
};

// ---- Career field callouts (3 brackets) ----
export const CAREER_FIELDS: Partial<Record<Exclude<CareerField, ''>, { young: string; mid: string; late: string }>> = {
  tech: {
    young: "The 'young founder' myth is mostly myth. Founders launch in their 20s, but the actual peak founder age in tech is 45 (Azoulay et al). You have decades to do your best work.",
    mid: "Senior IC tracks are now genuinely viable past 40 — Staff/Principal Engineer compensation often beats VP. Many of the most influential tech leaders are 35–55.",
    late: "Reed Hastings led Netflix into his 60s. Plenty of room in this field at every age — especially for those who can mentor and shape culture."
  },
  medicine: {
    young: "Med school + residency. Brutal but compounds. Most US physicians don't fully attend until ~30 — late start, long career.",
    mid: "Peak clinical years. Many physicians shift toward leadership, research, or sub-specialty mastery in their 40s.",
    late: "Senior practitioners and residency directors are some of the most respected — and busiest — people in any health system. Mentorship is its own form of practice."
  },
  science: {
    young: "Most Nobel-prize work in physics happens in researchers' 30s, but in chemistry and medicine the average is mid-40s. Time at the bench compounds.",
    mid: "Many scientists' most cited work happens in their 40s. Lab leadership, grant funding, and program-building hit stride.",
    late: "Senior scientists shape entire fields. Some of the most generative science happens late — Avi Loeb, Jane Goodall, Sydney Brenner all kept producing into their 70s and 80s."
  },
  finance: {
    young: "Analyst/associate years. Long hours, fast learning. Compensation curve steepens significantly through your 30s.",
    mid: "MD, partner, or fund manager territory. Many transition to allocator side, family office, or principal investing.",
    late: "Senior finance careers extend remarkably late — Warren Buffett is still the most-watched investor in the world in his 90s. Capital and judgment compound."
  },
  arts: {
    young: "Apprenticeship years. Most great artistic work comes later than people think — the data on novelists, painters, and composers shows peak output in 40s–60s, not 20s.",
    mid: "Many novelists peak now. Galenson's research on 'experimental' artists shows decades of refinement converging into the most acclaimed work.",
    late: "Some of the most beloved late-career artists — Toni Morrison, Akira Kurosawa, Louise Bourgeois — produced their best work in their 60s, 70s, even 80s."
  },
  athletics: {
    young: "Peak performance window for most sports. Make it count — but plan the second act early. Athletes' careers are short by design.",
    mid: "Power sports tapering for most, but endurance peaks here. Many elite athletes pivot to coaching, broadcasting, or business in this decade.",
    late: "Tom Brady played until 45. Tennis pros like Federer played into late 30s. Most former athletes find their richest contributions in coaching and mentorship."
  },
  education: {
    young: "First years teaching. Hard but formative. The teachers students remember most often had decades of practice behind them.",
    mid: "Mastery of craft. Many move into department leadership, curriculum design, or administrative roles in this decade.",
    late: "Some of the most beloved teachers and professors hit stride in their 50s and 60s. Decades of practice show up in classroom presence."
  },
  trades: {
    young: "Apprentice years. Real skills compound fast — by your late 20s you can already run circles around white-collar peers in problem-solving and self-direction.",
    mid: "Master journeyman or business-owner territory. Many of the highest-paid skilled tradespeople run their own shops by 40.",
    late: "Master craftspeople are revered for a reason. The trades reward decades of practice in ways office work rarely can."
  },
  hospitality: {
    young: "Front of house, line cook, junior manager — the foundational years. Stamina and presence are your superpowers.",
    mid: "GM, head chef, or owner territory for many. The decade where most great restaurants and hotels are conceived.",
    late: "The most legendary hospitality figures — chefs, hoteliers, sommeliers — are often in their 50s and 60s. Taste compounds."
  },
  public_service: {
    young: "Foundation building. Public service careers reward stamina and depth — your network and reputation will compound for decades.",
    mid: "Many public servants and nonprofit leaders hit their most impactful stretch here, with both authority and credibility.",
    late: "Most influential government leaders are in their 50s and 60s. Median age of US Senate: 65. Wisdom and relationships are the real currency."
  },
  entrepreneurship: {
    young: "First companies, often first failures. Both teach. The data is clear: success rate climbs with age, not down.",
    mid: "Statistical peak founder age is 45 (Azoulay et al, MIT/Harvard). Successful founders averaged 45 at company launch — not 25.",
    late: "Repeat founders, advisors, and investors. Many of the best-performing early-stage funds are run by people in their 50s and 60s."
  },
  other: {
    young: "Foundation years. Whatever the field, time on craft is what compounds.",
    mid: "Mastery years. Most fields reward decades of accumulated judgment — yours is just getting started.",
    late: "Senior practitioners shape every field. The skills and relationships you've built will keep paying for decades."
  }
};

// ---- Partnership / kids callouts for the love card ----
export const PARTNERSHIP_NOTES: Partial<Record<Exclude<Partnership, ''>, string>> = {
  single:   "Studies repeatedly show single people in their 30s and beyond report life satisfaction equal to or above partnered peers — when their social fabric is strong. Friends matter more than partners by some measures.",
  dating:   "Dating in your 20s and 30s is statistically more about pattern recognition than picking. Most people figure out what fits through several relationships, not the first one.",
  engaged:  "The best long-term predictor of marital happiness isn't passion — it's how much you genuinely like each other as friends.",
  married:  "The happiest long-term partnerships often peak in satisfaction around year 25–30. The 'boring years' are the foundation, not the failure.",
  divorced: "Most people who divorce report higher life satisfaction within 2 years post-divorce. Many describe their second chapter as more aligned with who they actually are.",
  widowed:  "Long-term studies show widowed people gradually rebuild meaning and well-being, often with the strong support of community and family. Grief reshapes; it doesn't end the story."
};

export const RELATION_LABEL: Partial<Record<Exclude<Relation, ''>, string>> = {
  parent: 'Parent', sibling: 'Sibling', partner: 'Partner', child: 'Child',
  grandparent: 'Grandparent', grandchild: 'Grandchild',
  friend: 'Friend', mentor: 'Mentor', other: 'Other'
};

// ---- Writing prompts ----
export const PROMPTS: string[] = [
  "Who made you laugh this week?",
  "What surprised you?",
  "Something small that mattered?",
  "What did you learn?",
  "Who do you want to thank?",
  "What's been on your mind lately?",
  "A moment you wish you could keep?",
  "What did you avoid?",
  "When did you feel most yourself?",
  "What are you reading or thinking about?",
  "What's one thing you're proud of?",
  "Who reached out to you recently?",
  "What did you eat that was good?",
  "What music has been with you?",
  "A photo you wish you'd taken?",
  "What was hard?",
  "What was easy that wasn't always?",
  "Where did you go that felt new?",
  "What did your body need this week?",
  "Something you said no to?",
  "Something you said yes to?",
  "What do you hope for next week?",
  "Who do you miss?",
  "What's making you nervous?",
  "What's making you grateful?",
  "Did you make anyone's day?",
  "Did anyone make yours?",
  "What would your future self thank you for?",
  "What did you notice in a stranger?",
  "What do you want to remember about right now?"
];

// ---- Stages ----
export const STAGES: Stage[] = [
  { range: [0, 2] as [number, number], name: "Spark",
    poetic: "Pure beginning. Everything is new.",
    career: { h: "Pure exploration", b: "The 'work' is learning to walk, talk, and trust. About a million new neural connections form per second — the most a brain will ever build." },
    love:   { h: "Wrapped in love", b: "Forming the attachment patterns that quietly shape every adult relationship that follows. You arrived already loved." },
    health: { common: { h: "Miraculous growth", b: "You triple your birth weight in year one. Your brain hits 80% of adult size by age 2. Every system upgrading at impossible speed." } },
    money:  { h: "Held & cared for", b: "Others are already investing in your future — in time, attention, and care. The first wealth is being held." },
    growth: { h: "A clean slate", b: "You're learning the world room by room, person by person. Every face is a friend you haven't recognized yet." },
    goodNews: "By age 2 you've already recognized more faces than most artificial intelligences ever will. The most extraordinary cognitive feats happen now."
  },
  { range: [3, 5] as [number, number], name: "Wonder",
    poetic: "The age when imagination is a superpower.",
    career: { h: "Imagination as work", b: "Pretend play is rehearsal for problem-solving, negotiation, identity. It looks like nothing — it's everything." },
    love:   { h: "First friendships", b: "Making your very first friends. The joy of running toward another small person and shouting their name is one of life's purest." },
    health: { common: { h: "Boundless and bouncy", b: "Fast healing, endless energy, every system tuning up. Sleep still glorious (10–13 hrs). Bones laying down density that will last 80+ years." } },
    money:  { h: "Pre-economic", b: "The world is gifts and surprises and birthdays. Every coin is interesting. Patience just being learned." },
    growth: { h: "The 'why' years", b: "Curiosity is your engine. Every question is a foundation for adult reasoning — and a delight to whoever's lucky enough to answer." },
    goodNews: "Adults consistently rank ages 3–5 among the most joy-filled years of their lives. You probably had more belly laughs per day than at any other point."
  },
  { range: [6, 12] as [number, number], name: "Adventure",
    poetic: "The healthiest, most resilient decade you'll have.",
    career: { h: "Becoming a learner", b: "Reading, math, sustained attention — the cognitive habits that compound for the rest of your life are quietly building now." },
    love:   { h: "Finding your tribe", b: "Best-friend bonds, sleepovers, shared inside jokes. Many adults still keep friendships that started here." },
    health: { common: { h: "Practically indestructible", b: "Lowest mortality rate of any life stage. Bones, lungs, joints all in their prime. Recovery is so fast it almost doesn't count." } },
    money:  { h: "First sense of value", b: "Allowance. Saving up. Choosing one thing over another. The seeds of all future financial wisdom are planted here." },
    growth: { h: "Competence > confidence", b: "Mastering things — biking, swimming, drawing, instruments — builds a self-image that lasts a lifetime. This is when you find what you love." },
    goodNews: "These years are unusually rich in 'firsts' — first chapter book, first sleepover, first true friend. You're collecting memories you'll still smile about at 80."
  },
  { range: [13, 17] as [number, number], name: "Becoming",
    poetic: "Finding out who you are by trying everything on.",
    career: { h: "Discovering your loves", b: "Subjects, hobbies, music, aesthetics — collecting puzzle pieces of who you'll become. The tastes you're forming now are surprisingly durable." },
    love:   { h: "First crushes & big feelings", b: "Hearts on sleeves, butterflies, the kind of feelings that make pop songs feel suddenly true. The neural template for how you'll love is being drafted." },
    health: {
      female: { h: "Coming into your strength", b: "Puberty earlier than your male peers — height growth often complete by 14–15. Bone density laying its lifetime foundation now (this matters a lot at 70). Sleep need still high — your body is rewiring." },
      male:   { h: "The growth surge", b: "Height and strength climbing fast (often into early 20s). Sleep need shifts later — your night-owl phase is biological, not laziness. The body you'll have at 25 is being built now." }
    },
    money:  { h: "Your first earned dollar", b: "Babysitting, mowing lawns, first part-time gigs. Few moments in life feel quite like that first paycheck. Earning > receiving — and you can feel the difference." },
    growth: { h: "Who am I, really?", b: "The big question. You'll try on identities like outfits — that's exactly what you're supposed to do. Most adults remember this era as messy and wonderful in equal measure." },
    goodNews: "Your brain doesn't finish wiring until 25 — every wild thing you survive in these years is partly biology, and partly the rough draft of someone really interesting."
  },
  { range: [18, 22] as [number, number], name: "Launching",
    poetic: "The world cracks open. So do you.",
    career: { h: "First serious moves", b: "College, trade, first job, big trips. The 'wrong' choice you make now is rarely actually wrong — it usually becomes a story you'll tell for decades." },
    love:   { h: "Searching, learning", b: "Most relationships now won't last forever — that's the whole point. You're learning what fits, what doesn't, and how big love can actually feel." },
    health: {
      female: { h: "Near-peak everything", b: "Strength, recovery, endurance all near lifetime highs. Bone density approaching its peak (around 25–30). Movement habits built now compound for 70+ years of mobility and joy." },
      male:   { h: "Peak physical capacity", b: "VO2 max, recovery, muscle response — close to lifetime highs. The single best long-term investment you can make is movement habits that stick." }
    },
    money:  { h: "Time is your superpower", b: "Often net-negative on paper. But every dollar invested at 20 is worth ~10 dollars at 50 thanks to compounding. Time-in-market is the single biggest financial edge you'll ever have." },
    growth: { h: "Beliefs get tested", b: "Politics, religion, values — many ideas you arrived with get challenged. Some survive sharper. Some don't. Either way, you start writing your own script now." },
    goodNews: "The brain disproportionately encodes memories from age 15–25 — psychologists call it the 'reminiscence bump.' The stories you're collecting now will be told for the rest of your life."
  },
  { range: [23, 29] as [number, number], name: "Building",
    poetic: "The decade where compounding starts to show.",
    career: { h: "Skills compounding fast", b: "You'll likely change jobs 4–7 times this decade — each one teaches more than the title suggests. The career you have at 35 will surprise you in good ways." },
    love:   { h: "Getting clearer", b: "Dating becomes more intentional. Many of life's deepest partnerships form now — though there's no rush, and average first-marriage ages keep rising." },
    health: {
      female: { h: "Strong, capable, in tune", b: "Many women describe this as their most physically confident decade. Peak bone density just ahead. Strength training now is one of the best gifts you can give your future self." },
      male:   { h: "Still very near peak", b: "Recovery time creeps up gently each year — sleep and stress management start mattering more. Strength training shifts from optional to high-leverage." }
    },
    money:  { h: "Habits beat income", b: "A Roth IRA contribution made now is worth ~10x the same dollars at 50. Lifestyle inflation is the silent thing to watch. Anything saved now is essentially future free time." },
    growth: { h: "Quarter-life recalibration", b: "Many people hit a 'why am I doing this?' moment around 25–28. It's normal, often productive, and rarely the last one. Listen to it." },
    goodNews: "Memory research consistently finds people recall their 20s with disproportionate vividness and warmth. The stories you're collecting now will be told for the rest of your life."
  },
  { range: [30, 39] as [number, number], name: "Flourishing",
    poetic: "When 'who am I' becomes 'what do I want?'",
    career: { h: "Specialization & leverage", b: "This is when many people write their best work, start companies, lead teams. The decade has produced more great novels, films, and businesses than any other." },
    love:   { h: "Going deep", b: "Many partner up or have kids in this decade — and many don't, with equally good outcomes in the data. Friendships also deepen as social circles tighten and strengthen." },
    health: {
      female: { h: "Confident in your body", b: "Peak fertility through early 30s; declines noticeably after 35 if children are part of the plan. Many women describe this as their strongest, most in-tune decade. Strength training is the highest-leverage habit." },
      male:   { h: "Peak presence, quiet shifts", b: "Strength and aerobic capacity remain high if you train. Testosterone gradually declines (~1–2%/year after 30) but stays plenty for everything that matters. Sleep quality is now the highest-leverage health habit." }
    },
    money:  { h: "The inflection decade", b: "If saving started early, accounts start to feel real. House, retirement contributions, perhaps a business. The choices made here often determine financial freedom in your 50s." },
    growth: { h: "From discovery to design", b: "Identity stabilizes. The interesting question shifts from 'who am I?' to 'what kind of life do I actually want to build?' That's a much better question." },
    goodNews: "By the end of your 30s, most people report feeling more like themselves than they ever have. The decade has been called 'the years of becoming who you actually are.'"
  },
  { range: [40, 49] as [number, number], name: "Hitting your stride",
    poetic: "Mastery, leverage, and a clearer voice.",
    career: { h: "Peak influence", b: "Senior roles, founders, master craftspeople. Decisions affect more people than ever — and you have decades of pattern-matching backing every call." },
    love:   { h: "Long-haul partnership", b: "If partnered, the relationship is no longer about chemistry but about shared infrastructure — and that's its own form of beauty. Long friendships become anchor points." },
    health: {
      female: { h: "Owning the shift", b: "Perimenopause begins for many (typically 40–50). Strength training and bone health become the most important investments. Many women describe these years as their most confident — knowing themselves and finally being unbothered." },
      male:   { h: "The clarity decade", b: "Most chronic conditions seed here unnoticed — annual labs are now non-negotiable. Resistance training is the single highest-leverage habit. Many men report increased clarity about what they actually want." }
    },
    money:  { h: "Peak earning years", b: "Salary often peaks 45–55. Yes, expenses are also peaking — but for many, this is when financial freedom becomes plausible to imagine." },
    growth: { h: "The U-curve low (then up!)", b: "Life satisfaction studies show a measurable dip around 45–50 — followed by one of the biggest rebounds the data has ever measured. It passes, and what comes after is often the best stretch." },
    goodNews: "The world's longest happiness studies show life satisfaction reliably bottoms in the mid-40s and then rises steadily for decades. The U-curve is real — and so is the climb."
  },
  { range: [50, 59] as [number, number], name: "Harvesting",
    poetic: "What you've built starts paying real dividends.",
    career: { h: "Mastery & mentorship", b: "What you know is increasingly more valuable than what you do. Many people shift toward mentorship, board seats, advising — work that compounds for others." },
    love:   { h: "Empty nest = renewal", b: "Kids leave (for many). Marriages deepen or transform. Long friendships become structurally critical. Many people describe this decade as one of the most freeing." },
    health: {
      female: { h: "Through and beyond", b: "Menopause typically completes (avg age 51). Bone density and strength become top priorities. Hormone replacement therapy is increasingly recognized as protective. Post-menopausal women often describe newfound energy and clarity." },
      male:   { h: "Strength is freedom", b: "Andropause is gradual. Cardiovascular focus matters most. Strength training is now non-negotiable for the next 30+ years of mobility. Many men report this as a calmer, clearer decade." }
    },
    money:  { h: "Ten-year runway", b: "Retirement clearly visible. Asset allocation typically shifts toward stability. For many, this is when the freedom you've been working toward starts feeling real." },
    growth: { h: "Generativity", b: "The pull is toward leaving something — kids, work, knowledge, community — that outlasts you. Erikson called it generativity. One of the deepest sources of meaning humans have." },
    goodNews: "Multiple cross-cultural studies show life satisfaction rising significantly through the 50s. People in this decade reliably score happier than those in their 30s — almost everywhere it's been measured."
  },
  { range: [60, 69] as [number, number], name: "Reinvention",
    poetic: "The data says these may be your happiest years.",
    career: { h: "Optional, on your terms", b: "Retirement for some; a third career or passion project for others. Median retirement age keeps climbing — many people don't fully stop because they don't want to." },
    love:   { h: "Rediscovered partnership", b: "Long-coupled relationships are essentially new ones now. Friend networks become structurally critical. Grandparenting (if applicable) is reported as one of the purest joys life offers." },
    health: {
      female: { h: "Strength is destiny", b: "Strength training and walking are the two highest-leverage habits. Grip strength and balance now predict the next two decades better than almost any other measure." },
      male:   { h: "Strength is destiny", b: "Years of strength training (or starting now) are paying off. Heart health, balance, and flexibility lead to genuinely active 70s and 80s." }
    },
    money:  { h: "Drawdown begins", b: "Sequence-of-returns risk peaks early in retirement. Withdrawal strategy matters more than asset allocation now. Spending well is its own art." },
    growth: { h: "Time becomes precious", b: "Studies show emotional regulation and life satisfaction often peak in the 60s and 70s. The narrowing horizon clarifies what matters — and most people respond by loving the people they love more openly." },
    goodNews: "A landmark study of 340,000 Americans (Stone et al.) found self-reported well-being peaks in the 60s. Adults this age report lower stress, less anger, and more positive emotion than 30-somethings."
  },
  { range: [70, 79] as [number, number], name: "Wisdom years",
    poetic: "The view is wider, and surprisingly bright.",
    career: { h: "Beyond the title", b: "Many fully retired. Some still consult, write, mentor, or run small projects for the meaning of it. Work shifts from obligation to gift." },
    love:   { h: "The deep ties", b: "If applicable, grandkids are reported as one of the great late-life joys. Long marriages and old friendships become anchors. Studies consistently find loneliness — not aging itself — is the real risk." },
    health: { common: { h: "Maintenance is everything", b: "Walking pace, balance, and grip strength predict the next decade better than any other measure. Active 70s usually mean active 80s. Connection is medicine." } },
    money:  { h: "Steady drawdown", b: "RMDs kick in (US: age 73). Estate planning becomes practical and clarifying. Many find generosity the deepest form of wealth at this stage." },
    growth: { h: "Telling the story", b: "Many people spend more time recounting and reframing — to themselves and others. It's not nostalgia; it's integration. You're shaping the story of a life worth living." },
    goodNews: "About 80% of 70-somethings rate their life satisfaction as moderate-to-high. The Harvard Study of Adult Development — running 80+ years — found close relationships were the single biggest predictor of late-life happiness. Above wealth. Above career success."
  },
  { range: [80, 100] as [number, number], name: "The long view",
    poetic: "If you make it here, you've already won something rare.",
    career: { h: "Beyond work", b: "The question shifts to: what's worth doing with the time? For many, the answer is small and beautiful — gardens, letters, conversations, watching grandkids." },
    love:   { h: "Concentrated bonds", b: "Social circles narrow but deepen. The people you've kept are the people who matter most. Most octogenarians describe their relationships as the richest part of their lives." },
    health: { common: { h: "The variance decade", b: "Two 85-year-olds can be functionally 20 years apart. Habits from earlier decades cash out here. Connection — possibly more than anything — is medicine." } },
    money:  { h: "Sufficiency over growth", b: "If well-planned, the money outlasts the spender. Many find the late-life joy of generosity and gifts to people they love." },
    growth: { h: "Integrity", b: "Erikson's final stage: looking back and finding it whole. Most people, given time and reflection, get there. An ordinary, profound achievement." },
    goodNews: "Centenarians studied around the world consistently report their happiest decade was their last one. They cite gratitude, perspective, and the people they love. Rare and remarkable company if you make it here."
  },
];


export function getStage(age: number): Stage {
  return STAGES.find(s => age >= s.range[0] && age <= s.range[1]) ?? STAGES[STAGES.length - 1];
}

export function getCareerCallout(age: number, careerField: CareerField): string | null {
  if (!careerField || !(careerField in CAREER_FIELDS)) return null;
  const bucket = age < 30 ? 'young' : (age < 55 ? 'mid' : 'late');
  return CAREER_FIELDS[careerField as Exclude<CareerField, ''>]?.[bucket] ?? null;
}

let lastPromptIdx = -1;
export function pickPrompt(): string {
  if (PROMPTS.length === 0) return '';
  let idx: number;
  do { idx = Math.floor(Math.random() * PROMPTS.length); }
  while (PROMPTS.length > 1 && idx === lastPromptIdx);
  lastPromptIdx = idx;
  return PROMPTS[idx];
}
