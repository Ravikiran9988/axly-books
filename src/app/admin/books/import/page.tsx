import PdfBookImporter from './PdfBookImporter';

export const metadata = {
  title: 'Import Book from PDF — AXLY Admin',
  description: 'Upload a PDF, extract chapters, review the result, and import it into AXLY Books.',
};

export default function ImportBookPage() {
  return <PdfBookImporter />;
}
