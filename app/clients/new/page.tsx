import ClientForm from '@/components/ClientForm';
import Link from 'next/link';

export default function NewClientPage() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/clients" className="text-blue-600 hover:underline text-sm">
          &larr; Back to Active Records
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">New Pawn Entry</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <ClientForm />
      </div>
    </div>
  );
}
