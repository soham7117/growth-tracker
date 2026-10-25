// Offline question bank: 2 questions per roadmap topic (one concept, one code-reading).
// Keys match item ids in pythonRoadmap.ts ("<section>:<slug>").
export interface Quiz {
  q: string
  code?: string
  correct: string
  wrong: string[]
  why: string
}

const Q = (q: string, correct: string, wrong: string[], why: string, code?: string): Quiz => ({ q, correct, wrong, why, code })

export const QUIZZES: Record<string, Quiz[]> = {
  // ---------- Learn the Basics ----------
  'basics:basic-syntax': [
    Q('How does Python mark the body of an if / for / def block?', 'Indentation', ['Curly braces { }', 'begin / end keywords', 'Semicolons'], 'Python uses consistent indentation to define blocks.'),
    Q('What is printed?', 'big, then done', ['done only', 'big only', 'IndentationError'], 'x > 3 is True so "big" prints; the last print is outside the if block.', 'x = 5\nif x > 3:\n    print("big")\nprint("done")'),
  ],
  'basics:variables-and-data-types': [
    Q('In Python, a variable is…', 'A name that references an object; the type belongs to the object', ['A fixed-type box declared with a type', 'Always a global constant', 'Created only with the var keyword'], 'Python is dynamically typed: names point to objects.'),
    Q('What does this print?', "<class 'float'>", ["<class 'int'>", "<class 'number'>", "<class 'double'>"], 'The / operator always returns a float in Python 3.', 'print(type(10 / 2))'),
  ],
  'basics:working-with-strings': [
    Q('Python strings are…', 'Immutable', ['Mutable', 'Limited to ASCII', 'Limited to 255 characters'], 'You cannot change a string in place; operations return new strings.'),
    Q('What does this print?', 'yth', ['pyth', 'ytho', 'yt'], 'Slice [1:4] takes indexes 1, 2, 3.', 's = "python"\nprint(s[1:4])'),
  ],
  'basics:operators': [
    Q('What does this print?', '3 1 8', ['3.5 1 6', '3 1 6', '4 1 8'], '// is floor division, % is remainder, ** is power.', 'print(7 // 2, 7 % 2, 2 ** 3)'),
    Q('Which operator tests whether two names point to the SAME object?', 'is', ['==', '===', 'equals'], '== compares values; "is" compares identity.'),
  ],
  'basics:conditionals': [
    Q('What is printed?', 'B', ['A', 'C', 'A and B'], '0 is falsy so the if is skipped; the elif condition x == 0 is True.', 'x = 0\nif x:\n    print("A")\nelif x == 0:\n    print("B")\nelse:\n    print("C")'),
    Q('Which of these is falsy?', '[] (an empty list)', ['"0" (a string)', '[0]', '" " (a space)'], 'Empty containers are falsy; non-empty strings and lists are truthy.'),
  ],
  'basics:loops': [
    Q('What is printed?', '0 1 2', ['1 2 3', '0 1 2 3', '0 1'], 'range(3) yields 0, 1, 2.', 'for i in range(3):\n    print(i, end=" ")'),
    Q('What does `break` do inside a loop?', 'Exits the loop immediately', ['Skips to the next iteration', 'Restarts the loop', 'Pauses one iteration'], '`continue` skips to the next iteration; `break` leaves the loop.'),
  ],
  'basics:type-casting': [
    Q('What does this print?', '43.5', ['421.5', '43', 'TypeError'], 'int("42") is 42 and float("1.5") is 1.5; adding gives 43.5.', 'print(int("42") + float("1.5"))'),
    Q("What does int('3.7') do?", 'Raises ValueError', ['Returns 3', 'Returns 4', 'Returns 3.7'], 'int() cannot parse a float-looking string; use int(float("3.7")).'),
  ],
  'basics:exceptions': [
    Q('What is printed?', 'oops, then done', ['done only', 'oops only', 'A traceback'], 'The ZeroDivisionError is caught, and finally always runs.', 'try:\n    print(1 / 0)\nexcept ZeroDivisionError:\n    print("oops")\nfinally:\n    print("done")'),
    Q('When does the `else` block of a try/except run?', 'Only if no exception was raised in try', ['Always', 'Only if an exception occurred', 'Only after finally'], 'try/except/else: else is the "no error" path.'),
  ],
  'basics:functions-builtin-functions': [
    Q('What does this print?', '5 7', ['5 5', '3 7', 'TypeError'], 'The default b=2 is used for add(3); add(3, 4) overrides it.', 'def add(a, b=2):\n    return a + b\nprint(add(3), add(3, 4))'),
    Q('What does a function return when it has no return statement?', 'None', ['0', 'An empty string', 'It raises an error'], 'Functions implicitly return None.'),
  ],
  'basics:comments': [
    Q('Which is a valid single-line comment?', '# note', ['// note', '/* note */', '-- note'], 'Python comments start with #.'),
    Q('A triple-quoted string as the first statement of a function is called…', 'A docstring', ['A block comment', 'A decorator', 'A type hint'], 'Docstrings are available via __doc__ and help().'),
  ],
  'basics:type-annotations': [
    Q('Do type annotations enforce types at runtime?', 'No — they are hints for tools and readers', ['Yes, always', 'Yes, but only inside functions', 'Only in the REPL'], 'Tools like mypy use them; the interpreter does not enforce them.'),
    Q('In `def f(x: int) -> str:` what does `-> str` mean?', 'f is expected to return a str', ['x is converted to str', 'f must be named str', 'f raises if x is not a str'], 'It is the return type annotation.'),
  ],
  'basics:lists': [
    Q('What does this print?', '[1, 2, 3, 4]', ['[1, 2, 3]', '[4]', 'Error'], 'b = a does not copy; both names reference the same list.', 'a = [1, 2, 3]\nb = a\nb.append(4)\nprint(a)'),
    Q('Amortized time complexity of list.append(x)?', 'O(1)', ['O(n)', 'O(log n)', 'O(n²)'], 'Dynamic arrays over-allocate, so appends are amortized constant time.'),
  ],
  'basics:tuples': [
    Q('Tuples are…', 'Immutable ordered sequences', ['Mutable ordered sequences', 'Unordered unique items', 'Key-value pairs'], 'Once created, a tuple cannot be changed.'),
    Q('What happens here?', 'TypeError', ['t becomes (9, 2)', 'Nothing', 'IndexError'], "Tuples don't support item assignment.", 't = (1, 2)\nt[0] = 9'),
  ],
  'basics:sets': [
    Q('What does this print?', '3', ['6', '2', 'Error'], 'Sets keep unique elements only: {1, 2, 3}.', 'print(len({1, 2, 2, 3, 3, 3}))'),
    Q('Which creates an EMPTY set?', 'set()', ['{}', '[]', '()'], '{} creates an empty dict.'),
  ],
  'basics:dictionaries': [
    Q('What does this print?', '0 1', ['None 1', 'KeyError', '0 0'], 'get() returns the default (0) for a missing key; len(d) is 1.', 'd = {"a": 1}\nprint(d.get("b", 0), len(d))'),
    Q('Which of these can be a dictionary key?', 'A tuple of ints', ['A list', 'A set', 'A dict'], 'Keys must be hashable (immutable); lists, sets and dicts are not.'),
  ],

  // ---------- Data Structures & Algorithms ----------
  'dsa:arrays-and-linked-lists': [
    Q('Index access arr[i] on an array / Python list is…', 'O(1)', ['O(n)', 'O(log n)', 'O(n²)'], 'Arrays are contiguous, so index access is constant time.'),
    Q('Inserting at the head of a singly linked list is…', 'O(1)', ['O(n)', 'O(log n)', 'O(n log n)'], 'You only rewire the head pointer.'),
  ],
  'dsa:hashmaps': [
    Q('Average time for a dict lookup by key?', 'O(1)', ['O(n)', 'O(log n)', 'O(n log n)'], 'Hash tables give average constant-time lookups.'),
    Q('Two different keys land in the same bucket. This is called…', 'A collision, handled with chaining or open addressing', ['An overflow that deletes the old key', 'A KeyError', 'A merge of both keys'], 'Python uses open addressing to resolve collisions.'),
  ],
  'dsa:heaps-stacks-and-queues': [
    Q('What does this print?', '1', ['5', '3', '[1, 3, 5]'], 'heapq is a min-heap; heappop returns the smallest item.', 'import heapq\nh = [5, 1, 3]\nheapq.heapify(h)\nprint(heapq.heappop(h))'),
    Q('A stack removes items in what order?', 'LIFO (last in, first out)', ['FIFO', 'Random', 'Sorted'], 'A queue is FIFO; a stack is LIFO.'),
  ],
  'dsa:binary-search-tree': [
    Q('An in-order traversal of a BST visits nodes in…', 'Sorted ascending order', ['Level order', 'Reverse insertion order', 'Random order'], 'left → node → right gives sorted output.'),
    Q('Search in a balanced BST is…', 'O(log n)', ['O(1)', 'O(n)', 'O(n log n)'], 'Each comparison halves the remaining tree.'),
  ],
  'dsa:recursion': [
    Q('What does this print?', '10', ['4', '24', 'RecursionError'], '4 + 3 + 2 + 1 + 0 = 10.', 'def f(n):\n    if n == 0:\n        return 0\n    return n + f(n - 1)\nprint(f(4))'),
    Q('What prevents infinite recursion?', 'A base case', ['A return type', 'The GIL', 'A global variable'], 'Every recursive function needs a terminating base case.'),
  ],
  'dsa:sorting-algorithms': [
    Q("Python's built-in sorted() and list.sort() use…", 'Timsort', ['Quicksort', 'Bubble sort', 'Heap sort'], 'Timsort is a stable hybrid of merge sort and insertion sort.'),
    Q('What does this print?', '[3, 2, 1]', ['[1, 2, 3]', '[2, 1, 3]', 'None'], 'reverse=True sorts descending and sorted() returns a new list.', 'print(sorted([3, 1, 2], reverse=True))'),
  ],

  // ---------- Modules ----------
  'modules:builtin': [
    Q('What does this print?', '4.0', ['4', '16', 'Error'], 'math.sqrt always returns a float.', 'import math\nprint(math.sqrt(16))'),
    Q('Which standard-library module reads and writes JSON?', 'json', ['pickle', 'csv', 'jsonlib'], 'json.loads / json.dumps live in the json module.'),
  ],
  'modules:custom': [
    Q('How do you import a function foo from your own file utils.py?', 'from utils import foo', ['import foo from utils', 'include utils.foo', 'using utils: foo'], 'Use "from module import name".'),
    Q("What does `if __name__ == '__main__':` do?", 'Runs the block only when the file is executed directly, not when imported', ['Defines the main function', 'Imports the main module', 'Runs only on import'], '__name__ is "__main__" only for the entry-point script.'),
  ],

  // ---------- Core Language Features ----------
  'language:lambdas': [
    Q('What does this print?', '12', ['7', '34', 'SyntaxError'], 'The lambda multiplies its two arguments.', 'f = lambda x, y: x * y\nprint(f(3, 4))'),
    Q('A lambda body can contain…', 'A single expression', ['Multiple statements', 'Loops and assignments', 'Class definitions'], 'Lambdas are limited to one expression.'),
  ],
  'language:error-handling': [
    Q('How do you raise your own exception?', "raise ValueError('msg')", ["throw ValueError('msg')", "error ValueError('msg')", "except ValueError('msg')"], 'Python uses the raise keyword.'),
    Q('What is printed?', 'ValueError', ['TypeError', 'Exception', 'Nothing'], 'int("x") raises ValueError, which matches the tuple in except.', 'try:\n    int("x")\nexcept (ValueError, TypeError) as e:\n    print(type(e).__name__)'),
  ],
  'language:decorators': [
    Q('A decorator is…', 'A callable that takes a function and returns a (usually wrapped) function', ['A class attribute', 'A comment style', 'A special loop'], '@deco above def f is shorthand for f = deco(f).'),
    Q('What is printed?', 'before, then hi', ['hi, then before', 'hi only', 'before only'], 'hi is replaced by the wrapper, which prints "before" then calls the original.', 'def deco(f):\n    def w():\n        print("before")\n        f()\n    return w\n\n@deco\ndef hi():\n    print("hi")\n\nhi()'),
  ],
  'language:iterators': [
    Q('Which methods make an object an iterator?', '__iter__ and __next__', ['__len__ and __getitem__ only', '__loop__ and __step__', '__enter__ and __exit__'], 'An iterator returns itself from __iter__ and yields values from __next__.'),
    Q('What happens in this snippet?', 'Prints "1 2", then raises StopIteration', ['Prints "1 2", then None', 'Prints "1 2", then 1', 'Prints "1 2", then IndexError'], 'An exhausted iterator raises StopIteration.', 'it = iter([1, 2])\nprint(next(it), next(it))\nprint(next(it))'),
  ],
  'language:regular-expressions': [
    Q('What does this print?', "['12', '345']", ["['1', '2', '3', '4', '5']", "['12345']", "['a', 'b']"], 'The pattern \\d+ matches runs of digits.', 'import re\nprint(re.findall(r"\\d+", "a12b345"))'),
    Q('re.match differs from re.search because match…', 'Only matches at the beginning of the string', ['Returns all matches', 'Is case-insensitive', 'Matches only at the end'], 'search scans the whole string.'),
  ],
  'language:variable-scope': [
    Q('What does this print?', '1', ['2', 'None', 'UnboundLocalError'], 'x = 2 inside f creates a new local variable.', 'x = 1\ndef f():\n    x = 2\nf()\nprint(x)'),
    Q('Which keyword lets a function rebind a module-level variable?', 'global', ['nonlocal', 'static', 'extern'], 'nonlocal is for enclosing (non-global) function scopes.'),
  ],
  'language:list-comprehensions': [
    Q('What does this print?', '[0, 4]', ['[0, 1, 4, 9]', '[0, 2]', '[4, 16]'], 'Only even x (0 and 2) pass the filter; they are squared.', 'print([x * x for x in range(4) if x % 2 == 0])'),
    Q('Key difference between [x for x in a] and (x for x in a)?', 'The second is a lazy generator', ['The second is a tuple', 'The first is lazy', 'There is none'], 'Parentheses create a generator expression, not a tuple.'),
  ],
  'language:generator-expressions': [
    Q('What does this print?', '3 0', ['3 3', '0 0', '3 6'], 'A generator is exhausted after the first sum().', 'g = (i for i in range(3))\nprint(sum(g), sum(g))'),
    Q('Why use a generator for huge data?', 'It yields items lazily and uses little memory', ['It sorts data automatically', 'It uses several CPU cores', 'It stores everything in a database'], 'Items are produced on demand.'),
  ],
  'language:paradigms': [
    Q('Which paradigms does Python support?', 'Procedural, object-oriented and functional styles', ['Only object-oriented', 'Only procedural', 'Only functional'], 'Python is multi-paradigm.'),
    Q('Which is a functional-style tool in Python?', 'map / filter with lambdas', ['Class inheritance', 'Global variables', 'try / finally'], 'Higher-order functions are a functional idiom.'),
  ],
  'language:context-manager': [
    Q("What does `with open('f') as f:` guarantee?", 'The file is closed when the block exits, even on exceptions', ['The file is fully read into memory', 'The file is locked forever', 'Nothing special'], 'Context managers handle cleanup.'),
    Q('Which methods define a context manager class?', '__enter__ and __exit__', ['__open__ and __close__', '__start__ and __stop__', '__init__ and __del__'], 'The with statement calls __enter__ then __exit__.'),
  ],

  // ---------- OOP ----------
  'oop:classes': [
    Q('What does this print?', '5', ['None', 'A', 'Error'], '__init__ stores n on the new instance.', 'class A:\n    def __init__(self, n):\n        self.n = n\nprint(A(5).n)'),
    Q('What does `self` refer to?', 'The instance the method is called on', ['The class itself', 'The parent class', 'A global object'], 'Python passes the instance as the first argument.'),
  ],
  'oop:methods': [
    Q('Which decorator defines a method that receives the CLASS instead of the instance?', '@classmethod', ['@staticmethod', '@property', '@instancemethod'], 'A classmethod gets cls as its first argument.'),
    Q('What does this print?', 'hi', ['TypeError (missing self)', 'None', 'A'], 'Static methods take no implicit first argument.', 'class A:\n    @staticmethod\n    def hi():\n        return "hi"\nprint(A.hi())'),
  ],
  'oop:inheritance': [
    Q('What does this print?', 'BA', ['AB', 'B', 'A'], 'B.f returns "B" plus the parent result "A".', 'class A:\n    def f(self): return "A"\nclass B(A):\n    def f(self): return "B" + super().f()\nprint(B().f())'),
    Q('What does MRO stand for?', 'Method Resolution Order', ['Module Registry Object', 'Main Runtime Order', 'Method Reference Object'], 'It defines the lookup order across base classes.'),
  ],
  'oop:encapsulation': [
    Q("Python's convention for 'private' attributes is…", 'A leading underscore (_x), or name mangling with __x', ['The private keyword', 'A header file', 'The final keyword'], 'Privacy is by convention, not enforced.'),
    Q('What does @property allow?', 'Accessing a method like an attribute, with controlled get / set', ['Making an attribute a global constant', 'Static typing', 'Multiple inheritance'], 'It gives attribute syntax with method logic.'),
  ],

  // ---------- Package Managers & Packages ----------
  'packages:pypi': [
    Q('PyPI is…', 'The official third-party package repository for Python', ['A Python interpreter', 'A type checker', 'A testing framework'], 'pip downloads from PyPI by default.'),
    Q('Where does `pip install` fetch packages from by default?', 'PyPI', ['GitHub trending', 'Only your local disk', 'conda-forge'], 'The default index is pypi.org.'),
  ],
  'packages:pip': [
    Q('Command to install the requests package?', 'pip install requests', ['pip get requests', 'python install requests', 'pip add requests'], 'pip install <package>.'),
    Q('Which command writes installed packages to a file?', 'pip freeze > requirements.txt', ['pip save requirements.txt', 'pip export', 'pip list --write'], 'pip freeze prints pinned versions; redirect to a file.'),
  ],
  'packages:uv': [
    Q('uv is…', 'A very fast Python package and project manager written in Rust', ['A web framework', 'A linter only', 'A Python fork'], 'uv comes from Astral, the makers of ruff.'),
    Q('Which command adds a dependency to a uv project and records it?', 'uv add requests', ['uv get requests', 'uv fetch requests', 'uv grab requests'], 'uv add updates pyproject.toml and the lock file.'),
  ],
  'packages:conda': [
    Q('conda can manage…', 'Environments and non-Python packages too', ['Only pure-Python wheels', 'Only Docker images', 'Only Git repos'], 'Conda is language-agnostic, popular in data science.'),
    Q('Create a conda environment named ml?', 'conda create -n ml', ['conda new ml', 'conda env make ml', 'conda init ml'], 'conda create -n <name> [packages].'),
  ],
  'packages:poetry': [
    Q('Poetry records dependencies in…', 'pyproject.toml (with a poetry.lock file)', ['setup.cfg only', 'Pipfile', 'requirements.in'], 'Poetry uses pyproject.toml plus poetry.lock.'),
    Q('Poetry command to add a dependency?', 'poetry add requests', ['poetry install requests', 'poetry get requests', 'poetry pip requests'], 'poetry add <pkg>.'),
  ],
  'packages:pdm': [
    Q('PDM stores project metadata following…', 'PEP 621 (pyproject.toml)', ['PEP 8', 'PEP 20', 'PEP 484'], 'PEP 621 standardizes project metadata in pyproject.toml.'),
    Q('Command to add a dependency with PDM?', 'pdm add requests', ['pdm get requests', 'pdm put requests', 'pdm pull requests'], 'pdm add <pkg>.'),
  ],
  'packages:pyproject-toml': [
    Q('pyproject.toml is…', 'The standard config file for project metadata and build / tool settings', ['A virtualenv folder', 'A list of installed versions only', 'A Python entry script'], 'Defined by PEP 518 / 621.'),
    Q('Which table declares the build backend?', '[build-system]', ['[project]', '[tool.build]', '[backend]'], '[build-system] holds requires and build-backend.'),
  ],
  'packages:common-packages': [
    Q('Which package is the de-facto standard for making HTTP requests?', 'requests', ['numpy', 'pandas', 'pytest'], 'requests.get(url) is the classic API.'),
    Q('Which package is best for tabular data analysis?', 'pandas', ['flask', 'black', 'tox'], 'pandas provides DataFrames.'),
  ],

  // ---------- Environments ----------
  'envs:virtualenv': [
    Q('Why use a virtual environment?', 'To isolate each project\'s dependencies', ['To make Python faster', 'To compile code', 'To avoid writing tests'], 'Different projects can need different versions of the same library.'),
    Q('Create a virtual environment in a folder named .venv?', 'python -m venv .venv', ['python venv new .venv', 'pip venv .venv', 'python --env .venv'], 'venv is in the standard library.'),
  ],
  'envs:pipenv': [
    Q('Pipenv combines…', 'pip and virtualenv using a Pipfile', ['pip and Docker', 'conda and poetry', 'git and pip'], 'It manages the environment and dependencies together.'),
    Q('Pipfile.lock is for…', 'Reproducible, pinned dependency versions', ['Locking the interpreter binary', 'Encrypting your code', 'Blocking pip'], 'The lock file records exact versions and hashes.'),
  ],
  'envs:pyenv': [
    Q('pyenv is used to…', 'Install and switch between multiple Python versions', ['Create type stubs', 'Lint code', 'Package wheels'], 'It manages interpreters, not packages.'),
    Q("Set a project's Python version with pyenv?", 'pyenv local 3.12.0', ['pyenv use 3.12.0 --here', 'pyenv set 3.12.0', 'pyenv pin 3.12.0'], 'pyenv local writes a .python-version file.'),
  ],

  // ---------- Frameworks ----------
  'frameworks:pyramid': [
    Q('Pyramid is…', 'A flexible Python web framework', ['A data-viz library', 'A testing tool', 'An ORM only'], 'It scales from tiny apps to large ones.'),
    Q('Pyramid apps are served over which interface?', 'WSGI', ['ASGI only', 'CGI only', 'FastCGI only'], 'Pyramid is a synchronous WSGI framework.'),
  ],
  'frameworks:plotly-dash': [
    Q('Dash is used to build…', 'Interactive analytical web dashboards in Python', ['Mobile apps', 'Compilers', 'Game engines'], 'Dash is built on Flask, Plotly and React.'),
    Q('In Dash, interactivity is wired with…', 'Callbacks linking inputs to outputs', ['SQL triggers', 'Cron jobs', 'Template inheritance'], '@app.callback(Output, Input).'),
  ],
  'frameworks:gevent': [
    Q('gevent provides concurrency using…', 'Greenlets (cooperative lightweight coroutines)', ['OS processes only', 'Threads only', 'Compiled C extensions only'], 'Greenlets yield on blocking I/O.'),
    Q('What does gevent.monkey.patch_all() do?', 'Makes standard blocking library calls cooperative', ['Fixes syntax bugs', 'Compiles Python to C', 'Updates pip'], 'It swaps blocking stdlib parts for gevent versions.'),
  ],
  'frameworks:aiohttp': [
    Q('aiohttp is…', 'An async HTTP client / server library built on asyncio', ['A sync-only HTTP library', 'A template engine', 'An ORM'], 'It is used with async / await.'),
    Q('Which keyword gets the result of calling a coroutine inside async code?', 'await', ['yield', 'async', 'next'], 'await suspends until the coroutine finishes.'),
  ],
  'frameworks:tornado': [
    Q('Tornado is known for…', 'Non-blocking networking and long-lived connections such as WebSockets', ['A built-in ORM and admin', 'Being sync-only', 'Frontend rendering'], 'It was built for real-time web services.'),
    Q('Modern Tornado runs its event loop on…', 'asyncio', ['gevent', 'multiprocessing', 'Twisted'], 'Since Tornado 5 it integrates with asyncio.'),
  ],
  'frameworks:sanic': [
    Q('Sanic is…', 'An async Python web framework built for speed', ['A WSGI-only sync framework', 'A CSS framework', 'A package manager'], 'It uses async / await and ASGI.'),
    Q('Sanic route handlers are typically declared with…', 'async def', ['def only', 'lambda', 'class only'], 'Handlers are coroutines.'),
  ],
  'frameworks:fastapi': [
    Q('FastAPI uses which for request validation?', 'Pydantic models and type hints', ['Jinja2', 'Django forms', 'Marshmallow only'], 'Type hints drive validation and docs.'),
    Q('FastAPI auto-generates interactive API docs at…', '/docs (Swagger UI)', ['/admin', '/swagger-py', '/help'], 'It also serves /redoc.'),
  ],
  'frameworks:django': [
    Q('Django describes its architecture as…', 'MTV — Model, Template, View', ['MVP', 'Flux', 'Hexagonal'], 'Django\'s "view" is the controller; the template is the presentation.'),
    Q('Command to create a new Django project?', 'django-admin startproject mysite', ['django new mysite', 'python manage.py init mysite', 'pip startproject mysite'], 'startproject scaffolds the project.'),
  ],
  'frameworks:flask': [
    Q("What does @app.route('/') do?", 'Maps the URL path / to the view function below it', ['Runs the function at startup', 'Creates a database', 'Imports a template'], 'Routes bind URLs to view functions.', 'from flask import Flask\napp = Flask(__name__)\n\n@app.route("/")\ndef home():\n    return "Hi"'),
    Q('Flask is typically called a…', 'Micro-framework', ['Full-stack framework with ORM and admin', 'Async-only framework', 'Desktop GUI toolkit'], 'It ships a small core; you add extensions as needed.'),
  ],

  // ---------- Concurrency ----------
  'concurrency:gil': [
    Q('What does the GIL do in CPython?', 'Lets only one thread execute Python bytecode at a time', ['Speeds up threads', 'Locks files', 'Prevents all multiprocessing'], 'It protects interpreter internals (memory management).'),
    Q('Because of the GIL, threads are poor for…', 'CPU-bound work', ['I/O-bound work', 'Sleeping', 'Network waits'], 'Threads release the GIL during I/O, but not during pure-Python computation.'),
  ],
  'concurrency:threading': [
    Q('Threads are best suited to…', 'I/O-bound tasks', ['CPU-bound parallel math', 'GPU training', 'Compiling C'], 'While one thread waits for I/O, another can run.'),
    Q('Which starts a thread that runs work()?', 'threading.Thread(target=work).start()', ['threading.run(work)', 'Thread(work()).start()', 'threading.start(work)'], 'Pass the function itself (no parentheses) as target.'),
  ],
  'concurrency:multiprocessing': [
    Q('multiprocessing avoids the GIL by using…', 'Separate processes, each with its own interpreter', ['More threads', 'async / await', 'Green threads'], 'Each process has its own GIL.'),
    Q('Data sent between processes must be…', 'Serialized (pickled) or placed in shared objects', ['Automatically shared like threads', 'Impossible to share', 'Stored in the GIL'], 'Processes do not share memory by default.'),
  ],
  'concurrency:asynchrony': [
    Q('What does `await` do?', 'Pauses this coroutine so the event loop can run others until the result is ready', ['Blocks the whole thread', 'Starts a new process', 'Creates a thread'], 'It is cooperative multitasking.', 'import asyncio\nasync def main():\n    await asyncio.sleep(1)\n    print("done")\nasyncio.run(main())'),
    Q('asyncio is best for…', 'Many concurrent I/O-bound tasks in a single thread', ['Heavy CPU number crunching', 'Using multiple CPU cores', 'GPU work'], 'It excels at waiting on lots of network / file operations.'),
  ],

  // ---------- Static Typing ----------
  'typing:typing': [
    Q('Optional[int] means…', 'int or None', ['An argument that can be omitted', 'Only int', 'A list of int'], 'It is shorthand for Union[int, None] (int | None).'),
    Q('Which hint describes a list of strings (modern syntax)?', 'list[str]', ['list(str)', '[str]', 'List<str>'], 'Built-in generics work from Python 3.9.'),
  ],
  'typing:mypy': [
    Q('mypy is…', 'A static type checker', ['A formatter', 'A test runner', 'A web framework'], 'It reads annotations without running your code.'),
    Q('When does mypy check types?', 'Before running — static analysis', ['At runtime only', 'During pip install', 'Only in production'], 'Run it in CI or your editor.'),
  ],
  'typing:pyright': [
    Q('Pyright is developed by…', 'Microsoft', ['Google', 'Meta', 'JetBrains'], 'It powers Pylance in VS Code.'),
    Q('Pyright is a…', 'Static type checker', ['Package manager', 'Formatter', 'Profiler'], 'It is fast and written in TypeScript.'),
  ],
  'typing:pyre': [
    Q('Pyre is a type checker from…', 'Meta (Facebook)', ['Microsoft', 'Google', 'Dropbox'], 'Pyre was built for Meta\'s huge Python codebase.'),
    Q('Pyre is designed to…', 'Check very large codebases quickly and incrementally', ['Format code', 'Run tests', 'Build packages'], 'Speed on large projects is its focus.'),
  ],
  'typing:pydantic': [
    Q('What does this print (default lax mode)?', '7 (as the int 7)', ["'7' (a string)", 'ValidationError', 'None'], 'Pydantic coerces "7" into int 7.', 'from pydantic import BaseModel\nclass U(BaseModel):\n    age: int\nprint(U(age="7").age)'),
    Q('Which error does Pydantic raise for invalid data?', 'ValidationError', ['SyntaxError', 'It silently ignores it', 'IndexError'], 'It lists every failing field.'),
  ],

  // ---------- Formatting & docs ----------
  'formatting:black': [
    Q('Black is…', 'An opinionated code formatter', ['A type checker', 'A test runner', 'A docs generator'], 'It reformats your code to one consistent style.'),
    Q("Black's philosophy is…", 'Minimal configuration — one consistent style', ['Maximum configurability', 'Only fixing lint errors', 'Only sorting imports'], '"Any color you like, as long as it\'s black."'),
  ],
  'formatting:ruff': [
    Q('Ruff is…', 'An extremely fast linter and formatter written in Rust', ['A Python interpreter', 'A web server', 'A package registry'], 'It comes from Astral.'),
    Q('Ruff can replace tools such as…', 'flake8, isort and (for formatting) black', ['pytest and tox', 'Django and Flask', 'pip and conda'], 'It bundles many lint rules and a formatter.'),
  ],
  'formatting:yapf': [
    Q('YAPF stands for…', 'Yet Another Python Formatter', ['Your Awesome Python Framework', 'Yield And Process Faster', 'Yet Another Package File'], 'It is Google\'s formatter.'),
    Q('Which is a built-in YAPF style?', 'pep8', ['javascript', 'rustfmt', 'gofmt'], 'Others include google and facebook.'),
  ],
  'formatting:sphinx': [
    Q('Sphinx generates…', 'Documentation (HTML / PDF) from reStructuredText / Markdown and docstrings', ['Unit tests', 'Type stubs', 'Wheels'], 'It is the standard for Python project docs.'),
    Q('Which Sphinx extension pulls documentation from docstrings?', 'autodoc', ['autotest', 'docgrab', 'pydoc-sync'], 'sphinx.ext.autodoc.'),
  ],

  // ---------- Testing ----------
  'testing:unittest-pyunit': [
    Q('A unittest test method name must start with…', 'test', ['check', 'spec', 'it_'], 'The loader discovers methods starting with "test".', 'import unittest\nclass T(unittest.TestCase):\n    def test_add(self):\n        self.assertEqual(1 + 1, 2)'),
    Q('Which method runs before EACH test?', 'setUp', ['beforeEach', 'init', 'prepare'], 'tearDown runs after each test.'),
  ],
  'testing:doctest': [
    Q('doctest finds tests in…', 'Interactive-style examples (>>>) inside docstrings', ['Files named test_*.py', 'Comments starting with #', 'JSON files'], 'It runs the examples and compares output.'),
    Q('Run a module\'s doctests with…', 'python -m doctest -v module.py', ['python -m doc module.py', 'python doctest.run', 'python -t doc module.py'], '-v shows every example.'),
  ],
  'testing:pytest': [
    Q('How do you assert in pytest?', 'Plain `assert` statements with rich failure output', ['self.assertEqual only', 'expect()', 'must()'], 'pytest rewrites asserts to show details.'),
    Q('A pytest fixture is defined with…', '@pytest.fixture', ['@pytest.setup', '@fixture.new', '@pytest.before'], 'Fixtures are injected by argument name.'),
  ],
  'testing:tox': [
    Q('tox is used to…', 'Run tests in multiple isolated environments / Python versions', ['Format code', 'Publish to PyPI only', 'Profile memory'], 'It creates a venv per environment.'),
    Q('tox is configured in…', 'tox.ini (or pyproject.toml)', ['tox.yaml only', 'setup.exe', 'Toxfile'], 'tox.ini is the classic location.'),
  ],

  // ---------- Files ----------
  'files:file-handling': [
    Q("What does mode 'w' do?", 'Opens for writing and truncates existing content', ['Appends to the end', 'Opens read-only', 'Opens in binary mode'], "'a' appends; 'r' reads.", 'with open("a.txt", "w") as f:\n    f.write("hi")'),
    Q('Which mode appends to a file?', "'a'", ["'w'", "'r+' only", "'x'"], "'x' creates exclusively and fails if the file exists."),
  ],
  'files:glob': [
    Q("glob.glob('*.py') returns…", 'A list of paths matching the pattern', ['A file object', 'A single string', 'A generator of lines'], 'It matches files in the current directory.'),
    Q('Which call matches .py files recursively?', "glob.glob('**/*.py', recursive=True)", ["glob.glob('**/*.py')", "glob.glob('*.py/*')", "glob.glob('...py')"], 'Without recursive=True, ** behaves like *.'),
  ],
}
