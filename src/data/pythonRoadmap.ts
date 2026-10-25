// Topics taken from https://roadmap.sh/python (Python Developer roadmap), in the same top-to-bottom flow.
export interface RoadmapItem {
  id: string
  label: string
  group?: string // optional sub-heading inside a section
}
export interface RoadmapSection {
  id: string
  title: string
  items: RoadmapItem[]
}

const mk = (section: string, labels: string[], group?: string): RoadmapItem[] =>
  labels.map((label) => ({ id: `${section}:${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`, label, group }))

export const PYTHON_ROADMAP: RoadmapSection[] = [
  {
    id: 'basics',
    title: 'Learn the Basics',
    items: mk('basics', [
      'Basic Syntax',
      'Variables and Data Types',
      'Working with Strings',
      'Operators',
      'Conditionals',
      'Loops',
      'Type Casting',
      'Exceptions',
      'Functions, Builtin Functions',
      'Comments',
      'Type Annotations',
      'Lists',
      'Tuples',
      'Sets',
      'Dictionaries',
    ]),
  },
  {
    id: 'dsa',
    title: 'Data Structures & Algorithms',
    items: mk('dsa', ['Arrays and Linked Lists', 'HashMaps', 'Heaps, Stacks and Queues', 'Binary Search Tree', 'Recursion', 'Sorting Algorithms']),
  },
  {
    id: 'modules',
    title: 'Modules',
    items: [...mk('modules', ['Builtin', 'Custom'])],
  },
  {
    id: 'language',
    title: 'Core Language Features',
    items: mk('language', ['Lambdas', 'Error Handling', 'Decorators', 'Iterators', 'Regular Expressions', 'Variable Scope', 'List Comprehensions', 'Generator Expressions', 'Paradigms', 'Context Manager']),
  },
  {
    id: 'oop',
    title: 'Object Oriented Programming',
    items: mk('oop', ['Classes', 'Methods', 'Inheritance', 'Encapsulation']),
  },
  {
    id: 'packages',
    title: 'Package Managers & Packages',
    items: [
      ...mk('packages', ['PyPI', 'Pip', 'uv', 'Conda', 'Poetry', 'pdm'], 'Package managers'),
      ...mk('packages', ['pyproject.toml'], 'Configuration'),
      ...mk('packages', ['Common Packages'], 'Packages'),
    ],
  },
  {
    id: 'envs',
    title: 'Environments',
    items: mk('envs', ['virtualenv', 'Pipenv', 'pyenv']),
  },
  {
    id: 'frameworks',
    title: 'Learn a Framework',
    items: [
      ...mk('frameworks', ['Pyramid', 'Plotly Dash'], 'Synchronous'),
      ...mk('frameworks', ['gevent', 'aiohttp', 'Tornado', 'Sanic'], 'Asynchronous'),
      ...mk('frameworks', ['FastAPI', 'Django', 'Flask'], 'Synchronous + Asynchronous'),
    ],
  },
  {
    id: 'concurrency',
    title: 'Concurrency',
    items: mk('concurrency', ['GIL', 'Threading', 'Multiprocessing', 'Asynchrony']),
  },
  {
    id: 'typing',
    title: 'Static Typing',
    items: mk('typing', ['typing', 'mypy', 'pyright', 'pyre', 'Pydantic']),
  },
  {
    id: 'formatting',
    title: 'Code Formatting & Documentation',
    items: [...mk('formatting', ['black', 'ruff', 'yapf'], 'Code formatting'), ...mk('formatting', ['Sphinx'], 'Documentation')],
  },
  {
    id: 'testing',
    title: 'Testing',
    items: mk('testing', ['unittest / pyUnit', 'doctest', 'pytest', 'tox']),
  },
  {
    id: 'files',
    title: 'File Handling',
    items: mk('files', ['File Handling', 'glob']),
  },
]
