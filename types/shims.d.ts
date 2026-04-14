declare module '@google/generative-ai';
declare module 'resend';
declare module 'vaul';
declare module 'input-otp';

// Minimal typings so TypeScript doesn't error when these packages are used
declare module 'jspdf' {
	const jsPDF: any;
	export default jsPDF;
}

declare module 'jspdf-autotable' {
	const autoTable: any;
	export default autoTable;
}
