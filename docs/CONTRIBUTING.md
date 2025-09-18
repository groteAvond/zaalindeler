# Contributing to Hall Seating Management System

Thank you for your interest in contributing to the Hall Seating Management System! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- Node.js 16+ and Yarn package manager
- Git for version control
- A Redis database (local or cloud) for testing
- Basic knowledge of TypeScript, React, and Electron

### Development Setup

1. **Fork and Clone**
   ```bash
   git fork https://github.com/original-repo/hall-seating-management.git
   git clone https://github.com/your-username/hall-seating-management.git
   cd hall-seating-management
   ```

2. **Install Dependencies**
   ```bash
   yarn install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env.local
   # Add your Redis credentials for testing
   ```

4. **Start Development Server**
   ```bash
   yarn dev
   ```

## 🎯 How to Contribute

### Reporting Issues

When reporting bugs or requesting features:

1. **Search Existing Issues**: Check if the issue already exists
2. **Use Issue Templates**: Follow the provided templates
3. **Provide Details**: Include steps to reproduce, expected behavior, and actual behavior
4. **Add Screenshots**: Visual aids help with UI-related issues

### Code Contributions

1. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/bug-description
   ```

2. **Make Your Changes**
   - Follow the coding standards below
   - Test your changes thoroughly
   - Update documentation if needed

3. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "feat: add new seating algorithm optimization"
   # or
   git commit -m "fix: resolve memory leak in guest import"
   ```

4. **Push and Create Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```

## 📝 Coding Standards

### TypeScript Guidelines

- **Type Safety**: Use strict TypeScript settings
- **Interfaces**: Prefer interfaces over types for object shapes
- **Return Types**: Always specify return types for functions
- **Naming**: Use descriptive variable and function names

```typescript
// ✅ Good
interface GuestData {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

async function importGuestsFromFile(filePath: string): Promise<GuestData[]> {
  // Implementation
}

// ❌ Avoid
const data: any = {};
function doStuff(x) { return x; }
```

### React Best Practices

- **Functional Components**: Use hooks instead of class components
- **Props Interface**: Define interfaces for component props
- **State Management**: Use appropriate state management (useState, useReducer)
- **Performance**: Use useCallback and useMemo for optimization

```typescript
// ✅ Good
interface GuestTableProps {
  guests: Guest[];
  onGuestSelect: (guest: Guest) => void;
  loading?: boolean;
}

const GuestTable: React.FC<GuestTableProps> = ({ guests, onGuestSelect, loading = false }) => {
  const handleRowClick = useCallback((guest: Guest) => {
    onGuestSelect(guest);
  }, [onGuestSelect]);

  return (
    // Component implementation
  );
};
```

### Electron Conventions

- **IPC Communication**: Use typed IPC handlers
- **Security**: Never expose Node.js APIs directly to renderer
- **Error Handling**: Implement proper error boundaries
- **Offline Support**: Consider offline functionality

```typescript
// ✅ Good - Main Process
ipcMain.handle('add-guest', async (event, guestData: Guest): Promise<boolean> => {
  try {
    await addGuest(guestData);
    return true;
  } catch (error) {
    console.error('Error adding guest:', error);
    return false;
  }
});

// ✅ Good - Preload Script
contextBridge.exposeInMainWorld('electronAPI', {
  addGuest: (guest: Guest) => ipcRenderer.invoke('add-guest', guest),
});
```

### File Organization

```
├── main/                     # Electron main process
│   ├── background.ts         # Application entry point
│   ├── preload.js           # Context bridge
│   └── helpers/             # Business logic
│       ├── algorithm.ts     # Seating algorithm
│       ├── database.ts      # Data operations
│       └── utils.ts         # Utility functions
├── renderer/                # React application
│   ├── components/          # Reusable components
│   │   ├── ui/             # Base UI components
│   │   └── feature/        # Feature-specific components
│   ├── pages/              # Application pages
│   ├── types/              # TypeScript definitions
│   └── utils/              # Frontend utilities
└── docs/                   # Documentation
```

## 🧪 Testing Guidelines

### Testing Requirements

- Test new features and bug fixes
- Verify both online and offline modes
- Test with sample data (never use real personal data)
- Check performance with large datasets

### Manual Testing Checklist

Before submitting a PR, ensure:

- [ ] Application starts without errors
- [ ] Import functionality works with sample data
- [ ] Seating algorithm completes successfully
- [ ] Settings can be modified and saved
- [ ] Export functionality generates correct files
- [ ] Application handles database connection failures gracefully
- [ ] UI is responsive and accessible
- [ ] No console errors in development tools

### Performance Testing

For large event testing:
- Test with 500+ sample guests
- Monitor memory usage during algorithm execution
- Verify UI remains responsive
- Check database operation performance

## 🔒 Security Guidelines

### Data Privacy

- **No Real Data**: Never commit real personal information
- **Sample Data Only**: Use anonymized test data
- **Environment Variables**: Store sensitive config in `.env.local`
- **Sanitize Inputs**: Validate and sanitize all user inputs

### Code Security

- **Dependency Updates**: Keep dependencies up to date
- **Vulnerability Scanning**: Check for known vulnerabilities
- **Input Validation**: Validate all external inputs
- **Error Handling**: Don't expose sensitive information in errors

## 📚 Documentation

### Code Documentation

- **JSDoc Comments**: Document complex functions
- **README Updates**: Update README for new features
- **API Documentation**: Document new API endpoints
- **Configuration**: Document new settings or environment variables

```typescript
/**
 * Optimizes seating arrangement using preference-based algorithm
 * @param guests - Array of guest objects to be seated
 * @param settings - Algorithm configuration settings
 * @returns Promise resolving to optimized seating layout
 * @throws {Error} When venue capacity is exceeded
 */
async function optimizeSeating(
  guests: Guest[], 
  settings: AlgorithmSettings
): Promise<SeatingLayout> {
  // Implementation
}
```

### User Documentation

- Update user guides for new features
- Add troubleshooting information
- Include screenshots for UI changes
- Maintain FAQ section

## 🎨 UI/UX Guidelines

### Design Principles

- **Accessibility**: Follow WCAG guidelines
- **Consistency**: Use established design patterns
- **Responsiveness**: Support different screen sizes
- **Performance**: Optimize for smooth interactions

### Component Standards

- Use Tailwind CSS for styling
- Follow Radix UI patterns for accessibility
- Implement dark/light theme support
- Ensure keyboard navigation works

## 🔄 Pull Request Process

### Before Submitting

1. **Code Review**: Self-review your changes
2. **Testing**: Run through manual testing checklist
3. **Documentation**: Update relevant documentation
4. **Clean History**: Squash commits if necessary

### PR Description Template

```markdown
## Description
Brief description of changes and motivation.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Manual testing completed
- [ ] Tested with sample data
- [ ] Tested both online and offline modes
- [ ] Performance tested with large datasets

## Screenshots (if applicable)
Add screenshots for UI changes.

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or breaking changes documented)
```

### Review Process

1. **Automated Checks**: Ensure CI passes
2. **Code Review**: Address reviewer feedback
3. **Testing**: Verify functionality works as expected
4. **Documentation**: Confirm docs are updated
5. **Approval**: Wait for maintainer approval

## 🏷️ Commit Message Convention

Use conventional commits for consistency:

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring without functional changes
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

Examples:
```
feat: add support for custom venue layouts
fix: resolve memory leak in guest import process
docs: update installation guide with Redis setup
refactor: optimize seating algorithm performance
```

## 🆘 Getting Help

### Community Support

- **GitHub Issues**: For bugs and feature requests
- **Discussions**: For questions and community support
- **Documentation**: Check existing docs first

### Development Questions

- Review existing code for patterns
- Check TypeScript/React/Electron documentation
- Ask specific questions in GitHub discussions

## 📄 License

By contributing to this project, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to make Hall Seating Management System better for everyone! 🎉
