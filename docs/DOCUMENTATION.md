# Hall Seating Management System - Technical Documentation

## Table of Contents
- [System Overview](#system-overview)
- [Installation Guide](#installation-guide)
- [Configuration](#configuration)
- [Features & Functionality](#features--functionality)
- [Algorithm Details](#algorithm-details)
- [Troubleshooting](#troubleshooting)
- [API Reference](#api-reference)
- [Contributing](#contributing)

## System Overview

The Hall Seating Management System is a sophisticated desktop application designed to automate and optimize seating arrangements for large events. Built with modern web technologies, it combines the power of Electron for cross-platform desktop functionality with Next.js for a responsive user interface.

### Key Components

1. **Electron Main Process** (`main/`)
   - Background processing and database management
   - File system operations and exports
   - Inter-process communication with renderer

2. **Next.js Renderer** (`renderer/`)
   - User interface and interactive components
   - Real-time updates and data visualization
   - Form handling and user input validation

3. **Redis Database**
   - Guest data storage
   - Seating configurations
   - Algorithm state and logs

## Installation Guide

### System Requirements
- **Operating System**: Windows 10+, macOS 10.14+, or Linux (Ubuntu 18.04+)
- **Memory**: Minimum 4GB RAM (8GB recommended for large events)
- **Storage**: 500MB free disk space
- **Node.js**: Version 16 or higher
- **Network**: Internet connection for Redis Cloud (optional for local Redis)

### Step-by-Step Installation

1. **Download and Extract**
   ```bash
   git clone https://github.com/your-repo/hall-seating-management.git
   cd hall-seating-management
   ```

2. **Install Dependencies**
   ```bash
   yarn install
   ```
   *Note: If you don't have Yarn installed, use `npm install yarn -g` first*

3. **Environment Configuration**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` with your database credentials:
   ```env
   REDIS_USERNAME=your-username
   REDIS_PASSWORD=your-password
   REDIS_HOST=your-host.com
   REDIS_PORT=6379
   ```

4. **Database Setup**
   
   **Option A: Redis Cloud (Recommended for production)**
   - Create account at [Redis Cloud](https://redis.com/cloud/overview/)
   - Create new database (free tier available)
   - Copy connection details to `.env.local`
   
   **Option B: Local Redis (Development)**
   ```bash
   # Install Redis locally
   brew install redis      # macOS
   apt install redis       # Ubuntu
   
   # Start Redis service
   brew services start redis    # macOS
   systemctl start redis       # Ubuntu
   ```

5. **Build and Run**
   ```bash
   # Development mode
   yarn dev
   
   # Production build
   yarn build
   yarn start
   
   # Create executable
   yarn dist
   ```

## Configuration

### Database Configuration

The system uses Redis for data storage with automatic fallback to offline mode. Configure your database connection in `.env.local`:

```env
# Required for cloud databases
REDIS_USERNAME=your-username
REDIS_PASSWORD=your-password
REDIS_HOST=your-redis-host.com
REDIS_PORT=6379

# Optional settings
NODE_ENV=production
REDIS_TIMEOUT=5000
```

### Venue Configuration

Customize your venue layout by editing `main/helpers/zaalIndeling.ts`:

```typescript
export const zaalIndeling = {
  rijen: {
    1: { maxStoelen: 20, isBalcony: false },      // Ground floor
    2: { maxStoelen: 22, isBalcony: false },
    3: { maxStoelen: 24, isBalcony: false },
    10: { maxStoelen: 15, isBalcony: true },      // Balcony
    11: { maxStoelen: 15, isBalcony: true },
  }
};
```

**Parameters:**
- `maxStoelen`: Maximum seats per row
- `isBalcony`: Whether the row is on the balcony level

### Algorithm Settings

Configure seating algorithm behavior through the Settings page:

- **VIP Rows**: Preferred seating area for special guests (rows 3-6 by default)
- **Balcony Threshold**: Guest count that triggers balcony usage (70 by default)
- **Preference Weight**: How strongly to prioritize seating preferences
- **Group Handling**: Strategy for keeping related guests together

## Features & Functionality

### Guest Management

**Import Process:**
1. Prepare Excel/CSV file with required columns:
   - Email address (primary identifier)
   - First name, Last name
   - Seating day preferences
   - Special status indicators

2. Upload file through Import page
3. Review automatic guest type detection
4. Confirm import and proceed to seating

**Supported File Formats:**
- Excel (.xlsx)
- CSV (comma-separated values)
- UTF-8 encoding recommended

**Guest Types:**
- **Students**: Detected by student email patterns
- **Teachers**: Identified by institutional email formats
- **VIPs**: Manually designated in special lists
- **Performers**: Special category for event participants

### Seating Algorithm

The intelligent seating algorithm considers multiple factors:

1. **Guest Preferences**: Who wants to sit together
2. **VIP Status**: Priority seating for special guests
3. **Event Day**: Multi-day event support
4. **Venue Constraints**: Row capacity and balcony usage
5. **Social Groups**: Keeping related people together

**Algorithm Phases:**
1. **Initialization**: Load guests and venue configuration
2. **Primary Assignment**: Place VIPs and special guests
3. **Preference Matching**: Group guests with seating preferences
4. **Optimization**: Fill remaining seats efficiently
5. **Conflict Resolution**: Handle edge cases and overlaps

### Manual Overrides

**Seat Blocking:**
- Block seats for technical equipment
- Reserve areas for accessibility needs
- Temporary blocks for maintenance

**Guest Adjustments:**
- Move individual guests between seats
- Swap guest positions
- Override algorithm assignments

**Bulk Operations:**
- Move entire groups
- Clear sections
- Reset specific days

### Export and Reporting

**Available Exports:**
- Complete seating chart (Excel)
- Guest lists by day
- Special guest reports
- Algorithm execution logs

**Export Options:**
- File format: Excel (.xlsx) or JSON
- Date range selection
- Filtered by guest type or status
- Including or excluding empty seats

## Algorithm Details

### Core Logic

The seating algorithm uses a multi-phase approach to optimize seat assignments:

```typescript
// Simplified algorithm flow
async function assignSeating(guests: Guest[]) {
  // Phase 1: VIP placement
  await placeVIPs(guests.filter(g => g.isVIP));
  
  // Phase 2: Group assignments
  await handleGroups(guests.filter(g => g.hasPreferences));
  
  // Phase 3: Fill remaining seats
  await fillRemaining(guests.filter(g => !g.assigned));
  
  // Phase 4: Optimization
  await optimizeLayout();
}
```

### Conflict Resolution

When seating conflicts occur, the system:

1. **Identifies Conflicts**: Overlapping preferences or capacity issues
2. **Generates Solutions**: Multiple resolution strategies
3. **User Choice**: Presents options with explanations
4. **Implements Solution**: Applies chosen resolution

**Common Conflicts:**
- Preference cycles (A wants to sit with B, B with C, C with A)
- Capacity overflow in preferred sections
- VIP seating unavailable
- Group size exceeds row capacity

### Performance Optimization

**For Large Events (1000+ guests):**
- Batch processing for database operations
- Incremental algorithm updates
- Memory-efficient data structures
- Progress tracking and cancellation

**Balcony Management:**
- Automatic threshold detection
- Preference-based balcony assignment
- VIP balcony priority
- Accessibility considerations

## Troubleshooting

### Common Issues

**1. Database Connection Failed**
```
Error: Redis connection timeout
```
**Solutions:**
- Check internet connectivity
- Verify Redis credentials in `.env.local`
- Ensure Redis server is running (local installations)
- Check firewall/proxy settings
- The app will automatically switch to offline mode

**2. Import File Errors**
```
Error: Unable to parse file format
```
**Solutions:**
- Ensure file is valid Excel (.xlsx) or CSV
- Check for required columns (email, names)
- Remove special characters from file name
- Try saving Excel file as CSV first

**3. Algorithm Takes Too Long**
```
Warning: Seating algorithm running for 5+ minutes
```
**Solutions:**
- Reduce guest count for testing
- Increase balcony threshold
- Simplify venue layout
- Check for preference cycles

**4. Memory Issues**
```
Error: JavaScript heap out of memory
```
**Solutions:**
- Close other applications
- Restart the application
- Consider batch processing for very large events
- Increase system RAM if possible

### Debug Tools

**Algorithm Logs:**
- Access through "Algorithm Logs" page
- Shows step-by-step assignment process
- Identifies bottlenecks and conflicts
- Export logs for analysis

**Developer Console:**
- Press F12 to open DevTools
- Check console for JavaScript errors
- Network tab for database connection issues
- Performance tab for optimization

**Offline Mode:**
- Automatically activated when database unavailable
- Limited functionality (no persistent storage)
- Use for testing and demonstration
- Export data before closing application

### Performance Tips

**For Better Performance:**
1. **Regular Maintenance:**
   - Clear old algorithm logs periodically
   - Export and remove old event data
   - Update to latest version

2. **Optimization Settings:**
   - Increase balcony threshold for large events
   - Reduce preference matching complexity
   - Use simplified venue layouts for testing

3. **System Configuration:**
   - Ensure adequate RAM (8GB+ recommended)
   - Use SSD for better file I/O
   - Close unnecessary applications

## API Reference

### Main Process APIs

**Guest Management:**
```typescript
// Add single guest
electronAPI.addGuest(guestData: Guest): Promise<boolean>

// Bulk import
electronAPI.addGuestsBulk(guests: Guest[]): Promise<void>

// Delete guest
electronAPI.deleteGuest(guestId: number): Promise<void>

// Get all guests
electronAPI.getGuests(): Promise<Guest[]>
```

**Seating Operations:**
```typescript
// Generate seating
electronAPI.sortUsers(): Promise<SeatingLayout>

// Get seating for specific day
electronAPI.getSeatsForDay(day: string): Promise<DaySeating>

// Reset all seating
electronAPI.resetSeating(): Promise<void>

// Block/unblock seats
electronAPI.blockSeat(seat: BlockedSeat): Promise<void>
electronAPI.unblockSeat(day: string, row: number, seat: number): Promise<void>
```

**Settings Management:**
```typescript
// Get current settings
electronAPI.getSettings(): Promise<Settings>

// Update settings
electronAPI.updateSettings(settings: Settings): Promise<boolean>

// Export data
electronAPI.exportUsers(): Promise<{success: boolean, path: string}>
```

### Renderer APIs

**React Components:**
```typescript
// Data table for guest management
<DataTable data={guests} columns={columns} />

// Seating preview
<SeatingPreview day="woensdag" seating={seatingData} />

// Settings form
<SettingsForm onSave={handleSave} />
```

### Data Types

```typescript
interface Guest {
  id: number;
  voornaam: string;
  achternaam: string;
  email: string;
  isErelid: boolean;
  speeltMee: boolean;
  isDocent: boolean;
  voorkeurDag1: string;
  voorkeurDag2: string;
  voorkeurPersoonen: string;
  // ... additional fields
}

interface Settings {
  idealRowStart: number;
  idealRowEnd: number;
  useBalconyThreshold: number;
  maxVIPRowDeviation: number;
  preferCenterSeats: boolean;
  prioritizePreferences: boolean;
  // ... additional settings
}
```

## Contributing

### Development Setup

1. **Fork the Repository**
   ```bash
   git fork https://github.com/original-repo/hall-seating-management.git
   git clone https://github.com/your-username/hall-seating-management.git
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Development Environment**
   ```bash
   yarn install
   yarn dev  # Starts development server
   ```

### Code Style

**TypeScript Guidelines:**
- Use strict type checking
- Prefer interfaces over types for object shapes
- Include return types for functions
- Use meaningful variable names

**React Best Practices:**
- Use functional components with hooks
- Implement proper error boundaries
- Follow React naming conventions
- Optimize re-renders with useCallback/useMemo

**Electron Conventions:**
- Keep main process logic minimal
- Use IPC for communication
- Handle both online and offline modes
- Implement proper error handling

### Testing

**Before Submitting:**
1. Test with sample data
2. Verify both online and offline modes
3. Check algorithm performance with large datasets
4. Ensure TypeScript compilation
5. Test on multiple operating systems if possible

### Pull Request Process

1. **Code Review Checklist:**
   - [ ] Code follows style guidelines
   - [ ] Tests pass (if applicable)
   - [ ] Documentation updated
   - [ ] No sensitive data included
   - [ ] Backwards compatibility maintained

2. **Submission:**
   ```bash
   git add .
   git commit -m "feat: descriptive commit message"
   git push origin feature/your-feature-name
   ```
   
3. **Create Pull Request:**
   - Clear description of changes
   - Reference related issues
   - Include screenshots if UI changes
   - Request appropriate reviewers

---

For additional support, please open an issue on GitHub or check the FAQ section in the application.
