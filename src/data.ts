export const profile = {
  name: 'Hamza Masri',
  role: 'AI Engineer and DevOps Specialist',
  location: 'Rostock, Germany',
  intro:
    'I build production AI systems and the infrastructure that runs them. Currently managing Kubernetes microservices at DVZ M-V while developing LLM-based applications.',
  about: [
    'Computer scientist working at the point where machine learning meets production infrastructure. My work runs from vector search and retrieval pipelines to Helm charts and CI/CD.',
    'I completed my Bachelor\u2019s at the University of Rostock with a thesis on AI-powered geographic search, graded 1.8, and I am finishing my Master\u2019s while working at DVZ M-V.',
    'I work in German, English and Arabic.',
  ],
  links: {
    email: 'hamza1133@live.com',
    linkedin: 'https://www.linkedin.com/in/hamza-masri-945264240/',
    github: 'https://github.com/Hamza2314',
    cv: '/HamzaMasri_CV.pdf',
  },
}

export type Project = {
  title: string
  status: string
  body: string
  stack: string[]
}

export const projects: Project[] = [
  {
    title: 'Excessus',
    status: 'Prototype',
    body: 'A client intake system for German law firms. A prospective client describes their situation in natural language; a retrieval pipeline over legal source material turns it into a structured summary the firm can act on. Built solo on the Claude API, from the retrieval architecture through to the interface.',
    stack: ['Claude API', 'RAG', 'Python', 'Vector search'],
  },
  {
    title: 'Phantom',
    status: 'Prototype',
    body: 'A desktop platform for orchestrating browser automation across isolated account profiles. The hard problem is durability: a selector health system continuously validates and repairs DOM selectors as target sites change, so automations degrade visibly instead of failing silently.',
    stack: ['TypeScript', 'Electron', 'Vite', 'SQLite', 'Playwright'],
  },
  {
    title: 'AI-powered geographic search',
    status: 'Bachelor thesis, graded 1.8',
    body: 'Combined vector search with language models to improve retrieval quality in a geographic information system at DVZ M-V. A classifier identifies whether a user is a beginner or an expert and adapts results to match.',
    stack: ['Python', 'PyTorch', 'OpenAI', 'PHP'],
  },
  {
    title: 'Multi-stage content pipeline',
    status: 'Freelance',
    body: 'A full-cycle pipeline for specialist text: outline generation, drafting, legal review, SEO rework and a final editing pass, each stage a separate prompt with its own validation. Built on streaming Claude API calls with keyword research fed into the chain.',
    stack: ['Claude API', 'Python', 'Prompt engineering'],
  },
  {
    title: 'German-language email manager',
    status: 'Personal project',
    body: 'Classifies and prioritises incoming German email by semantic content, assigns topic tags, and drafts replies matched to the tone of the original message.',
    stack: ['Python', 'LLM API', 'React', 'PostgreSQL'],
  },
]

export const experience = [
  {
    period: '11/2024 — present',
    role: 'DevOps Engineer and Kubernetes Specialist',
    org: 'DVZ M-V GmbH',
    body: 'Containerised microservices and CMS platforms. Automation with Helm and CI/CD, monitoring with Prometheus and Grafana.',
  },
  {
    period: '07/2024 — 11/2024',
    role: 'Working Student, Machine Learning',
    org: 'DVZ M-V GmbH',
    body: 'Bachelor thesis project. AI search and user classification for geographic data.',
  },
  {
    period: '03/2024 — 07/2024',
    role: 'Software Development Intern, Full-Stack',
    org: 'DVZ M-V GmbH',
    body: 'GIS web applications, OpenStreetMap API integration, PHP test coverage.',
  },
  {
    period: '2021 — present',
    role: 'Freelance AI and Full-Stack Developer',
    org: 'Self-employed',
    body: 'Custom applications and AI integrations for small businesses: document analysis, chatbots, prompt pipelines.',
  },
]

export const education = [
  { period: 'in progress', title: 'M.Sc. Computer Science', org: 'University of Rostock' },
  { period: '2020 — 2024', title: 'B.Sc. Computer Science, final grade 1.8', org: 'University of Rostock' },
  { period: '2018 — 2019', title: 'Intensive German A1 to B2, final grade 1.3', org: 'Rostock' },
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
]

export const languages = [
  { name: 'Arabic', level: 'Native' },
  { name: 'English', level: 'C2' },
  { name: 'German', level: 'C1' },
  { name: 'Hebrew', level: 'A2' },
]
