# Contributing

## Introduction

Thanks for your interest in Raptor! Contributions of all kinds are welcome -
whether you're reporting bugs, suggesting features, improving documentation, or
sharing the project with others.

## Ways to Contribute

### Report Issues

Found a bug or have a suggestion?
[Create an issue](https://github.com/raptor-js/kernel/issues/new/choose) using
one of our templates:

- **Bug Report** - Something's not working as expected
- **Feature Request** - Ideas for new features or improvements
- **Documentation Issue** - Docs that are missing, unclear, or incorrect
- **Question** - General questions or discussions

When reporting issues:

- Be specific about the runtime you're using (Deno, Node.js, or Bun)
- Include version numbers for both Raptor and your runtime
- Provide minimal reproduction code when possible
- Describe what you expected vs what actually happened

### Submit Pull Requests

We love pull requests! Here's how to contribute code:

#### Getting Started

```sh
# Fork and clone the repository.
git clone https://github.com/YOUR_USERNAME/kernel.git

cd kernel

# Run tests.
npm test

# Run tests in watch mode while developing.
npm run test:watch
```

#### Pull Request Guidelines

- **Keep it focused** - One feature or fix per PR
- **Write tests** - New features should include tests
- **Follow the style** - Run `npm run format` before committing
- **Update docs** - If you change APIs, provide documentation
- **Cross-runtime** - Ensure changes work across Deno, Node.js, and Bun when
  applicable

#### Code Philosophy

Raptor follows "No boilerplate, maximum clarity":

- Prefer readable code over clever code
- Smart defaults with full control
- Early returns over deep nesting
- Single responsibility methods
- TypeScript-first with proper type safety

#### Commit Messages

Keep commit messages clear and descriptive:

```txt
✅ Good:
- "Add custom error handler validation"
- "Fix processor weight bounds checking"
- "Update context detection for JSON responses"

❌ Avoid:
- "Fix bug"
- "Update stuff"
- "WIP"
```

### Star the Project

The simplest way to show support! A star on
[GitHub](https://github.com/raptor-js/kernel) helps others discover Raptor.

### Use the Project

The best contribution is using Raptor in your projects:

```sh
# npm
npm install @raptor-js/kernel

# Yarn
yarn add @raptor-js/kernel

# pnpm
pnpm add @raptor-js/kernel

# Bun
bun add @raptor-js/kernel

# Deno
deno add npm:@raptor-js/kernel
```

- Build something awesome with it
- Report real-world use cases and pain points
- Share your success stories
- Provide feedback on the developer experience

## Development Setup

### Prerequisites

Raptor supports Deno, Bun & Node runtimes. The packages are built and tested
with Node, so you need Node to contribute.

- [Node](https://nodejs.org) 26 or higher
- [Deno](https://deno.com) 2.6.4 or higher
- [Bun](https://bun.com) 1.3.5 or higher
- Git

### Project Structure

```txt
kernel/
├── src/
│   ├── error/             # Built-in HTTP error classes
│   ├── interfaces/        # TypeScript interfaces
│   ├── request/           # Connection info and client addresses
│   ├── response/          # Response management and processors
│   └── server/            # Server adapters for each runtime
├── benchmark.ts           # Benchmarks against Hono
└── mod.ts                 # Entry point
```

Tests sit next to the code they cover, as `*.test.ts` files.

### Running Tests

```sh
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Code Quality

```sh
# Format code
npm run format

# Lint code
npm run lint

# Type check
npm run typecheck
```

## Questions?

- Check out the [documentation](https://raptorjs.com)
- Browse [existing issues](https://github.com/raptor-js/kernel/issues)
- Create a
  [new discussion](https://github.com/raptor-js/kernel/issues/new?template=question.yml)
