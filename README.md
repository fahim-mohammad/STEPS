# STEPS - Student Fund Management System

A professional student fund management web application built with Next.js, featuring role-based access, member management, contribution tracking, and fund analysis.

## Features

### Core Features
- **Authentication**: Secure signup and login system
- **Role-Based Access**: Member, Chairman, and Accountant roles with full role switching
- **Bilingual UI**: Complete English and Bangla language support
- **Member Management**: Approve/reject member applications, view member information
- **Contribution Tracking**: Record member contributions with multiple payment methods (Cash, Bank, bKash, Nagad, Rocket)
- **Fund Dashboard**: Real-time fund balance, member statistics, and financial health indicators
- **Bank Investments**: Track DPS (monthly savings) and FDR (fixed deposits)
- **Charity Tracking**: Record and monitor charitable activities
- **Community**: WhatsApp community access for approved members only
- **Theme Support**: Light and dark mode support

### Admin Features
- Manage member approvals
- Set contribution amounts for specific years
- View and manage fund investments
- Track financial records
- Role administration

### Security
- Row-level access control based on user roles
- Loan data privacy (only borrower, chairman, and accountant can view)
- Password-protected authentication
- Session management

## Getting Started

### Installation

1. Clone the repository or download the code
2. Use the shadcn CLI to set up the project:
   ```bash
   npx shadcn-cli@latest init
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

### Running the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### First Time Setup

1. **Create a test account**:
   - Visit the homepage and click "Join Fund"
   - Fill in your details (Name, Phone, Email, Password)
   - You will be automatically logged in

2. **For testing admin features**:
   - Create a second account for admin testing
   - Update the user role in browser DevTools localStorage if needed
   - Reload the page to see admin features

### Demo Credentials

For development/testing, you can:
1. Create multiple accounts to test member and admin flows
2. Use the Admin Dashboard to approve members
3. Set contribution amounts for different years
4. Switch between roles using the role switch feature in the 3-dot menu

## Application Structure

### Key Pages
- `/` - Homepage (shows "Join Fund" and "Sign In" for guests, redirects to dashboard for logged-in users)
- `/signin` - Login page
- `/signup` - Registration page
- `/dashboard` - Main dashboard showing fund statistics
- `/members` - Members list (view-only for regular members, full management for admins)
- `/profile` - User profile information
- `/settings` - User preferences (theme, language, notifications)
- `/community` - WhatsApp community access (approved members only)

### Admin Pages
- `/admin` - Admin dashboard with quick stats
- `/admin/members` - Member approval and management
- `/admin/contributions` - Set contribution amounts
- `/admin/investments` - Manage DPS/FDR investments
- `/admin/charity` - Charity tracking
- `/admin/loans` - Manage private loans
- `/admin/settings` - Admin settings
- `/admin/reports` - Financial reports

## Data Storage

The application uses browser localStorage for data persistence. All user data, member information, contributions, and fund records are stored locally.

### Data Structure

#### Users
- Email, password, name, phone
- Role (member, chairman, accountant)
- Approval status

#### Members
- Linked to user account
- Approval status (pending, approved)
- Contact information

#### Contributions
- Amount, date, payment method
- Invoice number (auto-incrementing)
- Bank/bKash details

#### Investments
- DPS and FDR tracking
- Bank details, amounts, maturity dates
- Status tracking

#### Loans
- Borrower information
- Amount, date, status
- Privacy-restricted (only borrower, chairman, accountant can view)

## Features by Role

### Member
- View dashboard with fund statistics
- View approved members list
- View profile information
- Update preferences (theme, language)
- See pending membership status

### Chairman/Accountant
- All member features
- Approve/reject member applications
- Set contribution amounts
- View all member details
- Access admin dashboard
- Switch between member and admin roles

## Language Support

The application supports:
- **English** 🇬🇧
- **Bangla** 🇧🇩

Language can be changed from the settings menu or 3-dot navigation menu. The entire UI switches to the selected language.

## Theme Support

- **Light Mode**: Default professional white background
- **Dark Mode**: Easy on the eyes dark theme

Toggle in the settings menu or 3-dot navigation menu.

## Community

- **WhatsApp Community**: Approved members can join an exclusive WhatsApp community for announcements and support
- **Approval-Only Access**: Non-approved members see a message that community access will be available after approval
- **Security**: Members are advised not to share sensitive personal information in the community

## Notifications (Ready for Integration)

The application supports notification preferences for:
- Email notifications (with receipt generation)
- WhatsApp notifications (with community access)

These are currently ready for backend integration with email and WhatsApp APIs.

## Technical Stack

- **Frontend**: Next.js, React, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **State Management**: React Context for authentication
- **Storage**: Browser localStorage
- **Charts**: Recharts for data visualization
- **Icons**: Lucide React

## Browser Support

The application works on all modern browsers:
- Chrome/Edge
- Firefox
- Safari

## Development Notes

### Adding New Pages
1. Create the page file in `/app/[page-name]/page.tsx`
2. Import and use the Navbar component
3. Use the useAuth hook for authentication
4. Use useTranslations for multilingual support

### Modifying Translations
Edit `/lib/translations.ts` to add or modify translations for both English and Bangla.

### Data Management
Use functions from `/lib/data-store.ts` for all data operations. They abstract localStorage complexity.

## Future Enhancements

- PDF receipt generation
- WhatsApp integration
- Email notifications
- Advanced financial analytics
- Loan management interface
- Automated reminders
- AI-powered insights

## Support

For issues or questions, refer to the specification document or open an issue in the repository.

---

Built with ❤️ by STEPS Team for student fund management
