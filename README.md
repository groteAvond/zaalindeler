# Hall Seating Management System

A sophisticated desktop application built with Electron, Next.js, and Redis for optimizing seat assignments for large events and venues. Originally developed for "Grote Avond" events at educational institutions.

## 🎯 Overview

This application automates the complex task of seating arrangement for large events, taking into account guest preferences, VIP status, group assignments, and venue constraints. It features an intelligent algorithm that optimizes seat placement while respecting social connections and accessibility requirements.

## ✨ Key Features

### Smart Seating Algorithm
- **Automatic Optimization**: AI-powered algorithm that assigns seats based on multiple criteria
- **Preference Matching**: Groups guests who want to sit together
- **VIP Management**: Prioritizes special guests with preferred seating areas
- **Balcony Management**: Automatic balcony utilization based on capacity thresholds
- **Conflict Resolution**: Advanced handling of seating conflicts with multiple resolution strategies

### Guest Management
- **Bulk Import**: Excel/CSV import with automatic guest type detection
- **Individual Editing**: Modify guest details with real-time seating updates
- **Search & Filter**: Find guests by name, email, or student ID
- **Export Functionality**: Generate reports and backup data

### Venue Configuration
- **Flexible Layout**: Configurable seating arrangements for different venues
- **Seat Blocking**: Manual seat blocking for equipment or accessibility needs
- **Priority Zones**: Define VIP areas and preferred seating sections
- **Balcony Support**: Multi-level seating with automatic overflow management

### Advanced Features
- **Multi-Day Events**: Support for events spanning multiple days
- **Offline Mode**: Continue working without internet connectivity
- **Algorithm Logging**: Detailed logs of seating assignment decisions
- **Theme Support**: Light and dark mode interface
- **Real-time Updates**: Live seating status and progress tracking

## 🏗️ Architecture

### Technology Stack
- **Frontend**: Next.js with React and TypeScript
- **Backend**: Electron main process
- **Database**: Redis (with offline fallback)
- **Styling**: Tailwind CSS with Radix UI components
- **Build System**: Nextron (Next.js + Electron)

### Project Structure
```
├── main/                    # Electron main process
│   ├── background.ts        # Main application entry
│   ├── preload.js          # Renderer-main bridge
│   └── helpers/            # Core business logic
│       ├── algorithm.ts    # Seating assignment algorithm
│       ├── database.ts     # Database operations
│       └── zaalIndeling.ts # Venue configuration
├── renderer/               # Next.js frontend
│   ├── components/         # Reusable UI components
│   ├── pages/             # Application pages
│   └── types/             # TypeScript definitions
└── resources/             # Static assets and configuration
```

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ 
- Yarn package manager
- Redis database (local or cloud)

### Environment Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hall-seating-management
   ```

2. **Install dependencies**
   ```bash
   yarn install
   ```

3. **Configure environment variables**
   
   Copy the environment template:
   ```bash
   cp .env.example .env.local
   ```
   
   Update `.env.local` with your Redis credentials:
   ```bash
   REDIS_USERNAME=your-redis-username
   REDIS_PASSWORD=your-redis-password
   REDIS_HOST=your-redis-host.com
   REDIS_PORT=6379
   ```

4. **Database Setup**
   
   **Option A: Redis Cloud (Recommended)**
   - Sign up at [Redis Cloud](https://redis.com/cloud/overview/)
   - Create a new database
   - Use the provided credentials in your `.env.local`
   
   **Option B: Local Redis**
   ```bash
   # macOS
   brew install redis
   brew services start redis
   
   # Ubuntu/Debian
   sudo apt install redis-server
   sudo systemctl start redis-server
   
   # Docker
   docker run -d -p 6379:6379 redis:alpine
   ```

### Development

```bash
# Start development server
yarn dev

# Build for production
yarn build

# Package executable
yarn dist
```

## 📋 Usage Guide

### 1. Import Guest Data
- Navigate to the Import page
- Upload Excel/CSV files with guest information
- Review and confirm the imported data
- The system automatically detects guest types (students, teachers, VIPs)

### 2. Configure Settings
- Set VIP seating preferences (ideal rows)
- Configure balcony usage threshold
- Manage special guest lists (VIPs, performers)
- Adjust algorithm parameters

### 3. Generate Seating
- Click "Generate Seating" to run the optimization algorithm
- Monitor progress through the real-time status updates
- Review the generated seating arrangement

### 4. Manual Adjustments
- Edit individual seat assignments as needed
- Block seats for technical equipment
- Move guests to accommodate special requests
- Export final arrangements

### Expected Data Format

**CSV/Excel columns:**
- Email address (required)
- First name / Last name
- Preference day (1st and 2nd choice)
- Seating preferences (people to sit with)
- Special status indicators

## 🔧 Customization

### Venue Configuration
Edit `main/helpers/zaalIndeling.ts` to match your venue:

```typescript
export const zaalIndeling = {
  rijen: {
    1: { maxStoelen: 20, isBalcony: false },
    2: { maxStoelen: 22, isBalcony: false },
    // Add more rows as needed
  }
};
```

### Algorithm Parameters
Adjust seating preferences in the Settings page:
- VIP seating zones
- Balcony usage threshold
- Preference matching weights
- Group seating strategies

## 🔍 Troubleshooting

### Common Issues

**Database Connection Problems**
- Verify Redis credentials and network connectivity
- Check if your IP is whitelisted (Redis Cloud)
- The app automatically switches to offline mode if connection fails

**Import Problems**
- Ensure CSV/Excel format matches expected columns
- Check for special characters that might cause parsing issues
- Verify email format (used for guest type detection)

**Performance Issues**
- Large guest lists (>1000) may cause slowdowns
- Monitor RAM usage and processor load during algorithm execution
- Consider increasing balcony threshold for better performance

**Seating Conflicts**
- Use the manual override features for special cases
- Check algorithm logs for detailed conflict resolution information
- Adjust preference weights if needed

### Getting Help

If you encounter issues:
1. Check the algorithm logs page for detailed error information
2. Verify your environment configuration
3. Try running in offline mode to isolate database issues
4. Check the GitHub issues page for known problems

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Development Setup
- Ensure TypeScript compliance
- Follow the existing code style
- Test both online and offline modes
- Verify seating algorithm changes don't break existing functionality

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🛡️ Privacy & Security

This application:
- Uses environment variables for sensitive configuration
- Includes sample data only (no real personal information)
- Supports offline mode for enhanced privacy
- Follows GDPR compliance best practices

For production use, ensure:
- Secure Redis configuration
- Regular data backups
- Proper access controls
- Compliance with local privacy regulations

## 📞 Support

For technical support and questions:
- Open an issue on GitHub
- Check the documentation in the `docs/` folder
- Review the FAQ section in the application

---

**Note**: This application was originally developed for educational institutions but can be adapted for any large seating event including conferences, theaters, weddings, and corporate events.
