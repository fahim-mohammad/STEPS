# STEPS System

Full-stack fund management system with:
- Contributions
- Profit distribution (Halal/Haram separation)
- Expense tracking
- BKash fee handling
- Admin dashboard
- AI backend support

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
