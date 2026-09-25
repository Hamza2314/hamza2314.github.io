export const profile = {
  name: 'Hamza Masri',
  role: 'AI Engineer and DevOps Specialist',
  location: 'Rostock, Germany',
  intro:
    'I build production AI systems and the infrastructure that runs them. Currently managing Kubernetes microservices at DVZ M-V while developing LLM-based applications.',
  about: [
    'I build AI systems and the infrastructure they run on. At DVZ M-V that means containerised microservices on Kubernetes: Helm charts, CI/CD, Prometheus and Grafana, and a Keycloak deployment that gave the department single sign-on across its services.',
    'My Bachelor\u2019s thesis built an AI search system for a geographic information platform, pairing vector search with a classifier that tells a beginner from an expert and adapts the results to match. It was graded 1.8. My Master\u2019s thesis, also with DVZ M-V, asks how much context a self-hosted coding agent actually needs when it cannot have all of it.',
    'The rest of what I know came from shipping things end to end. Excessus turns a prospective client\u2019s description of their own situation into something a German law firm can act on \u2014 built solo, from the retrieval architecture through to the cold outreach that found the first firms.',
    'I work in German, English and Arabic, and I am looking for an AI engineering role in Munich.',
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

/**
 * Cut to a cell. Each body is one or two sentences, because a panel that has to
 * scroll inside itself is a list again. The long version lives in the CV.
 */
export const projects: Project[] = [
  {
    title: 'Excessus',
    status: 'Own venture',
    body: 'Turns a prospective client’s own account of their situation into a brief a German law firm can act on. Built solo, architecture through to the outreach that found the first firms.',
    stack: ['Claude API', 'RAG', 'Python', 'Vector search'],
  },
  {
    title: 'Phantom',
    status: 'Prototype',
    body: 'Browser automation across isolated account profiles. A selector health system repairs DOM selectors as target sites change, so automations degrade visibly instead of failing silently.',
    stack: ['TypeScript', 'Electron', 'SQLite', 'Playwright'],
  },
  {
    title: 'Geographic AI search',
    status: 'Bachelor thesis, 1.8',
    body: 'Vector search paired with a classifier that tells a beginner from an expert and adapts the results to match. Built at DVZ M-V.',
    stack: ['Python', 'PyTorch', 'OpenAI', 'PHP'],
  },
  {
    title: 'Content pipeline',
    status: 'Freelance',
    body: 'Outline, draft, legal review, SEO rework, final pass — five stages, each its own prompt with its own validation, over streaming Claude calls.',
    stack: ['Claude API', 'Python', 'Prompt engineering'],
  },
  {
    title: 'Email manager',
    status: 'Freelance',
    body: 'Classifies and prioritises German email by semantic content, and drafts replies matched to the tone of the original.',
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
