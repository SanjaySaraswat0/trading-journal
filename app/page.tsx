import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold mb-4">
        Trading Journal & Analysis
      </h1>

      <p className="text-gray-700 mb-6">
        Log your trades, analyze mistakes, and improve your trading performance.
      </p>

      <button className="px-6 py-2 bg-black text-white rounded">
        Add New Trade
      </button>
    </main>
  );
}

