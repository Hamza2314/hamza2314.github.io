export const profile = {
  name: 'Hamza Masri',
  role: 'AI Engineer and DevOps Specialist',
  location: 'Rostock, Germany',
  intro: 'Building production AI systems and the infrastructure they run on.',
  about: [
    'DevOps Engineer and AI Developer with 2.5+ years of professional experience at DVZ M-V GmbH, currently writing my Master\u2019s thesis in Computer Science at the University of Rostock. Built and shipped multiple products end-to-end alongside my professional role.',
    'Strong in both practice and theory. On the infrastructure side: Kubernetes, Helm, CI/CD, and monitoring with Prometheus and Grafana, including a Keycloak deployment that gave the department single sign-on across its services. On the AI side: LLM integration, retrieval, prompt engineering, and AI automation.',
    'Both theses focus on AI. The Bachelor\u2019s thesis built an AI search system for geographic data, combining vector search with a classifier that tells beginners from experts and adapts results to match. The Master\u2019s thesis studies how much context a self-hosted coding agent needs when it can\u2019t have all of it.',
    'Working languages: German, English, and Arabic. Open to full-time AI engineering roles.',
  ],
  links: {
    email: 'hamza1133@live.com',
    linkedin: 'https://www.linkedin.com/in/hamza-masri-945264240/',
    github: 'https://github.com/Hamza2314',
    cv: '/HamzaMasri_CV.pdf',
  },
}

/** One picture in a project's gallery. The first is the one shown on the page. */
export type Shot = {
  src: string
  alt: string
  /** Shown under the picture in the gallery overlay. */
  caption: string
}

export type Project = {
  /** Names the project's screenshot files: public/projects/<slug>-<n>.<ext>. */
  slug: string
  title: string
  status: string
  body: string
  stack: string[]
  shots: Shot[]
}

/**
 * Cut to a card. Each body is one or two sentences, because a card that has to
 * scroll inside itself is a list again. The long version lives in the CV.
 */
export const projects: Project[] = [
  {
    slug: 'excessus',
    title: 'Excessus',
    status: 'Own venture, prototype',
    body: 'AI client intake for German law firms. Turns a prospective client’s own description of their situation into a structured brief a lawyer can act on. Built solo, from the RAG architecture to cold outreach to law firms.',
    stack: ['Claude API', 'RAG', 'Python', 'Vector search'],
    shots: [
      {
        src: '/projects/excessus-1.png',
        alt: 'Excessus chat widget open on a demo law firm website, mid-conversation about a rent increase',
        caption: 'The intake chat embedded on a law firm’s site with one script tag. A visitor describes a rent increase in plain words; the assistant asks one question at a time and never gives legal advice itself.',
      },
      {
        src: '/projects/excessus-2.webp',
        alt: 'Excessus lawyer inbox with a lead list, the full chat and an extracted case summary',
        caption: 'The lawyer’s inbox: incoming leads, the full conversation, and the case details pulled out of it, with area of law, summary, contact data and an estimated case value.',
      },
      {
        src: '/projects/excessus-3.webp',
        alt: 'Excessus chatbot settings with mode, accent colours and a live preview of the chat dialog',
        caption: 'Each firm styles its own assistant: dark or light mode, accent colour, teaser bubble and size, with a live preview of the chat dialog. Demo firm and fictional clients throughout.',
      },
    ],
  },
  {
    slug: 'mender',
    title: 'Mender',
    status: 'Prototype',
    body: "A workspace for social media agencies managing many client accounts across Twitter/X, Instagram and TikTok. Teams plan campaigns, draft content with AI, and schedule posting and community engagement from one dashboard. Each client's account stays in its own separate session. Built solo.",
    stack: ['TypeScript', 'Electron', 'SQLite', 'Playwright'],
    shots: [
      {
        src: '/projects/mender-1.webp',
        alt: 'Mender campaign list with paused and completed campaigns',
        caption: 'Campaigns with their accounts, item counts, status and categories. Each one runs on its own schedule with time windows, pacing and daily limits.',
      },
      {
        src: '/projects/mender-2.webp',
        alt: 'Mender accounts page with demo accounts grouped by category',
        caption: 'Accounts grouped into categories, each with its own session, proxy and activity counters. All accounts shown are demo data.',
      },
      {
        src: '/projects/mender-3.webp',
        alt: 'Mender campaign type picker above the campaign list',
        caption: 'The campaign types a run can be built from. Actions can be chained, so one campaign’s output feeds the next.',
      },
      {
        src: '/projects/mender-4.webp',
        alt: 'Mender AI model registry listing Claude models and their status',
        caption: 'The model registry: every AI model the app can call and whether it is still available, so a retired model gets swapped before a run fails.',
      },
    ],
  },
  {
    slug: 'geosearch',
    title: 'Geographic AI search',
    status: 'Bachelor thesis, grade 1.8',
    body: 'Vector search and language models for geographic information retrieval, plus a classifier that distinguishes beginners from experts and personalizes results. Built at DVZ M-V.',
    stack: ['Python', 'PyTorch', 'OpenAI', 'PHP'],
    shots: [
      {
        src: '/projects/geosearch-1.webp',
        alt: 'GeoPortal.MV start page with a natural-language query in the search box and an annotation describing the AI search layer',
        caption: 'GeoPortal.MV, the state geodata portal the thesis built on. The AI layer lets people ask in plain language and adapts results to beginners or experts. Annotated screenshot; the AI search was a thesis prototype.',
      },
    ],
  },
  {
    slug: 'pipeline',
    title: 'Content pipeline',
    status: 'Freelance',
    body: 'Five-stage LLM pipeline for specialized legal texts: outline, generation, legal review, SEO rework, final pass. Each stage has its own prompt and validation, running on streaming Claude API calls. Delivered with frontend and technical documentation.',
    stack: ['Claude API', 'Python', 'Prompt engineering'],
    shots: [
      {
        src: '/projects/pipeline-1.webp',
        alt: 'Legal SEO Content Generator start screen with a topic entered',
        caption: 'Step one: enter a legal topic and pull SEO keywords for it. Optional reference material can be added before generation starts.',
      },
      {
        src: '/projects/pipeline-2.webp',
        alt: 'Content generation step with outline and article buttons',
        caption: 'The outline is generated first and approved, then the article runs through writing, legal review, SEO rework and a final humanizing pass.',
      },
      {
        src: '/projects/pipeline-3.webp',
        alt: 'Agent settings showing the active Claude model and model family selection',
        caption: 'Model settings: the client can switch Claude model families, trading quality against speed and cost.',
      },
      {
        src: '/projects/pipeline-4.webp',
        alt: 'First page of a generated German article on narcotics criminal law',
        caption: 'Finished output: a structured German article on narcotics law, citing the relevant sections, exported as PDF.',
      },
    ],
  },
  {
    slug: 'seal',
    title: 'Seal tracking',
    status: 'University project, team of four',
    body: 'Finding and tracking seals and their body parts in drone footage with almost no labeled data. Self-supervised DINOv3 features separate the seals from moving water, cosine-guided SAM turns that into clean seal masks, and patch similarity carries the masks to later frames.',
    stack: ['Python', 'PyTorch', 'DINOv3', 'SAM'],
    shots: [
      {
        src: '/projects/seal-1.webp',
        alt: 'Drone frame of seals in water next to a DINO foreground score heatmap',
        caption: 'A drone frame and the foreground score from DINO features. Without any labels, the seals light up while the moving water stays dark.',
      },
      {
        src: '/projects/seal-2.webp',
        alt: 'Colour-coded segmentation masks, one per seal',
        caption: 'Seal masks used to start tracking, one colour per animal. DINOv3 patch similarity carries them to the following frames.',
      },
    ],
  },
]

export type Role = {
  title: string
  period: string
  body: string
}

export type Employer = {
  org: string
  /** The whole engagement, which is what the block is headed with. */
  period: string
  /** Absent where there is nothing to add beyond the span. */
  meta?: string
  /** Newest first. */
  roles: Role[]
}

/**
 * Grouped by employer rather than listed flat, so three promotions at one place
 * read as three promotions at one place. The flat version repeated the company
 * name three times and buried that.
 */
export const employment: Employer[] = [
  {
    org: 'DVZ M-V GmbH',
    period: '03/2024 — present',
    meta: 'Rostock · 2.5+ years',
    roles: [
      {
        title: 'DevOps Engineer and Kubernetes Specialist',
        period: '11/2024 — present',
        body: 'Containerized microservices and CMS platforms on Kubernetes. Automation with Helm and CI/CD, monitoring with Prometheus and Grafana, and a Keycloak Helm chart for centralized single sign-on.',
      },
      {
        title: 'Working Student, Machine Learning',
        period: '07/2024 — 11/2024',
        body: 'Bachelor thesis project: AI search for geographic data using vector search, language models, and user classification.',
      },
      {
        title: 'Software Development Intern, Full-Stack',
        period: '03/2024 — 07/2024',
        body: 'GIS web applications, OpenStreetMap API integration, PHP test coverage, and interactive frontend work.',
      },
    ],
  },
  {
    org: 'Self-employed',
    period: '2021 — 2026',
    roles: [
      {
        title: 'Freelance AI and Full-Stack Developer',
        period: '2021 — 2026',
        body: 'Custom websites and applications for small businesses, plus AI integrations: document analysis, chatbots, and prompt pipelines.',
      },
    ],
  },
]

export type Education = {
  period: string
  title: string
  org: string
  /** Its own line above the place, rather than tacked onto the title. */
  grade?: string
  /** Absent where there is nothing to add beyond the title. */
  body?: string
}

/** Oldest first, so the row reads forward in time from left to right. */
export const education: Education[] = [
  {
    period: '2012 — 2018',
    title: 'Shuafat High School',
    org: 'Jerusalem',
    grade: 'Average grade 1.6',
    body: 'Main subjects: computer science, mathematics, and physics, with further computer science electives taken beyond the required syllabus.',
  },
  {
    period: '2018 — 2019',
    title: 'Intensive German A1 to B2',
    org: 'Rostock',
    grade: 'Final grade 1.3',
  },
  {
    period: '2020 — 2024',
    title: 'B.Sc. Computer Science',
    org: 'University of Rostock',
    grade: 'Final grade 1.8',
    body: 'Focus areas: AI systems, software development, databases, algorithms, and data security.',
  },
  {
    period: '2024 — 2027 (expected)',
    title: 'M.Sc. Computer Science',
    org: 'University of Rostock',
    body: 'Master’s thesis: Context Provisioning for Self-Hosted Coding Agents under Resource Constraints: A Controlled Experimental Study.',
  },
]

export const skills = [
  {
    group: 'AI and machine learning',
    items: ['PyTorch', 'OpenAI API', 'Claude API', 'Prompt engineering', 'Vector search', 'scikit-learn', 'Ollama', 'LM Studio'],
  },
  {
    group: 'Infrastructure',
    items: ['Kubernetes', 'Helm', 'Docker', 'Jenkins', 'Azure', 'Prometheus', 'Grafana', 'Linux', 'Bash'],
  },
  {
    group: 'Languages and frameworks',
    items: ['Python', 'TypeScript', 'C#', 'PHP', 'Java', 'React', 'Angular', 'Flask'],
  },
  {
    group: 'Data',
    items: ['PostgreSQL', 'MySQL', 'SQLite', 'NumPy', 'Pandas'],
  },
  {
    group: 'Tools and workflow',
    items: ['Git', 'Jira', 'n8n', 'LaTeX', 'Figma'],
  },
]

export const languages = [
  { name: 'Arabic', level: 'Native' },
  { name: 'English', level: 'C2' },
  { name: 'German', level: 'C1' },
  { name: 'Hebrew', level: 'A2' },
]
