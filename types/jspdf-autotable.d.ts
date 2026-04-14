declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => any;
  }
}

declare module 'jspdf-autotable' {
  const autoTable: (doc: any, options?: any) => void;
  export = autoTable;
}
